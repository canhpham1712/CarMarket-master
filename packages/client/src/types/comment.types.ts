export interface User {
  id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  createdAt: Date;
}

export interface CommentReaction {
  id: string;
  userId: string;
  reactionType: 'like' | 'helpful' | 'dislike';
  user: User;
  createdAt: Date;
}

export interface Comment {
  id: string;
  listingId: string;
  userId: string;
  user: User;
  parentCommentId?: string;
  content: string;
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  isPinned: boolean;
  isReported: boolean;
  reportCount: number;
  reactionCount: number;
  replyCount: number;
  reactions: CommentReaction[];
  replies?: Comment[];
  userReaction?: string; // Current user's reaction type
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentReport {
  id: string;
  commentId: string;
  reportedBy: string;
  reason: 'spam' | 'offensive' | 'inappropriate' | 'harassment' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
}

export interface CreateCommentRequest {
  listingId: string;
  content: string;
  parentCommentId?: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface AddReactionRequest {
  reactionType: 'like' | 'helpful' | 'dislike';
}

export interface ReportCommentRequest {
  reason: 'spam' | 'offensive' | 'inappropriate' | 'harassment' | 'other';
  description?: string;
}

export interface CommentQueryParams {
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'oldest' | 'popular';
  parentCommentId?: string;
}

export interface CommentsResponse {
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReportedCommentsQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  reason?: string;
}

export interface ReportedCommentsResponse {
  reports: CommentReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReviewReportRequest {
  decision: 'resolved' | 'dismissed';
  notes?: string;
}

// WebSocket event types
export interface CommentCreatedEvent {
  comment: Comment;
  listingId: string;
}

export interface CommentUpdatedEvent {
  comment: Comment;
  listingId: string;
}

export interface CommentDeletedEvent {
  commentId: string;
  listingId: string;
}

export interface CommentReactionEvent {
  commentId: string;
  reaction: CommentReaction;
  listingId: string;
}

export interface CommentPinnedEvent {
  commentId: string;
  isPinned: boolean;
  listingId: string;
}

export interface CommentReportedEvent {
  commentId: string;
  listingId: string;
}
