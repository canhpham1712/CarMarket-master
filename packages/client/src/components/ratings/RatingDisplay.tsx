import { Star } from 'lucide-react';
import type { RatingStats } from '../../types';

interface RatingDisplayProps {
  stats: RatingStats;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RatingDisplay({ stats, showLabel = true, size = 'md' }: RatingDisplayProps) {
  const { averageRating, totalRatings } = stats;

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(averageRating);
    const hasHalfStar = averageRating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star
            key={i}
            className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400`}
          />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <Star className={`${sizeClasses[size]} text-gray-300`} />
            <Star
              className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400 absolute top-0 left-0`}
              style={{ clipPath: 'inset(0 50% 0 0)' }}
            />
          </div>
        );
      } else {
        stars.push(
          <Star key={i} className={`${sizeClasses[size]} text-gray-300`} />
        );
      }
    }

    return stars;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {renderStars()}
      </div>
      {averageRating > 0 && (
        <span className={`${textSizeClasses[size]} font-semibold text-gray-900`}>
          {averageRating.toFixed(1)}
        </span>
      )}
      {showLabel && totalRatings > 0 && (
        <span className={`${textSizeClasses[size]} text-gray-600`}>
          ({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})
        </span>
      )}
      {totalRatings === 0 && (
        <span className={`${textSizeClasses[size]} text-gray-500`}>
          No ratings yet
        </span>
      )}
    </div>
  );
}

