import React, { useRef, useEffect } from "react";

interface DualRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  valueMin: number;
  valueMax: number;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
  className?: string;
  formatValue?: (value: number) => string;
}

export function DualRangeSlider({
  min,
  max,
  step = 1000,
  valueMin,
  valueMax,
  onChangeMin,
  onChangeMax,
  className = "",
  formatValue = (v) => v.toLocaleString(),
}: DualRangeSliderProps) {
  const range = useRef<HTMLDivElement>(null);

  // Convert to percentage
  const getPercent = (value: number) => {
    if (max === min) return 0;
    return ((value - min) / (max - min)) * 100;
  };

  useEffect(() => {
    if (range.current) {
      const minPercent = getPercent(valueMin);
      const maxPercent = getPercent(valueMax);

      range.current.style.left = `${minPercent}%`;
      range.current.style.width = `${maxPercent - minPercent}%`;
    }
  }, [valueMin, valueMax, min, max]);

  const handleMinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (value < valueMax) {
      onChangeMin(value);
    }
  };

  const handleMaxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (value > valueMin) {
      onChangeMax(value);
    }
  };

  return (
    <>
      <style>{`
        .dual-range-slider-wrapper {
          padding: 0 10px;
        }

        .dual-range-slider input[type="range"] {
          position: absolute;
          width: 100%;
          pointer-events: none;
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          height: 8px;
          top: 0;
          left: 0;
        }

        .dual-range-slider input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: #2563eb;
          cursor: pointer;
          border-radius: 50%;
          pointer-events: all;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          position: relative;
          margin-top: -7px;
        }

        .dual-range-slider input[type="range"]::-webkit-slider-thumb:hover {
          background: #3b82f6;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
          transform: scale(1.1);
        }

        .dual-range-slider input[type="range"]::-webkit-slider-thumb:active {
          background: #1d4ed8;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
        }

        .dual-range-slider input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #2563eb;
          cursor: pointer;
          border-radius: 50%;
          pointer-events: all;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        .dual-range-slider input[type="range"]::-moz-range-thumb:hover {
          background: #3b82f6;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
          transform: scale(1.1);
        }

        .dual-range-slider input[type="range"]::-moz-range-thumb:active {
          background: #1d4ed8;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
        }

        .dual-range-slider input[type="range"]::-webkit-slider-track {
          background: transparent;
          height: 6px;
        }

        .dual-range-slider input[type="range"]::-moz-range-track {
          background: transparent;
          height: 6px;
        }
      `}</style>
      <div className={`dual-range-slider-wrapper ${className}`}>
        <div className="dual-range-slider">
          <div className="relative" style={{ height: "30px" }}>
            {/* Background track */}
            <div
              className="absolute w-full bg-gray-200 rounded-full"
              style={{
                height: "6px",
                top: "12px",
                left: 0,
                right: 0,
              }}
            ></div>

            {/* Active range */}
            <div
              ref={range}
              className="absolute bg-blue-600 rounded-full"
              style={{
                height: "6px",
                top: "12px",
                zIndex: 1,
              }}
            ></div>

            {/* Min input */}
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={valueMin}
              onChange={handleMinChange}
              style={{ zIndex: valueMin > max - (max - min) / 2 ? 5 : 3 }}
            />

            {/* Max input */}
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={valueMax}
              onChange={handleMaxChange}
              style={{ zIndex: 4 }}
            />
          </div>
        </div>

        {/* Value labels */}
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>{formatValue(valueMin)}</span>
          <span>{formatValue(valueMax)}</span>
        </div>
      </div>
    </>
  );
}

// Demo component
export default function App() {
  const [minValue, setMinValue] = React.useState(0);
  const [maxValue, setMaxValue] = React.useState(61000);

  return (
    <div className="min-h-screen bg-blue-600 flex items-center justify-center p-8">
      <div className="w-full max-w-5xl bg-white rounded-lg shadow-lg p-8">
        <div className="flex gap-4 mb-8">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by make, model, or keyword..."
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg"
            />
            <svg
              className="absolute left-3 top-4 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Search
          </button>
        </div>

        <div className="space-y-6">
          {/* Make and Model */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Make
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                <option>Select a make</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-400">
                <option>Select make first</option>
              </select>
            </div>
          </div>

          {/* Max Mileage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Mileage (miles)
            </label>
            <input
              type="number"
              placeholder="e.g., 50000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Price Range: ${minValue.toLocaleString()} - $
              {maxValue.toLocaleString()}
            </label>
            <DualRangeSlider
              min={0}
              max={100000}
              step={1000}
              valueMin={minValue}
              valueMax={maxValue}
              onChangeMin={setMinValue}
              onChangeMax={setMaxValue}
              formatValue={(v) => `$${v.toLocaleString()}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
