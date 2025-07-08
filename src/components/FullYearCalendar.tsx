"use client"
import React, { useRef } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { useAccessibilityFixes } from '@/utils/accessibility';

interface Holiday {
  id: string;
  holiday_date: string;
  description?: string;
}

interface FullYearCalendarProps {
  holidays?: Holiday[];
  year?: number;
  onSelect?: (date: Date | undefined) => void;
}

// why: shows all months for a given year, highlighting holidays
export const FullYearCalendar: React.FC<FullYearCalendarProps> = ({ holidays = [], year = new Date().getFullYear(), onSelect }) => {
  // Apply accessibility fixes
  useAccessibilityFixes();
  
  // Generate the first day of each month for the given year
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  
  // Ref for the calendar container to ensure no aria-hidden issues
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      ref={calendarContainerRef} 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      data-no-aria-hidden="true"
    >
      {months.map((monthDate) => (
        <div 
          key={monthDate.getMonth()} 
          className="bg-background rounded-lg p-2"
          data-no-aria-hidden="true"
        >
          <div className="text-center font-semibold mb-2 text-lg">
            {monthDate.toLocaleString('pt-PT', { month: 'long', year: 'numeric' })}
          </div>
          <Calendar
            mode="single"
            month={monthDate}
            selected={undefined}
            holidays={holidays}
            showOutsideDays
            onSelect={onSelect}
            components={{
              IconLeft: () => null,
              IconRight: () => null,
              Caption: () => null,
            }}
            classNames={{
              day: "size-8 p-0 font-normal border-none outline-none focus:outline-none focus:ring-0 cursor-pointer",
            }}
          />
        </div>
      ))}
    </div>
  );
}; 