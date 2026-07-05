"use client";

import { type ReactNode } from 'react'
import { Search, ChevronDown, Filter } from 'lucide-react'

interface Option {
  label: string
  value: string
}

interface FilterConfig {
  label: string
  value: string
  onChange: (value: string) => void
  options: Option[]
}

interface SortConfig {
  value: string
  onChange: (value: string) => void
  options: Option[]
}

interface AdminTableProps<T> {
  headers: string[]
  data: T[]
  renderRow: (item: T, index: number) => ReactNode
  // Search
  onSearchChange?: (value: string) => void
  searchTerm?: string
  searchPlaceholder?: string
  // Filters (up to 3 as requested)
  filters?: FilterConfig[]
  // Sorting
  sortConfig?: SortConfig
  isLoading?: boolean
  emptyMessage?: string
}

/**
 * A highly scalable and reusable Admin Table component.
 * Enhanced for the SmartMove aesthetic.
 */
export default function AdminTable<T>({
  headers,
  data,
  renderRow,
  onSearchChange,
  searchTerm = "",
  searchPlaceholder = "SEARCH PROTOCOL...",
  filters = [],
  sortConfig,
  isLoading,
  emptyMessage = "No matching records synchronization found."
}: AdminTableProps<T>) {

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-500">
      {/* ── TOOLBAR ────────────────────────────────────────── */}
      {(onSearchChange || filters.length > 0 || sortConfig) && (
        <div className="card-shell flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 dark:border-slate-800">

          {/* Search Field */}
          {onSearchChange && (
            <div className="relative flex-1 group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                size={16}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-4 py-2.5 text-xs font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:opacity-40"
              />
            </div>
          )}

          {/* Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-3">
            {filters.slice(0, 3).map((filter, idx) => (
              <div key={idx} className="relative group min-w-35">
                <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 scale-75 opacity-50" size={14} />
                <select
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="w-full appearance-none bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 cursor-pointer focus:outline-none focus:border-blue-500/50 transition-all hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <option value="">{filter.label}</option>
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" size={12} />
              </div>
            ))}

            {sortConfig && (
              <div className="relative group min-w-40">
                <select
                  value={sortConfig.value}
                  onChange={(e) => sortConfig.onChange(e.target.value)}
                  className="w-full appearance-none bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-xl px-5 py-2.5 pr-10 text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 cursor-pointer focus:outline-none focus:border-blue-500/50 transition-all hover:bg-blue-100 dark:hover:bg-blue-900/20"
                >
                  {sortConfig.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500" size={12} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TABLE ─────────────────────────────────────────── */}
      <div className="card-shell overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                {headers.map((header, idx) => (
                  <th
                    key={idx}
                    className={`px-6 py-4 font-bold ${header.toLowerCase().includes('actions') ? 'text-center' : ''}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={headers.length} className="px-6 py-20 text-center">
                    <div className="font-mono text-xl tracking-[0.3em] opacity-40 animate-pulse text-blue-500">
                      SYNCHRONIZING TERMINAL...
                    </div>
                  </td>
                </tr>
              ) : data.length > 0 ? (
                data.map((item, index) => renderRow(item, index))
              ) : (
                <tr>
                  <td colSpan={headers.length} className="px-6 py-20 text-center">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 opacity-60">
                      {emptyMessage}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
