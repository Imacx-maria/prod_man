"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { format, parse, isSameDay } from "date-fns"
import { pt } from "date-fns/locale"

import { cn } from "@/utils/tailwind"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  holidays = [],
  ...props
}: React.ComponentProps<typeof DayPicker> & { 
  holidays?: { holiday_date: string }[] 
}) {
  // Parse all holiday dates into Date objects for comparison
  const holidayDates = React.useMemo(() => {
    if (!holidays || !Array.isArray(holidays) || holidays.length === 0) {
      return [];
    }
    
    return holidays.map(h => {
      if (!h || !h.holiday_date) {
        return null;
      }
      
      // Parse using date-fns to ensure consistent handling
      try {
        return parse(h.holiday_date, "yyyy-MM-dd", new Date());
      } catch (error) {
        console.error("Error parsing holiday date:", h.holiday_date, error);
        return null;
      }
    }).filter(Boolean) as Date[];
  }, [holidays]);
  
  // Create a map of holiday dates for faster lookup (format: YYYY-MM-DD)
  const holidayMap = React.useMemo(() => {
    const map: Record<string, boolean> = {};
    holidayDates.forEach(date => {
      if (date) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        map[key] = true;
      }
    });
    return map;
  }, [holidayDates]);

  // Define our custom modifiers - only weekends and holidays
  const modifiers = React.useMemo(() => ({
    ...props.modifiers,
    weekend: (date: Date) => date.getDay() === 0 || date.getDay() === 6, // 0 = Sunday, 6 = Saturday
    holiday: (date: Date) => {
      // Using the map for faster lookup
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return !!holidayMap[dateKey];
    }
  }), [props.modifiers, holidayMap]);
  
  // Define modifier styles
  const modifiersStyles = React.useMemo(() => ({
    weekend: { backgroundColor: 'var(--secondary-background)' },
    holiday: { backgroundColor: 'var(--secondary-background)' },
    today: { backgroundColor: 'var(--orange)', color: 'var(--color-accent-foreground)' }, // orange background for today
  }), []);

  // Create refs for accessibility focus management
  const rootRef = React.useRef<HTMLDivElement>(null);
  
  // Handle focus events to prevent parent aria-hidden issues
  const handleFocusIn = React.useCallback((e: FocusEvent) => {
    // When a calendar button gets focus, make sure parent elements don't apply aria-hidden
    const parent = rootRef.current?.closest('[aria-hidden="true"]');
    if (parent) {
      parent.removeAttribute('aria-hidden');
    }
  }, []);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    
    // Add focus event listener to detect when calendar buttons get focus
    root.addEventListener('focusin', handleFocusIn);
    
    return () => {
      root.removeEventListener('focusin', handleFocusIn);
    };
  }, [handleFocusIn]);
  
  return (
    <div 
      ref={rootRef} 
      className="calendar-wrapper" 
      data-no-aria-hidden="true"
    >
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-3 calendar-custom", className)}
        locale={pt}
        modifiers={modifiers}
        modifiersStyles={modifiersStyles}
        classNames={{
          months: "flex flex-col sm:flex-row gap-2",
          month: "flex flex-col gap-4",
          caption: "flex justify-center pt-1 relative items-center w-full",
          caption_label: "text-sm font-medium",
          nav: "flex items-center gap-1",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "size-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-x-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-8 font-bold text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "relative p-0 text-center text-sm",
          day: cn(
            buttonVariants({ variant: "outline" }),
            "size-8 p-0 font-normal aria-selected:opacity-100 border-none outline-none"
          ),
          day_range_start:
            "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
          day_range_end:
            "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground aria-selected:text-muted-foreground",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          IconLeft: ({ className, ...props }) => (
            <ChevronLeft className={cn("size-4", className)} {...props} />
          ),
          IconRight: ({ className, ...props }) => (
            <ChevronRight className={cn("size-4", className)} {...props} />
          ),
        }}
        {...props}
      />
    </div>
  )
}

export { Calendar }
