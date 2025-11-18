import { useState, useEffect, useRef, useCallback } from 'react';
import type { CombinedEvent } from '../App';

interface TimelineSliderProps {
  events: CombinedEvent[];
  selectedMonth: number;
  selectedDay: number;
  searchYear: string;
  onYearChange: (year: string) => void;
}

export function TimelineSlider({
  events,
  selectedMonth,
  selectedDay,
  searchYear,
  onYearChange,
}: TimelineSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sliderYear, setSliderYear] = useState<number | null>(null);
  const currentYearRef = useRef<number | null>(null);

  // Calculate bounds based on events for the selected month/day
  const calculateBounds = useCallback(() => {
    // Filter events for the selected month and day (0 means all)
    const relevantEvents = events.filter(
      (e) => (selectedMonth === 0 || e.month === selectedMonth) && (selectedDay === 0 || e.day === selectedDay)
    );

    if (relevantEvents.length === 0) {
      // If no events, use reasonable defaults
      const currentYear = new Date().getFullYear();
      return {
        minYear: currentYear - 100,
        maxYear: currentYear,
      };
    }

    // Find the oldest year (left bound - how far into the past)
    const years = relevantEvents.map((e) => e.year);
    const minYear = Math.min(...years);
    // Right bound is the present (current year)
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear;

    return { minYear, maxYear };
  }, [events, selectedMonth, selectedDay]);

  const { minYear, maxYear } = calculateBounds();

  // Initialize slider year when bounds change or when searchYear changes
  useEffect(() => {
    if (searchYear) {
      const yearNum = parseInt(searchYear);
      if (!isNaN(yearNum)) {
        // Clamp to bounds - if out of bounds, jump to min or max
        let finalYear: number;
        if (yearNum < minYear) {
          finalYear = minYear;
        } else if (yearNum > maxYear) {
          finalYear = maxYear;
        } else {
          finalYear = yearNum;
        }
        setSliderYear(finalYear);
        currentYearRef.current = finalYear;
      } else {
        // If searchYear is invalid, set to middle
        const middleYear = Math.floor((minYear + maxYear) / 2);
        setSliderYear(middleYear);
        currentYearRef.current = middleYear;
      }
    } else {
      // If no searchYear, set to middle of range
      const middleYear = Math.floor((minYear + maxYear) / 2);
      setSliderYear(middleYear);
      currentYearRef.current = middleYear;
    }
  }, [minYear, maxYear, searchYear]);

  // Convert year to percentage position on slider
  const yearToPercentage = (year: number): number => {
    if (maxYear === minYear) return 50;
    return ((year - minYear) / (maxYear - minYear)) * 100;
  };

  // Convert percentage position to year
  const percentageToYear = (percentage: number): number => {
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    const year = Math.round(minYear + (clampedPercentage / 100) * (maxYear - minYear));
    return Math.max(minYear, Math.min(maxYear, year));
  };

  // Handle mouse/touch events for dragging
  // This updates the visual position but doesn't trigger event loading during drag
  const handleMove = useCallback(
    (clientX: number, shouldUpdateEvents: boolean = false) => {
      if (!sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const percentage = ((clientX - rect.left) / rect.width) * 100;
      const newYear = percentageToYear(percentage);
      setSliderYear(newYear);
      currentYearRef.current = newYear; // Store in ref for immediate access
      // Only update events if explicitly requested (e.g., on track click or mouse up)
      if (shouldUpdateEvents) {
        onYearChange(newYear.toString());
      }
    },
    [minYear, maxYear, onYearChange]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    // Update visual position but don't trigger event loading yet
    handleMove(e.clientX, false);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      // Update visual position but don't trigger event loading during drag
      handleMove(e.clientX, false);
    }
  };

  const handleMouseUp = () => {
    if (isDragging && currentYearRef.current !== null) {
      // Now trigger event loading with the final year value
      onYearChange(currentYearRef.current.toString());
    }
    setIsDragging(false);
  };

  // Handle click on track
  const handleTrackClick = (e: React.MouseEvent) => {
    if (e.target === sliderRef.current || (e.target as HTMLElement).classList.contains('slider-track')) {
      // Track click should immediately update events (not a drag operation)
      handleMove(e.clientX, true);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  if (sliderYear === null) {
    return null;
  }

  const handlePosition = yearToPercentage(sliderYear);

  return (
    <div className="w-full">
      <label className="block text-2xl font-medium text-slate-300 mb-10">
        Year Selection
      </label>
      
      {/* Timeline container */}
      <div className="relative mb-2 mt-8">
        {/* Track background - full timeline range */}
        <div
          ref={sliderRef}
          className="slider-track relative h-12 bg-slate-700/50 rounded-lg cursor-pointer border border-slate-600"
          onClick={handleTrackClick}
        >
          {/* Active range (between bounds) - where slider can move */}
          <div
            className="absolute top-0 bottom-0 bg-slate-600/40 rounded-lg"
            style={{
              left: '0%',
              right: '0%',
            }}
          />

          {/* Left bound indicator */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-red-500 z-10"
            style={{ left: '0%' }}
          >
            <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-red-400 whitespace-nowrap bg-slate-900/90 px-2 py-0.5 rounded border border-red-500/50">
              {minYear}
            </div>
          </div>

          {/* Right bound indicator */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-green-500 z-10"
            style={{ right: '0%' }}
          >
            <div className="absolute -top-7 right-1/2 transform translate-x-1/2 text-xs font-semibold text-green-400 whitespace-nowrap bg-slate-900/90 px-2 py-0.5 rounded border border-green-500/50">
              {maxYear}
            </div>
          </div>

          {/* Draggable handle - bar style */}
          <div
            className="absolute top-0 bottom-0 transform -translate-x-1/2 w-3 bg-blue-500 shadow-lg cursor-grab active:cursor-grabbing z-20 border-2 border-blue-300 hover:bg-blue-400 hover:scale-x-125 transition-all rounded-sm"
            style={{ left: `${handlePosition}%` }}
            onMouseDown={handleMouseDown}
          >
            {/* Year label above handle */}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 text-sm font-bold text-blue-200 whitespace-nowrap bg-blue-600/90 px-3 py-1.5 rounded-lg border-2 border-blue-400 shadow-lg">
              {sliderYear}
            </div>
          </div>
        </div>
        
        {/* Past and Present labels below the timeline */}
        <div className="flex justify-between mt-2">
          <div className="text-[16px] text-red-400/70">
            Past
          </div>
          <div className="text-[16px] text-green-400/70"> 
            Present
          </div>
        </div>
      </div>

      {/* Info text */}
      <div className="text-lg text-slate-400 text-center">
        Drag the blue handle across the timeline to select a year! Range: {minYear} to {maxYear}
      </div>
    </div>
  );
}

