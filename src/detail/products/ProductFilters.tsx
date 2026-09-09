"use client";

import { useLanguage } from "@/state/LanguageContext";
import {
  CATEGORY_FILTERS,
  STATUS_FILTERS,
  statusLabel,
  type CategoryFilter,
  type StatusFilter,
} from "./catalog";

type Props = {
  category: CategoryFilter;
  status: StatusFilter;
  onCategoryChange: (value: CategoryFilter) => void;
  onStatusChange: (value: StatusFilter) => void;
};

export default function ProductFilters({
  category,
  status,
  onCategoryChange,
  onStatusChange,
}: Props) {
  const { language } = useLanguage();

  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 sm:gap-6">
      {/* Category */}
      <div className="flex p-1.5 bg-white rounded-full border border-black/5 shadow-sm flex-wrap gap-1 justify-center md:justify-start w-full md:w-auto">
        {CATEGORY_FILTERS.map((value) => (
          <button
            key={value}
            onClick={() => onCategoryChange(value)}
            aria-pressed={category === value}
            className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${category === value
                ? "bg-orange-600 text-white shadow-sm"
                : "text-gray-700 hover:text-orange-600 hover:bg-orange-50/70"
              }`}
          >
            {value}
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="flex gap-1.5 p-1.5 bg-white rounded-full border border-black/5 shadow-sm ml-auto mr-auto md:mr-0 w-full md:w-auto overflow-x-auto custom-scrollbar">
        {STATUS_FILTERS.map((value) => (
          <button
            key={value}
            onClick={() => onStatusChange(value)}
            aria-pressed={status === value}
            className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${status === value
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-950 hover:bg-gray-100/70"
              }`}
          >
            <div className="flex items-center gap-1.5">
              {value !== "All" && (
                <span
                  className={`w-2 h-2 rounded-full ${value === "Public"
                      ? "bg-emerald-500 shadow-[0_0_8px_#22c55e]"
                      : "bg-orange-500 shadow-[0_0_8px_#f97316]"
                    }`}
                />
              )}
              <span>{statusLabel(value, language)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
