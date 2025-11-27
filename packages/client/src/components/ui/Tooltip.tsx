import { useState, useRef, useEffect, ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'bottom' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current && wrapperRef.current) {
      // Use requestAnimationFrame to ensure tooltip is rendered before calculating position
      requestAnimationFrame(() => {
        if (!tooltipRef.current || !wrapperRef.current) return;
        
        const tooltip = tooltipRef.current;
        const wrapper = wrapperRef.current;
        const rect = wrapper.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Auto-adjust position based on available space
        let newPosition = position;
        
        // Check if tooltip would overflow viewport
        if (position === 'top' && rect.top < tooltipRect.height + 8) {
          newPosition = 'bottom';
        } else if (position === 'bottom' && window.innerHeight - rect.bottom < tooltipRect.height + 8) {
          newPosition = 'top';
        } else if (position === 'left' && rect.left < tooltipRect.width + 8) {
          newPosition = 'right';
        } else if (position === 'right' && window.innerWidth - rect.right < tooltipRect.width + 8) {
          newPosition = 'left';
        }
        
        setActualPosition(newPosition);
      });
    } else if (!isVisible) {
      // Reset position when tooltip is hidden
      setActualPosition(position);
    }
  }, [isVisible, position]);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800',
  };

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-[9999] px-3 py-2 text-sm text-white bg-gray-800 rounded-lg shadow-xl whitespace-normal max-w-xs w-64 pointer-events-none ${positionClasses[actualPosition]}`}
          role="tooltip"
          style={{
            wordWrap: 'break-word',
            lineHeight: '1.5',
          }}
        >
          {content}
          <div
            className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[actualPosition]}`}
          />
        </div>
      )}
    </div>
  );
}

