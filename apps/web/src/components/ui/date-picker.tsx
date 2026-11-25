import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { format, setMonth, setYear } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

export interface DatePickerProps {
  date?: Date;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
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
  fromYear = 2020,
  toYear = 2030,
  className,
}) => {
  const [open, setOpen] = React.useState(false);
  const [month, setMonthState] = React.useState<Date>(date ?? new Date());

  React.useEffect(() => {
    if (date) {
      setMonthState(date);
    }
  }, [date]);

  const years = React.useMemo(() => {
    const arr: number[] = [];
    for (let y = fromYear; y <= toYear; y++) {
      arr.push(y);
    }
    return arr;
  }, [fromYear, toYear]);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-[240px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon
            className="mr-2 h-4 w-4 size-4 shrink-0"
            aria-hidden="true"
          />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 w-auto rounded-md border bg-popover p-3 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        >
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <select
              aria-label="Select Month"
              value={month.getMonth()}
              onChange={(e) =>
                setMonthState((prev) => setMonth(prev, Number(e.target.value)))
              }
              className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            <select
              aria-label="Select Year"
              value={month.getFullYear()}
              onChange={(e) =>
                setMonthState((prev) => setYear(prev, Number(e.target.value)))
              }
              className="h-8 rounded-md border border-input bg-background px-2 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <DayPicker
            mode="single"
            selected={date}
            month={month}
            onMonthChange={setMonthState}
            onSelect={(nextDate) => {
              onSelect(nextDate);
              if (nextDate) setOpen(false);
            }}
            showOutsideDays
            className="p-1"
            classNames={{
              months:
                "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-3",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-xs font-semibold",
              nav: "space-x-1 flex items-center",
              nav_button: cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100",
              ),
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell:
                "text-muted-foreground rounded-md w-8 font-normal text-[0.75rem]",
              row: "flex w-full mt-1",
              cell: "h-8 w-8 text-center text-xs p-0 relative focus-within:relative focus-within:z-20",
              day: cn(
                buttonVariants({ variant: "ghost" }),
                "h-8 w-8 p-0 font-normal aria-selected:opacity-100",
              ),
              day_selected:
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground font-semibold",
              day_outside: "text-muted-foreground opacity-40",
              day_disabled: "text-muted-foreground opacity-40",
            }}
            components={{
              IconLeft: () => (
                <ChevronLeft className="h-4 w-4 size-4 shrink-0" />
              ),
              IconRight: () => (
                <ChevronRight className="h-4 w-4 size-4 shrink-0" />
              ),
            }}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
