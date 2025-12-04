import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { RatingForm } from './RatingForm';
import { RatingService } from '../../services/rating.service';
import type { SellerRating, RatingQueryParams } from '../../types';
import { formatRelativeTime } from '../../lib/utils';
import toast from 'react-hot-toast';

interface RatingListProps {
  sellerId: string;
  currentUserId?: string;
  onRatingUpdate?: () => void;
}

export function RatingList({ sellerId, currentUserId, onRatingUpdate }: RatingListProps) {
  const [ratings, setRatings] = useState<SellerRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadRatings = async (pageNum: number = 1) => {
    try {
      const params: RatingQueryParams = {
        page: pageNum,
        limit: 10,
      };
      const response = await RatingService.getSellerRatings(sellerId, params);
      
      if (pageNum === 1) {
        setRatings(response.ratings);
      } else {
        setRatings((prev) => [...prev, ...response.ratings]);
      }

      setHasMore(response.pagination.page < response.pagination.totalPages);
    } catch (error: any) {
      toast.error('Failed to load ratings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRatings(1);
  }, [sellerId]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadRatings(nextPage);
  };

  const handleDelete = async (ratingId: string) => {
    if (!confirm('Are you sure you want to delete this rating?')) {
      return;
    }

    try {
      await RatingService.deleteRating(ratingId);
      setRatings((prev) => prev.filter((r) => r.id !== ratingId));
      toast.success('Rating deleted successfully');
      if (onRatingUpdate) {
        onRatingUpdate();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete rating');
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading && ratings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">Loading ratings...</div>
    );
  }

  if (ratings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No ratings yet. Be the first to rate this seller!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ratings.map((rating) => (
        <div
          key={rating.id}
          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-3">
            <Avatar
              src={rating.buyer?.profileImage}
              alt={rating.buyer ? `${rating.buyer.firstName} ${rating.buyer.lastName}` : 'User'}
              size="md"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">
                    {rating.buyer
                      ? `${rating.buyer.firstName} ${rating.buyer.lastName}`
                      : 'Anonymous'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatRelativeTime(rating.createdAt)}
                  </p>
                </div>
                {currentUserId === rating.buyerId && (
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setEditingId(editingId === rating.id ? null : rating.id)
                      }
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(rating.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              {editingId === rating.id ? (
                <div className="mt-4">
                  <RatingForm
                    sellerId={sellerId}
                    transactionId={rating.transactionId || undefined}
                    initialRating={rating.rating}
                    initialComment={rating.comment || ''}
                    isEditing={true}
                    ratingId={rating.id}
                    onSuccess={() => {
                      setEditingId(null);
                      loadRatings(1);
                      if (onRatingUpdate) {
                        onRatingUpdate();
                      }
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <>
                  {renderStars(rating.rating)}
                  {rating.comment && (
                    <p className="mt-2 text-gray-700">{rating.comment}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-4 py-2 text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}

