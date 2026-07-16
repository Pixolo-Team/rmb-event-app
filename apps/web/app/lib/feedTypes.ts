export type FeedAttendee = { id: string; name: string; businessName: string | null };
export type FeedCommentData = { id: string; name: string; message: string; createdAt: string };
export type FeedPhotoData = { id: string; url: string | null; caption: string | null; createdAt: string; attendeeId: string; attendeeName: string; attendeeBusinessName: string | null; likeCount: number; commentCount: number; likedByMe: boolean; comments: FeedCommentData[] };
