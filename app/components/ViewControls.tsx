'use client';

import { Fragment } from 'react';
import { Listbox, Transition, Tab } from '@headlessui/react';
import { AlignJustify, Kanban, Calendar as CalendarIcon, ChevronDown, Check, Filter, ArrowUpDown, Layers } from 'lucide-react';

export type LayoutType = 'list' | 'board' | 'calendar';
export type GroupingType = 'none' | 'status' | 'priority' | 'category';
export type SortType = 'default' | 'date' | 'priority' | 'alphabetical' | 'manual';

export interface FilterState {
    priority: 'all' | '1' | '2' | '3' | '4';
    date: 'all' | 'today' | 'upcoming' | 'overdue';
    label: string; // 'all' or specific tag
}

interface ViewControlsProps {
    layout: LayoutType;
    onLayoutChange: (layout: LayoutType) => void;

    grouping: GroupingType;
    onGroupingChange: (grouping: GroupingType) => void;

    sorting: SortType;
    onSortingChange: (sort: SortType) => void;

    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;

    availableLabels?: string[];
}

export function ViewControls({
    layout, onLayoutChange,
    grouping, onGroupingChange,
    sorting, onSortingChange,
    filters, onFilterChange,
    availableLabels = []
}: ViewControlsProps) {

    const layouts = [
        { id: 'list', name: 'List', icon: AlignJustify },
        { id: 'board', name: 'Board', icon: Kanban },
        { id: 'calendar', name: 'Calendar', icon: CalendarIcon },
    ];

    const groupingOptions = [
        { id: 'none', name: 'None' },
        { id: 'status', name: 'Status' },
        { id: 'priority', name: 'Priority' },
        { id: 'category', name: 'Category' },
    ];

    const sortOptions = [
        { id: 'default', name: 'Default' },
        { id: 'manual', name: 'Manual' },
        { id: 'date', name: 'Due Date' },
        { id: 'priority', name: 'Priority' },
        { id: 'alphabetical', name: 'Alphabetical' },
    ];

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-6 w-full max-w-xs animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between text-zinc-400">
                <h3 className="text-sm font-semibold text-zinc-200">View Options</h3>
                <button
                    onClick={() => {
                        onLayoutChange('list');
                        onGroupingChange('none');
                        onSortingChange('default');
                        onFilterChange({ priority: 'all', date: 'all', label: 'all' });
                    }}
                    className="text-xs hover:text-white transition-colors"
                >
                    Reset all
                </button>
            </div>

            {/* Layout Toggle - using Headless UI Tab or just buttons styled like screenshot */}
            <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    Layout
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                </label>
                <div className="grid grid-cols-3 gap-2 bg-zinc-950/50 p-1 rounded-lg border border-zinc-800/50">
                    {layouts.map((l) => (
                        <button
                            key={l.id}
                            onClick={() => onLayoutChange(l.id as LayoutType)}
                            className={`flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-md text-xs font-medium transition-all ${layout === l.id
                                ? 'bg-white text-black shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                                }`}
                        >
                            <l.icon size={16} />
                            {l.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Sort & Grouping */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-zinc-200 font-medium text-sm">
                    <ArrowUpDown size={14} className="text-zinc-500" /> Sort
                </div>

                <ControlRow label="Grouping">
                    <SimpleSelect
                        value={grouping}
                        onChange={(v) => onGroupingChange(v as GroupingType)}
                        options={groupingOptions}
                    />
                </ControlRow>

                <ControlRow label="Sorting">
                    <SimpleSelect
                        value={sorting}
                        onChange={(v) => onSortingChange(v as SortType)}
                        options={sortOptions}
                    />
                </ControlRow>
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Filters */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-zinc-200 font-medium text-sm">
                    <Filter size={14} className="text-zinc-500" /> Filter
                </div>

                <ControlRow label="Priority">
                    <SimpleSelect
                        value={filters.priority}
                        onChange={(v) => onFilterChange({ ...filters, priority: v as any })}
                        options={[
                            { id: 'all', name: 'All' },
                            { id: '1', name: 'High (P1)' },
                            { id: '2', name: 'Medium (P2)' },
                            { id: '3', name: 'Low (P3)' },
                            { id: '4', name: 'None (P4)' },
                        ]}
                    />
                </ControlRow>

                <ControlRow label="Date">
                    <SimpleSelect
                        value={filters.date}
                        onChange={(v) => onFilterChange({ ...filters, date: v as any })}
                        options={[
                            { id: 'all', name: 'All' },
                            { id: 'today', name: 'Today' },
                            { id: 'upcoming', name: 'Upcoming' },
                            { id: 'overdue', name: 'Overdue' },
                        ]}
                    />
                </ControlRow>

                <ControlRow label="Label">
                    <SimpleSelect
                        value={filters.label}
                        onChange={(v) => onFilterChange({ ...filters, label: v })}
                        options={[
                            { id: 'all', name: 'All' },
                            ...availableLabels.map(l => ({ id: l, name: l }))
                        ]}
                    />
                </ControlRow>
            </div>
        </div>
    );
}

function ControlRow({ label, children }: { label: string, children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[80px_1fr] items-center gap-2">
            <span className="text-sm text-zinc-500">{label}</span>
            {children}
        </div>
    );
}

function SimpleSelect({ value, onChange, options }: { value: string, onChange: (val: string) => void, options: { id: string, name: string }[] }) {
    const selected = options.find(o => o.id === value);

    return (
        <Listbox value={value} onChange={onChange}>
            <div className="relative">
                <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white py-1.5 pl-3 pr-8 text-left border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm text-zinc-900 shadow-sm hover:bg-zinc-50">
                    <span className="block truncate">{selected?.name || value}</span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronDown className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                    </span>
                </Listbox.Button>
                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        {options.map((option) => (
                            <Listbox.Option
                                key={option.id}
                                className={({ active }) =>
                                    `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-indigo-100 text-indigo-900' : 'text-zinc-900'
                                    }`
                                }
                                value={option.id}
                            >
                                {({ selected }) => (
                                    <>
                                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                            {option.name}
                                        </span>
                                        {selected ? (
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                                <Check className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                        ) : null}
                                    </>
                                )}
                            </Listbox.Option>
                        ))}
                    </Listbox.Options>
                </Transition>
            </div>
        </Listbox>
    );
}
