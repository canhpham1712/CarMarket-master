import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '../ui/Button';
import { RatingService } from '../../services/rating.service';
import type { CreateRatingRequest } from '../../types';
import toast from 'react-hot-toast';

interface RatingFormProps {
  sellerId: string;
  transactionId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  initialRating?: number;
  initialComment?: string;
  isEditing?: boolean;
  ratingId?: string;
}

export function RatingForm({
  sellerId,
  transactionId,
  onSuccess,
  onCancel,
  initialRating = 0,
  initialComment = '',
  isEditing = false,
  ratingId,
}: RatingFormProps) {
  const [rating, setRating] = useState(initialRating);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(initialComment);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && ratingId) {
        await RatingService.updateRating(ratingId, {
          rating,
          comment: comment || undefined,
        });
        toast.success('Rating updated successfully');
      } else {
        const data: CreateRatingRequest = {
          sellerId,
          rating,
          comment: comment || undefined,
          transactionId,
        };
        await RatingService.createRating(data);
        toast.success('Rating submitted successfully');
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rating *
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="focus:outline-none"
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
          Comment (optional)
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={1000}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Share your experience with this seller..."
        />
        <p className="mt-1 text-sm text-gray-500">
          {comment.length}/1000 characters
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={isSubmitting || rating === 0}
          className="flex-1 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500"
        >
          {isSubmitting ? 'Submitting...' : isEditing ? 'Update Rating' : 'Submit Rating'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

