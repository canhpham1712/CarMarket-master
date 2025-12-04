import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function Select({ value, onValueChange, children, className = '' }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || '');
  const selectRef = useRef<HTMLDivElement>(null);

  // Sync internal state with external value prop
  useEffect(() => {
    setSelectedValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (itemValue: string, itemLabel: string) => {
    setSelectedValue(itemValue);
    onValueChange?.(itemValue);
    setIsOpen(false);
  };

  // Find the selected item's label
  let selectedLabel = '';
  React.Children.forEach(children, (child: any) => {
    if (child?.type?.displayName === 'SelectContent' || child?.type?.name === 'SelectContent') {
      React.Children.forEach(child.props.children, (item: any) => {
        if (item?.props?.value === selectedValue) {
          selectedLabel = typeof item.props.children === 'string' 
            ? item.props.children 
            : item.props.children?.toString() || '';
        }
      });
    }
  });

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      {React.Children.map(children, (child: any) => {
        if (child?.type?.displayName === 'SelectTrigger' || child?.type?.name === 'SelectTrigger') {
          return React.cloneElement(child, {
            onClick: () => setIsOpen(!isOpen),
            isOpen,
            selectedValue,
            selectedLabel,
          });
        }
        if (child?.type?.displayName === 'SelectContent' || child?.type?.name === 'SelectContent') {
          return isOpen ? React.cloneElement(child, {
            onItemClick: handleItemClick,
            selectedValue,
          }) : null;
        }
        return null;
      })}
    </div>
  );
}

export function SelectTrigger({ children, className = '', onClick, isOpen, selectedValue, selectedLabel }: SelectTriggerProps & { onClick?: () => void; isOpen?: boolean; selectedValue?: string; selectedLabel?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    >
      <span className="block truncate">
        {selectedLabel || (selectedValue ? children : 'Select an option')}
      </span>
      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
}
SelectTrigger.displayName = 'SelectTrigger';

export function SelectContent({ children, className = '', onItemClick, selectedValue }: SelectContentProps & { onItemClick?: (value: string, label: string) => void; selectedValue?: string }) {
  return (
    <div className={`absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto ${className}`}>
      {React.Children.map(children, (child: any) => {
        if (child?.type?.displayName === 'SelectItem' || child?.type?.name === 'SelectItem') {
          const label = typeof child.props.children === 'string' 
            ? child.props.children 
            : child.props.children?.toString() || '';
          return React.cloneElement(child, {
            onClick: () => onItemClick?.(child.props.value, label),
            isSelected: child.props.value === selectedValue,
          });
        }
        return child;
      })}
    </div>
  );
}
SelectContent.displayName = 'SelectContent';

export function SelectItem({ value, children, className = '', onClick, isSelected }: SelectItemProps & { onClick?: () => void; isSelected?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
        isSelected ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
      } ${className}`}
    >
      {children}
    </button>
  );
}
SelectItem.displayName = 'SelectItem';