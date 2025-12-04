import { useState } from 'react';
import { Button } from '../ui/Button';

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'custom';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  onCustomRangeSelect?: (startDate: Date, endDate: Date) => void;
}

export function TimeRangeSelector({
  value,
  onChange,
  onCustomRangeSelect,
}: TimeRangeSelectorProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const ranges: { label: string; value: TimeRange }[] = [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' },
    { label: '1 Year', value: '1y' },
    { label: 'Custom', value: 'custom' },
  ];

  const handleCustomSubmit = () => {
    if (customStart && customEnd && onCustomRangeSelect) {
      onCustomRangeSelect(new Date(customStart), new Date(customEnd));
      setShowCustomPicker(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 relative">
      {ranges.map((range) => (
        <Button
          key={range.value}
          variant={value === range.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            if (range.value === 'custom') {
              setShowCustomPicker(!showCustomPicker);
            } else {
              onChange(range.value);
            }
          }}
        >
          {range.label}
        </Button>
      ))}

      {showCustomPicker && (
        <div className="absolute mt-10 p-4 bg-white border rounded-lg shadow-lg z-10">
          <div className="flex flex-col space-y-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleCustomSubmit}>
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCustomPicker(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

