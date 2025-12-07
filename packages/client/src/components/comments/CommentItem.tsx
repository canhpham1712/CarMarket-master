import { useState, useEffect, useRef } from 'react';
import type { Comment } from '../../types/comment.types';
import { CommentForm } from './CommentForm';
import { CommentReactions } from './CommentReactions';
import { ReportCommentDialog } from './ReportCommentDialog';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Pin, 
  PinOff, 
  Flag, 
  Reply,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatRelativeTime } from '../../lib/utils';
import toast from 'react-hot-toast';

// Thêm dòng này để lấy URL server từ biến môi trường
const SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

interface CommentItemProps {
  comment: Comment;
  onUpdateComment: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onReaction: (commentId: string, reactionType: 'like' | 'helpful' | 'dislike') => void;
  onPinComment: (commentId: string, isPinned: boolean) => void;
  onCreateReply: (content: string, parentCommentId: string) => void;
  onLoadReplies?: (commentId: string) => Promise<void>; // Callback to load replies for a comment
  currentUserId?: string;
  isAuthenticated: boolean;
  nestingLevel?: number; // 0 = root, 1 = first reply, 2 = second reply
  isSeller?: boolean; // Whether current user is the listing seller
  isNewlyCreated?: boolean; // Whether this comment was just created (should scroll to it)
  newlyCreatedCommentIds?: Set<string>; // IDs of comments that were just created
}

export function CommentItem({
  comment,
  onUpdateComment,
  onDeleteComment,
  onReaction,
  onPinComment,
  onCreateReply,
  onLoadReplies,
  currentUserId,
  isAuthenticated,
  nestingLevel = 0,
  isSeller = false,
  isNewlyCreated = false,
  newlyCreatedCommentIds = new Set(),
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(false); // Collapse all replies by default (Level 1 and Level 2)
  const [isNewComment, setIsNewComment] = useState(false);
  const commentRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const isOwner = comment.userId === currentUserId;
  const canEdit = isOwner && !comment.isDeleted;
  const canDelete = isOwner && !comment.isDeleted;
  const canReply = !comment.isDeleted && nestingLevel < 2; // Max 3 levels (0, 1, 2)
  const hasReplies = comment.replies && comment.replies.length > 0;
  const hasReplyCount = comment.replyCount > 0; // Check replyCount for nested comments that may not have replies loaded yet

  // Determine if this is level 2 (should be collapsible)
  const isLevel1 = nestingLevel === 0;
  const isLevel2 = nestingLevel === 1;
  const isLevel3 = nestingLevel === 2;

  // Show expand/collapse button for Level 1, Level 2, and Level 3 comments that have replies
  // Check both hasReplies (for loaded replies) and hasReplyCount (for unloaded replies)
  const shouldShowExpandButton = (isLevel1 || isLevel2 || isLevel3) && (hasReplies || hasReplyCount);

  // Calculate avatar size based on nesting level
  const getAvatarSize = (): 'sm' | 'md' => {
    if (isLevel1) return 'md'; // 48px
    return 'sm'; // 32px for level 2 and 3
  };

  // Mark comment as new only if it was just created (not on initial page load)
  useEffect(() => {
    if (isNewlyCreated) {
      setIsNewComment(true);
      const timer = setTimeout(() => setIsNewComment(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isNewlyCreated]);

  // Scroll into view only if it's a genuinely new comment
  useEffect(() => {
    if (isNewComment && isNewlyCreated && commentRef.current) {
      commentRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isNewComment, isNewlyCreated]);

  const handleUpdateComment = async (content: string) => {
    await onUpdateComment(comment.id, content);
    setIsEditing(false);
  };

  const handleDeleteComment = () => {
    onDeleteComment(comment.id);
    setShowMenu(false);
  };

  const handleReaction = (commentId: string, reactionType: 'like' | 'helpful' | 'dislike') => {
    onReaction(commentId, reactionType);
  };

  const handlePinComment = () => {
    onPinComment(comment.id, comment.isPinned);
    setShowMenu(false);
  };

  const handleCreateReply = async (content: string) => {
    await onCreateReply(content, comment.id);
    setIsReplying(false);
    // Auto-expand replies if collapsed
    if (!repliesExpanded) {
      setRepliesExpanded(true);
    }
  };

  const handleReportComment = () => {
    setShowReportDialog(true);
    setShowMenu(false);
  };

  // Determine indentation and styling based on nesting level
  const getIndentationClasses = () => {
    if (isLevel1) return ''; // No indentation for root comments
    if (isLevel2) return 'ml-6 border-l-2 border-gray-300 pl-4'; // 24px indent + border
    if (isLevel3) return 'ml-12 border-l border-gray-200 pl-4'; // 48px indent + thinner border
    return '';
  };

  const getBackgroundClasses = () => {
    if (isLevel1) return comment.isPinned ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200';
    if (isLevel2) return 'bg-gray-50 border-gray-200';
    return 'bg-gray-50 border-gray-100';
  };

  const getPaddingClasses = () => {
    if (isLevel1) return 'p-4';
    if (isLevel2) return 'p-3';
    return 'p-2';
  };

  const getTextSizeClasses = () => {
    if (isLevel1) return 'text-base';
    if (isLevel2) return 'text-sm';
    return 'text-sm';
  };

  // Build avatar URL - handle null, undefined, empty string, and full URLs
  const getAvatarSrc = () => {
    const profileImage = comment.user.profileImage;
    if (!profileImage || !profileImage.trim()) {
      return undefined;
    }
    
    // If already a full URL (http/https), use it directly
    if (profileImage.startsWith('http://') || profileImage.startsWith('https://')) {
      return profileImage;
    }
    
    // Otherwise, prepend base URL using environment variable
    const path = profileImage.startsWith('/') ? profileImage : `/${profileImage}`;
    // Đã thay đổi: Dùng SERVER_URL thay vì hardcode localhost
    return `${SERVER_URL}${path}`;
  };
  
  const avatarSrc = getAvatarSrc();

  return (
    <div
      ref={commentRef}
      className={`border rounded-lg transition-all duration-200 ${
        getPaddingClasses()
      } ${getBackgroundClasses()} ${
        isNewComment ? 'ring-2 ring-blue-300 bg-blue-50' : ''
      }`}
    >
      {/* Pinned indicator */}
      {comment.isPinned && (
        <div className="flex items-center text-blue-600 text-sm mb-2">
          <Pin className="w-4 h-4 mr-1" />
          Pinned by seller
        </div>
      )}

      <div className={`flex space-x-3 ${getIndentationClasses()}`}>
        <Avatar
          src={avatarSrc}
          alt={`${comment.user.firstName} ${comment.user.lastName}`}
          size={getAvatarSize()}
        />
        
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-medium text-gray-900 ${isLevel3 ? 'text-sm' : ''}`}>
                {comment.user.firstName} {comment.user.lastName}
              </h4>
              <span className={`text-gray-500 ${isLevel3 ? 'text-xs' : 'text-sm'}`}>
                {formatRelativeTime(comment.createdAt)}
              </span>
              {comment.isEdited && (
                <span className={`text-gray-400 ${isLevel3 ? 'text-xs' : 'text-sm'}`}>
                  (edited)
                </span>
              )}
            </div>

            {/* Actions menu - show for all authenticated users */}
            {isAuthenticated && (
              <div className="relative flex-shrink-0" ref={menuRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 h-8 w-8 rounded-md hover:bg-gray-100"
                  aria-label="Comment options"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>

                {showMenu && (
                  <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
                    {/* Edit - only for owner */}
                    {canEdit && (
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 min-h-[44px] transition-colors"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </button>
                    )}
                    
                    {/* Delete - for owner or seller */}
                    {(canDelete || (isSeller && !comment.isDeleted)) && (
                      <button
                        onClick={handleDeleteComment}
                        className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 min-h-[44px] transition-colors"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </button>
                    )}

                    {/* Pin/Unpin - only for seller, only root comments */}
                    {isSeller && !comment.parentCommentId && (
                      <button
                        onClick={handlePinComment}
                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 min-h-[44px] transition-colors"
                      >
                        {comment.isPinned ? (
                          <>
                            <PinOff className="w-4 h-4 mr-2" />
                            Unpin
                          </>
                        ) : (
                          <>
                            <Pin className="w-4 h-4 mr-2" />
                            Pin
                          </>
                        )}
                      </button>
                    )}

                    {/* Report - for non-owners and non-sellers */}
                    {!isOwner && !isSeller && (
                      <button
                        onClick={handleReportComment}
                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 min-h-[44px] transition-colors"
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        Report
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <CommentForm
              onSubmit={handleUpdateComment}
              onCancel={() => setIsEditing(false)}
              initialContent={comment.content}
              isEditing={true}
            />
          ) : (
            <div className={`text-gray-800 mb-2 ${getTextSizeClasses()}`}>
              {comment.content}
            </div>
          )}

          {/* Actions row: React, Reply */}
          <div className="flex items-center gap-4 mt-3">
            {/* Reactions */}
            <CommentReactions
              comment={comment}
              onReaction={handleReaction}
              isAuthenticated={isAuthenticated}
            />

            {/* Reply button */}
            {canReply && (
              <button
                onClick={() => setIsReplying(!isReplying)}
                className="flex items-center gap-1.5 px-2 py-1.5 h-8 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors min-h-[44px]"
                aria-label="Reply"
              >
                <Reply className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Reply form */}
          {isReplying && (
            <div className="mt-3">
              <CommentForm
                onSubmit={handleCreateReply}
                onCancel={() => setIsReplying(false)}
                placeholder="Write a reply..."
              />
            </div>
          )}

          {/* Expand/Collapse replies button for Level 1 and Level 2 */}
          {shouldShowExpandButton && (
            <button
              onClick={async () => {
                // If expanding and replies aren't loaded yet, load them first
                if (!repliesExpanded && !hasReplies && hasReplyCount && onLoadReplies) {
                  await onLoadReplies(comment.id);
                }
                setRepliesExpanded(!repliesExpanded);
              }}
              className="flex items-center gap-1.5 mt-2 px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              {repliesExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>Hide replies</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>View replies</span>
                </>
              )}
            </button>
          )}

          {/* Replies */}
          {hasReplies && repliesExpanded && (
            <div className="mt-4 space-y-3 transition-all duration-200 opacity-100">
              {comment.replies!.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onUpdateComment={onUpdateComment}
                  onDeleteComment={onDeleteComment}
                  onReaction={onReaction}
                  onPinComment={onPinComment}
                  onCreateReply={onCreateReply}
                  onLoadReplies={onLoadReplies}
                  currentUserId={currentUserId}
                  isAuthenticated={isAuthenticated}
                  nestingLevel={nestingLevel + 1}
                  isSeller={isSeller}
                  isNewlyCreated={newlyCreatedCommentIds.has(reply.id)}
                  newlyCreatedCommentIds={newlyCreatedCommentIds}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Report Comment Dialog */}
      <ReportCommentDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        commentId={comment.id}
      />
    </div>
  );
}