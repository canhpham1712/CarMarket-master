import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth';
import { CommentService } from '../../services/comment.service';
import { socketService } from '../../services/socket.service';
import type { Comment, CommentQueryParams, CommentCreatedEvent, CommentUpdatedEvent, CommentDeletedEvent, CommentReactionEvent, CommentPinnedEvent, CommentReportedEvent } from '../../types/comment.types';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { MessageCircle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface CommentSectionProps {
  listingId: string;
  listingTitle: string;
  sellerId?: string; // Seller ID for pinning permissions
}

export function CommentSection({ listingId, listingTitle, sellerId }: CommentSectionProps) {
  const { user, isAuthenticated } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [newlyCreatedCommentIds, setNewlyCreatedCommentIds] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Helper function to recursively find and update a comment in nested structure
  const updateNestedComment = (
    comments: Comment[],
    targetId: string,
    updater: (comment: Comment) => Comment
  ): Comment[] => {
    return comments.map(comment => {
      if (comment.id === targetId) {
        return updater(comment);
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateNestedComment(comment.replies, targetId, updater),
        };
      }
      return comment;
    });
  };

  // Helper function to recursively find a comment by ID in nested structure
  const findCommentById = (comments: Comment[], targetId: string): Comment | null => {
    for (const comment of comments) {
      if (comment.id === targetId) {
        return comment;
      }
      if (comment.replies && comment.replies.length > 0) {
        const found = findCommentById(comment.replies, targetId);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  useEffect(() => {
    fetchComments();
  }, [listingId]);

  // Socket.IO event listeners
  useEffect(() => {
    // Join listing room for real-time updates
    socketService.joinListingRoom(listingId);

    // Listen for comment events
    const unsubscribeCreated = socketService.on('comment:created', (data: CommentCreatedEvent) => {
      if (data.listingId === listingId) {
        // Ensure reactions array is initialized
        const commentWithReactions = {
          ...data.comment,
          reactions: data.comment.reactions || [],
        };
        
        // If it's a reply, add it to the parent comment's replies array (recursively)
        if (data.comment.parentCommentId) {
          // Skip if this reply was created by the current user (already added in handleCreateComment)
          if (data.comment.userId === user?.id) {
            return; // Skip - already added by handleCreateComment
          }
          
          setComments(prevComments => {
            // Check if reply already exists (might have been added optimistically)
            const parentComment = findCommentById(prevComments, data.comment.parentCommentId!);
            if (parentComment?.replies?.some(r => r.id === data.comment.id)) {
              return prevComments; // Already handled, skip
            }
            
            // Recursively update the parent comment
            return updateNestedComment(prevComments, data.comment.parentCommentId!, (comment) => ({
              ...comment,
              replies: [...(comment.replies || []), commentWithReactions],
              replyCount: comment.replyCount + 1,
            }));
          });
          // Mark comment as newly created for scroll animation
          setNewlyCreatedCommentIds(prev => new Set(prev).add(data.comment.id));
          // Clear flag after animation
          setTimeout(() => {
            setNewlyCreatedCommentIds(prev => {
              const next = new Set(prev);
              next.delete(data.comment.id);
              return next;
            });
          }, 3000);
        } else {
          // Only add top-level comments to the main list
          // Skip if this comment was created by the current user (already added in handleCreateComment)
          if (data.comment.userId === user?.id) {
            return; // Skip - already added by handleCreateComment
          }
          
          // Check if comment already exists to avoid duplicates
          setComments(prevComments => {
            const exists = prevComments.some(c => c.id === data.comment.id);
            if (!exists) {
              // Only increment pagination if comment doesn't exist
              setPagination(prev => ({ ...prev, total: prev.total + 1 }));
              return [commentWithReactions, ...prevComments];
            }
            return prevComments;
          });
          // Mark comment as newly created for scroll animation
          setNewlyCreatedCommentIds(prev => new Set(prev).add(data.comment.id));
          setTimeout(() => {
            setNewlyCreatedCommentIds(prev => {
              const next = new Set(prev);
              next.delete(data.comment.id);
              return next;
            });
          }, 3000);
        }
      }
    });

    const unsubscribeUpdated = socketService.on('comment:updated', (data: CommentUpdatedEvent) => {
      if (data.listingId === listingId) {
        setComments(prevComments =>
          updateNestedComment(prevComments, data.comment.id, () => ({
            ...data.comment,
            reactions: data.comment.reactions || [],
          }))
        );
      }
    });

    const unsubscribeDeleted = socketService.on('comment:deleted', (data: CommentDeletedEvent) => {
      if (data.listingId === listingId) {
        // Remove comment from either top-level list or from parent's replies
        setComments(prevComments => {
          // Check if comment still exists (might have been deleted optimistically)
          const stillExists = prevComments.some(comment => 
            comment.id === data.commentId || 
            comment.replies?.some(reply => reply.id === data.commentId)
          );
          
          if (!stillExists) {
            return prevComments; // Already handled, skip
          }
          
          // Check if it's a top-level comment
          const isTopLevel = prevComments.some(comment => comment.id === data.commentId);
          
          if (isTopLevel) {
            // Remove from top-level comments
            setPagination(prev => ({ ...prev, total: prev.total - 1 }));
            return prevComments.filter(comment => comment.id !== data.commentId);
          } else {
            // Remove from parent's replies (recursively find and remove)
            return prevComments.map(comment => {
              // Check if this comment has the reply to delete
              if (comment.replies?.some(reply => reply.id === data.commentId)) {
                return {
                  ...comment,
                  replies: comment.replies.filter(reply => reply.id !== data.commentId),
                  replyCount: Math.max(0, comment.replyCount - 1),
                };
              }
              // Recursively check nested replies
              if (comment.replies && comment.replies.length > 0) {
                const updatedReplies = comment.replies.map(reply => {
                  if (reply.id === data.commentId) {
                    return null; // Mark for removal
                  }
                  if (reply.replies?.some(r => r.id === data.commentId)) {
                    return {
                      ...reply,
                      replies: reply.replies.filter(r => r.id !== data.commentId),
                      replyCount: Math.max(0, reply.replyCount - 1),
                    };
                  }
                  return reply;
                }).filter(Boolean) as Comment[];
                
                if (updatedReplies.length !== comment.replies.length) {
                  return {
                    ...comment,
                    replies: updatedReplies,
                  };
                }
              }
              return comment;
            });
          }
        });
      }
    });

    const unsubscribeReaction = socketService.on('comment:reaction', (data: CommentReactionEvent) => {
      if (data.listingId === listingId) {
        setComments(prevComments =>
          prevComments.map(comment =>
            comment.id === data.commentId
              ? {
                  ...comment,
                  reactions: data.reaction 
                    ? [...(comment.reactions || []).filter(r => r.userId !== data.reaction.userId), data.reaction]
                    : (comment.reactions || []),
                  reactionCount: data.reaction ? comment.reactionCount + 1 : Math.max(0, comment.reactionCount - 1),
                }
              : comment
          )
        );
      }
    });

    const unsubscribePinned = socketService.on('comment:pinned', (data: CommentPinnedEvent) => {
      if (data.listingId === listingId) {
        setComments(prevComments =>
          updateNestedComment(prevComments, data.commentId, (comment) => ({
            ...comment,
            isPinned: data.isPinned,
          }))
        );
      }
    });

    const unsubscribeReported = socketService.on('comment:reported', async (data: CommentReportedEvent) => {
      if (data.listingId === listingId) {
        // Fetch updated comment to get latest report status
        try {
          const updatedComment = await CommentService.getComment(data.commentId);
          setComments(prevComments =>
            updateNestedComment(prevComments, data.commentId, () => ({
              ...updatedComment,
            }))
          );
        } catch (error) {
          // If fetch fails, just update the flags based on what we know
          setComments(prevComments =>
            updateNestedComment(prevComments, data.commentId, (comment) => ({
              ...comment,
              isReported: true,
              reportCount: (comment.reportCount || 0) + 1,
            }))
          );
        }
      }
    });

    return () => {
      socketService.leaveListingRoom(listingId);
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribeReaction();
      unsubscribePinned();
      unsubscribeReported();
    };
  }, [listingId]);

  const fetchComments = async (page = 1) => {
    try {
      setLoading(true);
      const params: CommentQueryParams = {
        page,
        limit: pagination.limit,
        sortBy: 'newest',
      };
      
      const response = await CommentService.getCommentsByListing(listingId, params);
      
      // If loading first page, replace comments. Otherwise, append for pagination
      if (page === 1) {
        setComments(response.comments);
      } else {
        setComments(prevComments => [...prevComments, ...response.comments]);
      }
      
      setPagination(response.pagination);
    } catch (error: any) {
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateComment = async (content: string, parentCommentId?: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to comment');
      return;
    }

    try {
      const newComment = await CommentService.createComment({
        listingId,
        content,
        ...(parentCommentId && { parentCommentId }),
      });

      // Mark this comment as newly created for scroll animation
      setNewlyCreatedCommentIds(prev => new Set(prev).add(newComment.id));

      if (parentCommentId) {
        // Add reply to parent comment (recursively find parent in nested structure)
        const replyWithReactions = {
          ...newComment,
          reactions: newComment.reactions || [],
        };
        setComments(prevComments =>
          updateNestedComment(prevComments, parentCommentId, (comment) => ({
            ...comment,
            replies: [...(comment.replies || []), replyWithReactions],
            replyCount: comment.replyCount + 1,
          }))
        );
      } else {
        // Add new top-level comment
        // Ensure reactions array is initialized
        const commentWithReactions = {
          ...newComment,
          reactions: newComment.reactions || [],
        };
        setComments(prevComments => [commentWithReactions, ...prevComments]);
        setPagination(prev => ({ ...prev, total: prev.total + 1 }));
      }

      setShowCommentForm(false);
      toast.success('Comment added successfully');
      
      // Clear the newly created flag after animation completes
      setTimeout(() => {
        setNewlyCreatedCommentIds(prev => {
          const next = new Set(prev);
          next.delete(newComment.id);
          return next;
        });
      }, 3000);
    } catch (error: any) {
      let errorMessage = 'Failed to add comment';
      
      if (error.response?.status === 401) {
        errorMessage = 'Please log in to comment';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'Invalid comment data';
      } else if (error.response?.status === 404) {
        errorMessage = 'Listing not found';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    try {
      const updatedComment = await CommentService.updateComment(commentId, { content });
      
      setComments(prevComments =>
        updateNestedComment(prevComments, commentId, () => ({
          ...updatedComment,
          reactions: updatedComment.reactions || [],
        }))
      );

      toast.success('Comment updated successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update comment';
      toast.error(errorMessage);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await CommentService.deleteComment(commentId);
      
      // Remove comment from either top-level list or from parent's replies
      setComments(prevComments => {
        // Check if it's a top-level comment
        const isTopLevel = prevComments.some(comment => comment.id === commentId);
        
        if (isTopLevel) {
          // Remove from top-level comments
          setPagination(prev => ({ ...prev, total: prev.total - 1 }));
          return prevComments.filter(comment => comment.id !== commentId);
        } else {
          // Remove from parent's replies (recursively find and remove)
          return prevComments.map(comment => {
            // Check if this comment has the reply to delete
            if (comment.replies?.some(reply => reply.id === commentId)) {
              return {
                ...comment,
                replies: comment.replies.filter(reply => reply.id !== commentId),
                replyCount: Math.max(0, comment.replyCount - 1),
              };
            }
            // Recursively check nested replies
            if (comment.replies && comment.replies.length > 0) {
              const updatedReplies = comment.replies.map(reply => {
                if (reply.id === commentId) {
                  return null; // Mark for removal
                }
                if (reply.replies?.some(r => r.id === commentId)) {
                  return {
                    ...reply,
                    replies: reply.replies.filter(r => r.id !== commentId),
                    replyCount: Math.max(0, reply.replyCount - 1),
                  };
                }
                return reply;
              }).filter(Boolean) as Comment[];
              
              if (updatedReplies.length !== comment.replies.length) {
                return {
                  ...comment,
                  replies: updatedReplies,
                };
              }
            }
            return comment;
          });
        }
      });
      
      toast.success('Comment deleted successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete comment';
      toast.error(errorMessage);
    }
  };

  const handleReaction = async (commentId: string, reactionType: 'like' | 'helpful' | 'dislike') => {
    if (!isAuthenticated) {
      toast.error('Please log in to react');
      return;
    }

    try {
      const result = await CommentService.addReaction(commentId, { reactionType });
      
      // Update comment reactions
      setComments(prevComments =>
        prevComments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              reactions: result ? [result] : (comment.reactions || []).filter(r => r.userId !== user?.id),
              reactionCount: result ? comment.reactionCount + 1 : comment.reactionCount - 1,
              ...(result ? { userReaction: reactionType } : {}),
            };
          }
          const updatedReplies = comment.replies?.map(reply => {
            if (reply.id === commentId) {
              return {
                ...reply,
                reactions: result ? [result] : (reply.reactions || []).filter(r => r.userId !== user?.id),
                reactionCount: result ? reply.reactionCount + 1 : reply.reactionCount - 1,
                ...(result ? { userReaction: reactionType } : {}),
              };
            }
            return reply;
          });
          return {
            ...comment,
            ...(updatedReplies && { replies: updatedReplies }),
          };
        })
      );
    } catch (error: any) {
      toast.error('Failed to add reaction');
    }
  };

  const handlePinComment = async (commentId: string, isPinned: boolean) => {
    try {
      if (isPinned) {
        await CommentService.unpinComment(commentId);
      } else {
        await CommentService.pinComment(commentId);
      }

      setComments(prevComments =>
        prevComments.map(comment =>
          comment.id === commentId
            ? { ...comment, isPinned: !isPinned }
            : comment
        )
      );

      toast.success(`Comment ${isPinned ? 'unpinned' : 'pinned'} successfully`);
    } catch (error: any) {
      toast.error('Failed to pin/unpin comment');
    }
  };

  const handleLoadReplies = async (commentId: string) => {
    try {
      const replies = await CommentService.getCommentReplies(commentId, { page: 1, limit: 5 });
      
      // Update the comment with loaded replies (recursively find and update)
      setComments(prevComments =>
        updateNestedComment(prevComments, commentId, (comment) => ({
          ...comment,
          replies: replies.map(reply => ({
            ...reply,
            reactions: reply.reactions || [],
          })),
        }))
      );
    } catch (error: any) {
      toast.error('Failed to load replies');
    }
  };

  const loadMoreComments = () => {
    if (pagination.page < pagination.totalPages) {
      fetchComments(pagination.page + 1);
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <MessageCircle className="w-5 h-5 mr-2" />
            Comments ({pagination.total})
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {isAuthenticated && (
              <Button
                onClick={() => setShowCommentForm(true)}
                className="flex items-center bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Comment
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {showCommentForm && (
          <div className="mb-6">
            <CommentForm
              onSubmit={(content) => handleCreateComment(content)}
              onCancel={() => setShowCommentForm(false)}
              placeholder={`Share your thoughts about ${listingTitle}...`}
            />
          </div>
        )}

        <CommentList
          comments={comments}
          loading={loading}
          onUpdateComment={handleUpdateComment}
          onDeleteComment={handleDeleteComment}
          onReaction={handleReaction}
          onPinComment={handlePinComment}
          onCreateReply={handleCreateComment}
          onLoadReplies={handleLoadReplies}
          {...(user?.id && { currentUserId: user.id })}
          isAuthenticated={isAuthenticated}
          {...(sellerId && { sellerId })}
          {...(newlyCreatedCommentIds.size > 0 && { newlyCreatedCommentIds })}
        />

        {pagination.page < pagination.totalPages && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={loadMoreComments}
              disabled={loading}
            >
              Load More Comments
            </Button>
          </div>
        )}

        {!loading && comments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
