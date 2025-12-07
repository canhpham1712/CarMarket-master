import { useState, useRef, useEffect } from 'react';
import type { Comment } from '../../types/comment.types';
import { Button } from '../ui/Button';
import { ThumbsUp, CheckCircle, ThumbsDown } from 'lucide-react';

interface CommentReactionsProps {
  comment: Comment;
  onReaction: (commentId: string, reactionType: 'like' | 'helpful' | 'dislike') => void;
  isAuthenticated: boolean;
}

export function CommentReactions({ comment, onReaction, isAuthenticated }: CommentReactionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const reactionTypes: Array<'like' | 'helpful' | 'dislike'> = ['like', 'helpful', 'dislike'];

  const getReactionIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <ThumbsUp className="w-4 h-4" />;
      case 'helpful':
        return <CheckCircle className="w-4 h-4" />;
      case 'dislike':
        return <ThumbsDown className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getReactionLabel = (type: string) => {
    switch (type) {
      case 'like':
        return 'Like';
      case 'helpful':
        return 'Helpful';
      case 'dislike':
        return 'Dislike';
      default:
        return type;
    }
  };

  const getReactionCount = (type: string) => {
    return (comment.reactions || []).filter(r => r.reactionType === type).length;
  };

  const getUserReaction = () => {
    return comment.userReaction;
  };

  const handleMouseEnter = () => {
    if (!isAuthenticated) return;
    const timeout = setTimeout(() => {
      setShowMenu(true);
    }, 500); // 500ms delay for long hover
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    // Delay closing menu to allow clicking
    setTimeout(() => {
      if (menuRef.current && !menuRef.current.matches(':hover') && 
          buttonRef.current && !buttonRef.current.matches(':hover')) {
        setShowMenu(false);
      }
    }, 100);
  };

  const handleReactionClick = (type: 'like' | 'helpful' | 'dislike') => {
    if (!isAuthenticated) return;
    
    // If user already has this reaction, remove it
    if (comment.userReaction === type) {
      onReaction(comment.id, type);
    } else {
      // Add or update reaction
      onReaction(comment.id, type);
    }
    
    // Close menu after a brief delay to show feedback
    setTimeout(() => setShowMenu(false), 200);
  };

  const handleButtonClick = () => {
    if (!isAuthenticated) return;
    
    // If user has a reaction, remove it on click
    if (comment.userReaction) {
      onReaction(comment.id, comment.userReaction as 'like' | 'helpful' | 'dislike');
    } else {
      // Otherwise show menu
      setShowMenu(!showMenu);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

  const userReaction = getUserReaction();
  const totalReactions = (comment.reactions || []).length;
  
  // Build reaction summary text
  const reactionSummary = reactionTypes
    .map(type => {
      const count = getReactionCount(type);
      return count > 0 ? `${count} ${getReactionLabel(type)}` : null;
    })
    .filter(Boolean)
    .join(' • ');

  return (
    <div className="relative inline-flex items-center gap-1">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        onClick={handleButtonClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        disabled={!isAuthenticated}
        className={`flex items-center justify-center px-2 py-1.5 h-8 rounded-md transition-colors ${
          userReaction
            ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isAuthenticated ? (userReaction ? `Remove ${getReactionLabel(userReaction)}` : 'React to comment') : 'Log in to react'}
      >
        {userReaction ? (
          getReactionIcon(userReaction)
        ) : (
          <ThumbsUp className="w-4 h-4" />
        )}
      </Button>

      {/* Show reaction count inline if there are reactions */}
      {totalReactions > 0 && (
        <span className="text-xs text-gray-500 font-medium min-w-[20px]">
          {totalReactions}
        </span>
      )}

      {showMenu && isAuthenticated && (
        <div
          ref={menuRef}
          onMouseEnter={() => setShowMenu(true)}
          onMouseLeave={handleMouseLeave}
          className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[140px] transition-all duration-200"
          style={{ opacity: showMenu ? 1 : 0 }}
        >
          {reactionTypes.map((type) => {
            const count = getReactionCount(type);
            const isSelected = userReaction === type;
            
            return (
              <button
                key={type}
                onClick={() => handleReactionClick(type)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                } min-h-[44px]`}
              >
                <div className="flex items-center space-x-2">
                  {getReactionIcon(type)}
                  <span>{getReactionLabel(type)}</span>
                </div>
                {count > 0 && (
                  <span className="text-xs text-gray-500 font-medium">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
