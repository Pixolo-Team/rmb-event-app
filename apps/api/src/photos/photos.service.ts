import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UploadsService, ADMIN_UPLOAD_OWNER } from "../uploads/uploads.service";
import { UploadCategories } from "../uploads/upload.types";

export type FeedCommentData = {
  id: string;
  name: string;
  message: string;
  createdAt: Date;
};

export type FeedPhotoData = {
  id: string;
  url: string;
  urls: string[];
  caption: string | null;
  createdAt: Date;
  attendeeId: string | null;
  attendeeName: string;
  attendeeBusinessName: string | null;
  attendeePhotoUrl: string | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  comments: FeedCommentData[];
};

export type FeedPageData = {
  photos: FeedPhotoData[];
  nextCursor: string | null;
};

export type AdminPhotoData = {
  id: string;
  url: string;
  caption: string | null;
  createdAt: Date;
  uploadedByAdmin: boolean;
  attendeeName: string;
  likeCount: number;
};

export type DeletedPhotoLogData = {
  id: string;
  photoId: string;
  attendeeName: string;
  caption: string | null;
  photoUrl: string;
  postedAt: Date;
  deletedAt: Date;
  deletedBy: string;
};

@Injectable()
export class PhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  private readonly adminPhotoLabel = "RMB Event Team";

  /**
   * Persists a feed post from object paths already uploaded to GCS via the
   * /uploads/upload-urls flow, after verifying each one server-side.
   */
  async create(attendeeId: string, objectPaths: string[], caption?: string): Promise<FeedPhotoData> {
    await this.uploads.completeUploadsService(attendeeId, {
      category: UploadCategories.Feed,
      files: objectPaths.map((objectPath) => ({ objectPath })),
    });

    const url = objectPaths[0];
    const photo = await this.prisma.photo.create({
      data: { attendeeId, url, urls: objectPaths, caption },
      include: { attendee: { select: { name: true, businessName: true, photoUrl: true } } },
    });

    const allPaths = (photo.urls && photo.urls.length > 0) ? photo.urls : [photo.url];
    const resolvedUrls = await this.resolveFeedUrls(allPaths);

    return {
      id: photo.id,
      url: resolvedUrls[0],
      urls: resolvedUrls,
      caption: photo.caption,
      createdAt: photo.createdAt,
      attendeeId,
      attendeeName: photo.attendee?.name ?? this.adminPhotoLabel,
      attendeeBusinessName: photo.attendee?.businessName ?? null,
      attendeePhotoUrl: photo.attendee?.photoUrl ?? null,
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
      comments: [],
    };
  }

  async adminCreate(objectPaths: string[], caption?: string): Promise<FeedPhotoData[]> {
    await this.uploads.completeUploadsService(ADMIN_UPLOAD_OWNER, {
      category: UploadCategories.Feed,
      files: objectPaths.map((objectPath) => ({ objectPath })),
    });

    const photos = await this.prisma.$transaction(
      objectPaths.map((objectPath) =>
        this.prisma.photo.create({
          data: {
            url: objectPath,
            urls: [objectPath],
            caption,
            uploadedByAdmin: true,
            adminLabel: this.adminPhotoLabel,
          },
        }),
      ),
    );

    return Promise.all(
      photos.map(async (photo) => {
        const resolvedUrls = await this.resolveFeedUrls(photo.urls.length ? photo.urls : [photo.url]);
        return {
          id: photo.id,
          url: resolvedUrls[0],
          urls: resolvedUrls,
          caption: photo.caption,
          createdAt: photo.createdAt,
          attendeeId: null,
          attendeeName: photo.adminLabel ?? this.adminPhotoLabel,
          attendeeBusinessName: null,
          attendeePhotoUrl: null,
          likeCount: 0,
          commentCount: 0,
          likedByMe: false,
          comments: [],
        };
      }),
    );
  }

  async listFeed(currentAttendeeId: string, cursor?: string, limit = 20): Promise<FeedPageData> {
    let rows;
    try {
      rows = await this.prisma.photo.findMany({
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { createdAt: "desc" },
        include: {
          attendee: { select: { name: true, businessName: true, photoUrl: true } },
          _count: { select: { likes: true, comments: true } },
          comments: {
            orderBy: { createdAt: "asc" },
            include: { attendee: { select: { name: true } } },
          },
          likes: { where: { attendeeId: currentAttendeeId }, select: { attendeeId: true } },
        },
      });
    } catch (error) {
      // The cursor photo was deleted between page loads — nothing reliable left to page from.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return { photos: [], nextCursor: null };
      }
      throw error;
    }

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const photos: FeedPhotoData[] = await Promise.all(
      page.map(async (photo) => {
        const allPaths = (photo.urls && photo.urls.length > 0) ? photo.urls : [photo.url];
        const resolvedUrls = await this.resolveFeedUrls(allPaths);
        return {
          id: photo.id,
          url: resolvedUrls[0],
          urls: resolvedUrls,
          caption: photo.caption,
          createdAt: photo.createdAt,
          attendeeId: photo.attendeeId,
          attendeeName: photo.attendee?.name ?? photo.adminLabel ?? this.adminPhotoLabel,
          attendeeBusinessName: photo.attendee?.businessName ?? null,
          attendeePhotoUrl: photo.attendee?.photoUrl ?? null,
          likeCount: photo._count.likes,
          commentCount: photo._count.comments,
          likedByMe: photo.likes.length > 0,
          comments: photo.comments.map((comment) => ({
            id: comment.id,
            name: comment.attendee.name,
            message: comment.message,
            createdAt: comment.createdAt,
          })),
        };
      }),
    );

    return {
      photos,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  async toggleLike(photoId: string, attendeeId: string): Promise<{ liked: boolean; likeCount: number }> {
    const photo = await this.prisma.photo.findUnique({ where: { id: photoId }, select: { id: true } });
    if (!photo) throw new NotFoundException("Photo not found");

    const existing = await this.prisma.like.findUnique({
      where: { photoId_attendeeId: { photoId, attendeeId } },
    });

    if (existing) {
      await this.prisma.like.delete({ where: { photoId_attendeeId: { photoId, attendeeId } } });
    } else {
      await this.prisma.like.create({ data: { photoId, attendeeId } });
    }

    const likeCount = await this.prisma.like.count({ where: { photoId } });
    return { liked: !existing, likeCount };
  }

  async addComment(photoId: string, attendeeId: string, message: string): Promise<FeedCommentData> {
    const photo = await this.prisma.photo.findUnique({ where: { id: photoId }, select: { id: true } });
    if (!photo) throw new NotFoundException("Photo not found");

    const comment = await this.prisma.comment.create({
      data: { photoId, attendeeId, message },
      include: { attendee: { select: { name: true } } },
    });

    return {
      id: comment.id,
      name: comment.attendee.name,
      message: comment.message,
      createdAt: comment.createdAt,
    };
  }

  async selfDelete(photoId: string, attendeeId: string): Promise<void> {
    const photo = await this.prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) throw new NotFoundException("Photo not found");
    if (photo.attendeeId !== attendeeId) {
      throw new ForbiddenException("You can only delete your own photos");
    }

    await this.prisma.photo.delete({ where: { id: photoId } });
    await this.deleteFeedObjects(attendeeId, photo.urls.length ? photo.urls : [photo.url]);
  }

  async adminListAll(): Promise<AdminPhotoData[]> {
    const photos = await this.prisma.photo.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        attendee: { select: { name: true } },
        _count: { select: { likes: true } },
      },
    });

    return Promise.all(
      photos.map(async (photo) => ({
        id: photo.id,
        url: (await this.uploads.resolveFeedPhotoUrl(photo.url)) ?? photo.url,
        caption: photo.caption,
        createdAt: photo.createdAt,
        uploadedByAdmin: photo.uploadedByAdmin,
        attendeeName: photo.attendee?.name ?? photo.adminLabel ?? this.adminPhotoLabel,
        likeCount: photo._count.likes,
      })),
    );
  }

  async adminDelete(photoId: string): Promise<void> {
    const photo = await this.prisma.photo.findUnique({
      where: { id: photoId },
      include: { attendee: { select: { name: true } } },
    });
    if (!photo) throw new NotFoundException("Photo not found");

    await this.prisma.$transaction([
      this.prisma.deletedPhotoLog.create({
        data: {
          photoId: photo.id,
          attendeeId: photo.attendeeId ?? "admin",
          attendeeName: photo.attendee?.name ?? photo.adminLabel ?? this.adminPhotoLabel,
          caption: photo.caption,
          photoUrl: photo.url,
          postedAt: photo.createdAt,
        },
      }),
      this.prisma.photo.delete({ where: { id: photoId } }),
    ]);

    await this.deleteFeedObjects(
      photo.attendeeId ?? ADMIN_UPLOAD_OWNER,
      photo.urls.length ? photo.urls : [photo.url],
    );
  }

  async adminListDeletedHistory(): Promise<DeletedPhotoLogData[]> {
    const logs = await this.prisma.deletedPhotoLog.findMany({ orderBy: { deletedAt: "desc" } });
    return logs.map((log) => ({
      id: log.id,
      photoId: log.photoId,
      attendeeName: log.attendeeName,
      caption: log.caption,
      photoUrl: log.photoUrl,
      postedAt: log.postedAt,
      deletedAt: log.deletedAt,
      deletedBy: log.deletedBy,
    }));
  }

  /**
   * Resolves stored feed object paths to fresh signed read URLs. Falls back
   * to the raw stored value for legacy local-disk paths so old posts don't
   * render as broken images.
   */
  private async resolveFeedUrls(objectPaths: string[]): Promise<string[]> {
    return Promise.all(
      objectPaths.map(async (objectPath) => (await this.uploads.resolveFeedPhotoUrl(objectPath)) ?? objectPath),
    );
  }

  private async deleteFeedObjects(owner: string, objectPaths: string[]): Promise<void> {
    await Promise.all(
      objectPaths.map((objectPath) => this.uploads.deleteUploadService(owner, objectPath).catch(() => undefined)),
    );
  }
}
