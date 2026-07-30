"use client";

import { useLanguage } from "@/components/LanguageContext";
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
    <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
      {/* Category */}
      <div className="flex gap-4 justify-center md:justify-start w-full md:w-auto">
        {CATEGORY_FILTERS.map((value) => (
          <button
            key={value}
            onClick={() => onCategoryChange(value)}
            aria-pressed={category === value}
            className={`px-6 py-2 rounded-full font-bold transition-all duration-300 ${
              category === value
                ? "bg-orange-500 text-white border-transparent"
                : "bg-white text-gray-600 hover:text-orange-500 hover:bg-orange-50 border border-black/10"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="flex gap-2 p-1.5 bg-white rounded-full border border-black/10 ml-auto mr-auto md:mr-0 w-full md:w-auto overflow-x-auto custom-scrollbar">
        {STATUS_FILTERS.map((value) => (
          <button
            key={value}
            onClick={() => onStatusChange(value)}
            aria-pressed={status === value}
            className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${
              status === value
                ? "bg-orange-500 text-white"
                : "text-gray-500 hover:text-orange-500 hover:bg-orange-50"
            }`}
          >
            <div className="flex items-center gap-2">
              {value !== "All" && (
                <div
                  className={`w-2 h-2 rounded-full ${
                    value === "Public"
                      ? "bg-green-500 shadow-[0_0_8px_#22c55e]"
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
