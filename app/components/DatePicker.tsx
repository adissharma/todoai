'use client';

import React, { useState } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface DatePickerProps {
    onSelect: (date: Date) => void;
    onClose?: () => void;
    minDate?: Date;
}

export function DatePicker({ onSelect, onClose }: DatePickerProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-zinc-200">
                    {format(currentMonth, 'MMMM yyyy')}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={prevMonth}
                        className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        return (
            <div className="grid grid-cols-7 mb-2">
                {days.map(day => (
                    <div key={day} className="text-center text-[10px] font-medium text-zinc-500 uppercase">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const days = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div className="grid grid-cols-7 gap-1">
                {days.map(day => {
                    const isSelectable = true; // Add logic if needed
                    const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                    const isCurrentMonth = isSameMonth(day, monthStart);

                    return (
                        <button
                            key={day.toString()}
                            onClick={() => {
                                setSelectedDate(day);
                                onSelect(day);
                            }}
                            className={cn(
                                "h-7 w-7 rounded-full flex items-center justify-center text-xs transition-colors relative",
                                !isCurrentMonth && "text-zinc-600",
                                isCurrentMonth && !isSelected && !isToday(day) && "text-zinc-300 hover:bg-zinc-800",
                                isToday(day) && !isSelected && "text-indigo-400 font-bold bg-indigo-500/10",
                                isSelected && "bg-indigo-600 text-white font-semibold"
                            )}
                        >
                            {format(day, 'd')}
                            {/* Dot indicator for today if not selected */}
                            {isToday(day) && !isSelected && (
                                <div className="absolute bottom-1 w-0.5 h-0.5 bg-indigo-400 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="p-4 w-64 bg-zinc-900 rounded-lg shadow-xl border border-zinc-800 animate-in fade-in zoom-in-95 duration-100">
            {renderHeader()}
            {renderDays()}
            {renderCells()}

            <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <button
                    onClick={onClose}
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
