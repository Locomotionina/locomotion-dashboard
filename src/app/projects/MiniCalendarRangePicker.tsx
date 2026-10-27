"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  RotateCcw,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface MiniCalendarRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (startDate: string, endDate: string) => void;
  onClear: () => void;
}

export function MiniCalendarRangePicker({
  startDate,
  endDate,
  onChange,
  onClear,
}: MiniCalendarRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize viewing month from startDate, or current date (Oct 2026)
  const initialDate = startDate ? new Date(startDate) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-indexed

  // Internal draft state
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);

  // Synchronize when external props change
  useEffect(() => {
    setDraftStart(startDate);
    setDraftEnd(endDate);
  }, [startDate, endDate]);

  // Click outside listener to close popup
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Calendar math
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Days in current month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // First day of current month (0: Sun, 1: Mon, ...)
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const formatIso = (year: number, month: number, day: number) => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  const handleDayClick = (day: number) => {
    const clickedIso = formatIso(viewYear, viewMonth, day);

    if (!draftStart || (draftStart && draftEnd)) {
      // Start a fresh range selection
      setDraftStart(clickedIso);
      setDraftEnd("");
    } else if (draftStart && !draftEnd) {
      if (clickedIso >= draftStart) {
        setDraftEnd(clickedIso);
      } else {
        // Clicked a date earlier than start, swap to make it the new start
        setDraftStart(clickedIso);
      }
    }
  };

  const applyRange = () => {
    onChange(draftStart, draftEnd);
    setIsOpen(false);
  };

  const handleReset = () => {
    setDraftStart("");
    setDraftEnd("");
    onClear();
    setIsOpen(false);
  };

  const setPreset = (start: string, end: string) => {
    setDraftStart(start);
    setDraftEnd(end);
    onChange(start, end);
    setIsOpen(false);
  };

  const handleThisMonth = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const lastD = new Date(y, m + 1, 0).getDate();
    setPreset(formatIso(y, m, 1), formatIso(y, m, lastD));
  };

  const handleNextMonth = () => {
    const now = new Date();
    const y = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const m = (now.getMonth() + 1) % 12;
    const lastD = new Date(y, m + 1, 0).getDate();
    setPreset(formatIso(y, m, 1), formatIso(y, m, lastD));
  };

  const handleNext30Days = () => {
    const now = new Date();
    const startIso = formatIso(now.getFullYear(), now.getMonth(), now.getDate());
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const endIso = formatIso(future.getFullYear(), future.getMonth(), future.getDate());
    setPreset(startIso, endIso);
  };

  const hasSelectedRange = Boolean(startDate || endDate);

  return (
    <div className="relative z-40 inline-block" ref={containerRef}>
      {/* Trigger Button */}
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={`h-8 text-xs gap-2 border-border/80 transition-all ${
            hasSelectedRange
              ? "bg-purple-500/10 border-purple-500/40 text-purple-600 dark:text-purple-300 font-semibold"
              : "hover:bg-secondary text-foreground"
          }`}
        >
          <CalendarIcon className="h-3.5 w-3.5 text-purple-500" />
          <span>
            {startDate && endDate
              ? `${formatDate(startDate)} – ${formatDate(endDate)}`
              : startDate
              ? `From: ${formatDate(startDate)}`
              : endDate
              ? `Until: ${formatDate(endDate)}`
              : "Pick Date Range..."}
          </span>
        </Button>

        {hasSelectedRange && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-400"
            title="Clear Range"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Pop-up Mini Calendar Card */}
      {isOpen && (
        <div className="absolute left-0 mt-2 z-[999] w-84 rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-xl p-4 shadow-2xl space-y-3 animate-fade-in text-foreground ring-1 ring-border/50">
          {/* Calendar Header with Month/Year Navigation */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={prevMonth}
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={nextMonth}
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground">
            {dayNames.map((d) => (
              <span key={d} className="py-0.5">{d}</span>
            ))}
          </div>

          {/* Month Day Cells */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank filler cells for offset */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="h-7 w-7" />
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const iso = formatIso(viewYear, viewMonth, day);
              const isStart = draftStart === iso;
              const isEnd = draftEnd === iso;
              const isInRange =
                draftStart &&
                draftEnd &&
                iso > draftStart &&
                iso < draftEnd;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`h-7 w-7 text-[11px] rounded-lg flex items-center justify-center font-medium transition-colors ${
                    isStart || isEnd
                      ? "bg-purple-600 text-white font-bold shadow-xs"
                      : isInRange
                      ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold"
                      : "hover:bg-secondary/80 text-foreground"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Manual Input Fields for Keyboard Entry */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px]">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                value={draftStart}
                onChange={(e) => setDraftStart(e.target.value)}
                className="h-7 text-[11px] px-1.5"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">End Date</Label>
              <Input
                type="date"
                value={draftEnd}
                onChange={(e) => setDraftEnd(e.target.value)}
                className="h-7 text-[11px] px-1.5"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1 pt-1">
            <button
              type="button"
              onClick={handleThisMonth}
              className="text-[10px] px-2 py-0.5 rounded-md bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="text-[10px] px-2 py-0.5 rounded-md bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground"
            >
              Next Month
            </button>
            <button
              type="button"
              onClick={handleNext30Days}
              className="text-[10px] px-2 py-0.5 rounded-md bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground"
            >
              Next 30 Days
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 text-xs text-muted-foreground hover:text-rose-400 gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={applyRange}
              disabled={!draftStart && !draftEnd}
              className="h-7 text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              <Check className="h-3 w-3" />
              <span>Apply Range</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
