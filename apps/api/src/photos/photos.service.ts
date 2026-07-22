import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import { PrismaService } from "../prisma/prisma.service";
import { PHOTOS_UPLOAD_DIR } from "./photo-upload.config";

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
  constructor(private readonly prisma: PrismaService) {}

  private readonly adminPhotoLabel = "RMB Event Team";

  async create(attendeeId: string, files: Express.Multer.File[], caption?: string): Promise<FeedPhotoData> {
    const urls = files.map((file) => `/uploads/photos/${file.filename}`);
    const url = urls[0];
    const photo = await this.prisma.photo.create({
      data: { attendeeId, url, urls, caption },
      include: { attendee: { select: { name: true, businessName: true } } },
    });

    return {
      id: photo.id,
      url: photo.url,
      urls: photo.urls.length ? photo.urls : [photo.url],
      caption: photo.caption,
      createdAt: photo.createdAt,
      attendeeId,
      attendeeName: photo.attendee?.name ?? this.adminPhotoLabel,
      attendeeBusinessName: photo.attendee?.businessName ?? null,
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
      comments: [],
    };
  }

  async adminCreate(files: Express.Multer.File[], caption?: string): Promise<FeedPhotoData[]> {
    const photos = await this.prisma.$transaction(
      files.map((file) => {
        const url = `/uploads/photos/${file.filename}`;
        return this.prisma.photo.create({
          data: {
            url,
            urls: [url],
            caption,
            uploadedByAdmin: true,
            adminLabel: this.adminPhotoLabel,
          },
        });
      }),
    );

    return photos.map((photo) => ({
      id: photo.id,
      url: photo.url,
      urls: photo.urls.length ? photo.urls : [photo.url],
      caption: photo.caption,
      createdAt: photo.createdAt,
      attendeeId: null,
      attendeeName: photo.adminLabel ?? this.adminPhotoLabel,
      attendeeBusinessName: null,
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
      comments: [],
    }));
  }

  async listFeed(currentAttendeeId: string, cursor?: string, limit = 20): Promise<FeedPageData> {
    let rows;
    try {
      rows = await this.prisma.photo.findMany({
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { createdAt: "desc" },
        include: {
          attendee: { select: { name: true, businessName: true } },
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

    const photos: FeedPhotoData[] = page.map((photo) => ({
      id: photo.id,
      url: photo.url,
      urls: photo.urls.length ? photo.urls : [photo.url],
      caption: photo.caption,
      createdAt: photo.createdAt,
      attendeeId: photo.attendeeId,
      attendeeName: photo.attendee?.name ?? photo.adminLabel ?? this.adminPhotoLabel,
      attendeeBusinessName: photo.attendee?.businessName ?? null,
      likeCount: photo._count.likes,
      commentCount: photo._count.comments,
      likedByMe: photo.likes.length > 0,
      comments: photo.comments.map((comment) => ({
        id: comment.id,
        name: comment.attendee.name,
        message: comment.message,
        createdAt: comment.createdAt,
      })),
    }));

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
    await Promise.all((photo.urls.length ? photo.urls : [photo.url]).map((url) => this.unlinkPhotoFile(url)));
  }

  async adminListAll(): Promise<AdminPhotoData[]> {
    const photos = await this.prisma.photo.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        attendee: { select: { name: true } },
        _count: { select: { likes: true } },
      },
    });

    return photos.map((photo) => ({
      id: photo.id,
      url: photo.url,
      caption: photo.caption,
      createdAt: photo.createdAt,
      uploadedByAdmin: photo.uploadedByAdmin,
      attendeeName: photo.attendee?.name ?? photo.adminLabel ?? this.adminPhotoLabel,
      likeCount: photo._count.likes,
    }));
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

    await Promise.all((photo.urls.length ? photo.urls : [photo.url]).map((url) => this.unlinkPhotoFile(url)));
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

  private async unlinkPhotoFile(url: string): Promise<void> {
    const filename = path.basename(url);
    try {
      await fs.unlink(path.join(PHOTOS_UPLOAD_DIR, filename));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}
