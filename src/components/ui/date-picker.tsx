import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { format, setMonth, setYear } from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { DayPicker, type Matcher } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface DatePickerProps {
  date?: Date;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Matcher | Matcher[];
  fromYear?: number;
  toYear?: number;
  align?: "start" | "center" | "end";
  className?: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const DatePicker: React.FC<DatePickerProps> = ({
  date,
  onSelect,
  placeholder = "Pick a date",
  disabled = false,
  minDate,
  maxDate,
  disabledDates,
  align = "start",
  className,
}) => {
  const [open, setOpen] = React.useState(false);
  const [month, setMonthState] = React.useState<Date>(date ?? new Date());

  const computedDisabled = React.useMemo<Matcher | Matcher[] | undefined>(() => {
    const matchers: Matcher[] = [];
    if (minDate && !isNaN(minDate.getTime())) {
      const minMidnight = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate(), 0, 0, 0, 0);
      matchers.push({ before: minMidnight });
    }
    if (maxDate && !isNaN(maxDate.getTime())) {
      const maxMidnight = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate(), 23, 59, 59, 999);
      matchers.push({ after: maxMidnight });
    }
    if (disabledDates) {
      if (Array.isArray(disabledDates)) {
        matchers.push(...disabledDates);
      } else {
        matchers.push(disabledDates);
      }
    }
    return matchers.length > 0 ? matchers : undefined;
  }, [minDate, maxDate, disabledDates]);

  const isTodayDisabled = Boolean(
    (minDate && !isNaN(minDate.getTime()) && new Date() < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate(), 0, 0, 0, 0)) ||
    (maxDate && !isNaN(maxDate.getTime()) && new Date() > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate(), 23, 59, 59, 999))
  );

  React.useEffect(() => {
    if (date && !isNaN(date.getTime())) {
      setMonthState(date);
    }
  }, [date]);

  const [yearInput, setYearInput] = React.useState<string>(
    month.getFullYear().toString()
  );

  React.useEffect(() => {
    setYearInput(month.getFullYear().toString());
  }, [month]);

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setYearInput(val);
    const num = parseInt(val, 10);
    // Allow typing any realistic historical or future year without fixed limit
    if (!isNaN(num) && num >= 1900 && num <= 2100) {
      setMonthState((prev) => setYear(prev, num));
    }
  };

  const handleYearBlur = () => {
    const num = parseInt(yearInput, 10);
    if (isNaN(num) || num < 1900 || num > 2100) {
      setYearInput(month.getFullYear().toString());
    }
  };

  const jumpYear = (delta: number) => {
    setMonthState((prev) => {
      const nextY = prev.getFullYear() + delta;
      return setYear(prev, nextY);
    });
  };

  const jumpMonth = (delta: number) => {
    setMonthState((prev) => {
      let m = prev.getMonth() + delta;
      let y = prev.getFullYear();
      if (m < 0) {
        m = 11;
        y -= 1;
      } else if (m > 11) {
        m = 0;
        y += 1;
      }
      return setYear(setMonth(prev, m), y);
    });
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between text-left font-normal h-10 text-xs font-sans bg-white border border-slate-300 text-slate-900 shadow-2xs hover:bg-slate-50 hover:border-slate-400 transition-colors px-3",
            !date && "text-slate-400",
            className
          )}
        >
          <span className="truncate">
            {date && !isNaN(date.getTime()) ? (
              format(date, "PPP")
            ) : (
              <span>{placeholder}</span>
            )}
          </span>
          <CalendarIcon className="ml-2 h-4 w-4 size-4 shrink-0 text-slate-400" />
        </Button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={4}
          avoidCollisions={true}
          collisionPadding={16}
          className="z-[60] w-auto rounded-xl border border-slate-200 bg-white p-3.5 text-slate-900 shadow-xl outline-none"
        >
          {/* Header Controls: ChevronsLeft (Year -1), ChevronLeft (Month -1), Month Select, Year Input, ChevronRight (Month +1), ChevronsRight (Year +1) */}
          <div className="mb-3 flex items-center justify-between gap-1 px-0.5">
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                onClick={() => jumpYear(-1)}
                title="Previous Year"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                onClick={() => jumpMonth(-1)}
                title="Previous Month"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-1.5 flex-1 justify-center">
              {/* Month Selector */}
              <select
                aria-label="Select Month"
                value={month.getMonth()}
                onChange={(e) =>
                  setMonthState((prev) => setMonth(prev, Number(e.target.value)))
                }
                className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer hover:border-slate-300"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Editable Year Field - Unrestricted Keyboard Typing */}
              <input
                type="number"
                aria-label="Year"
                value={yearInput}
                onChange={handleYearChange}
                onBlur={handleYearBlur}
                className="h-7 w-16 rounded-md border border-slate-200 bg-white px-1.5 text-center text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary hover:border-slate-300"
                placeholder="YYYY"
              />
            </div>

            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                onClick={() => jumpMonth(1)}
                title="Next Month"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                onClick={() => jumpYear(1)}
                title="Next Year"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <DayPicker
            mode="single"
            selected={date}
            month={month}
            onMonthChange={setMonthState}
            disabled={computedDisabled}
            onSelect={(nextDate: Date | undefined) => {
              if (nextDate) {
                if (minDate && !isNaN(minDate.getTime())) {
                  const min = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
                  if (nextDate < min) return;
                }
                if (maxDate && !isNaN(maxDate.getTime())) {
                  const max = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
                  if (nextDate > max) return;
                }
              }
              onSelect(nextDate);
              if (nextDate) setOpen(false);
            }}
            showOutsideDays
            className="p-0 border-0"
            classNames={{
              month_caption: "hidden",
              nav: "hidden",
            }}
          />

          {/* Quick Clear / Today footer */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                onSelect(undefined);
                setOpen(false);
              }}
              className="text-slate-500 hover:text-red-600 font-medium transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={isTodayDisabled}
              onClick={() => {
                if (isTodayDisabled) return;
                const today = new Date();
                setMonthState(today);
                onSelect(today);
                setOpen(false);
              }}
              className={cn(
                "font-semibold",
                isTodayDisabled
                  ? "text-slate-300 cursor-not-allowed pointer-events-none"
                  : "text-primary hover:underline"
              )}
            >
              Today
            </button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};

export default DatePicker;
