'use client';

import React from 'react';
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import type {
  PublicAllianceMarketplaceQuery,
  AllianceListingIntent,
} from '../types/alliance.types';

interface AllianceFilterBarProps {
  query: PublicAllianceMarketplaceQuery;
  onChange: (updated: Partial<PublicAllianceMarketplaceQuery>) => void;
  onReset: () => void;
}

export const AllianceFilterBar: React.FC<AllianceFilterBarProps> = ({
  query,
  onChange,
  onReset,
}) => {
  const [searchInput, setSearchInput] = React.useState(query.search || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange({ search: searchInput.trim() || undefined, page: 1 });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    onChange({ search: undefined, page: 1 });
  };

  const activeFilterCount = [
    query.intent,
    query.propertyType,
    query.city,
    query.minPrice,
    query.maxPrice,
    query.bedrooms,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Top Search & Intent Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex flex-1 items-center min-w-[240px]"
        >
          <Search className="absolute left-3.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by location, neighborhood, or title..."
            className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-10 text-sm text-neutral-900 placeholder-neutral-400 transition-all focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-500"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        {/* Intent Segmented Control */}
        <div className="inline-flex rounded-xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
          {(
            [
              { label: 'All', value: undefined },
              { label: 'For Rent', value: 'RENT' as AllianceListingIntent },
              { label: 'For Sale', value: 'SALE' as AllianceListingIntent },
            ] as const
          ).map((tab) => {
            const isSelected = query.intent === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => onChange({ intent: tab.value, page: 1 })}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sort Select */}
        <div className="relative">
          <select
            value={query.sortBy || 'newest'}
            onChange={(e) =>
              onChange({
                sortBy: e.target.value as 'newest' | 'price_asc' | 'price_desc',
                page: 1,
              })
            }
            className="appearance-none rounded-xl border border-neutral-200 bg-white py-2.5 pl-3.5 pr-8 text-xs font-medium text-neutral-700 shadow-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
          <ArrowUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
        </div>
      </div>

      {/* Quick Filter Pills Row */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        {/* Property Type Dropdown */}
        <select
          value={query.propertyType || ''}
          onChange={(e) =>
            onChange({ propertyType: e.target.value || undefined, page: 1 })
          }
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
        >
          <option value="">All Property Types</option>
          <option value="Flat / Apartment">Flat / Apartment</option>
          <option value="Duplex">Duplex</option>
          <option value="Terrace">Terrace</option>
          <option value="Detached House">Detached House</option>
          <option value="Commercial">Commercial / Office</option>
          <option value="Studio">Studio</option>
        </select>

        {/* Bedrooms Dropdown */}
        <select
          value={query.bedrooms !== undefined ? String(query.bedrooms) : ''}
          onChange={(e) =>
            onChange({
              bedrooms: e.target.value ? Number(e.target.value) : undefined,
              page: 1,
            })
          }
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
        >
          <option value="">Any Bedrooms</option>
          <option value="1">1+ Bedrooms</option>
          <option value="2">2+ Bedrooms</option>
          <option value="3">3+ Bedrooms</option>
          <option value="4">4+ Bedrooms</option>
          <option value="5">5+ Bedrooms</option>
        </select>

        {/* Reset Filters CTA */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reset filters ({activeFilterCount})</span>
          </button>
        )}
      </div>
    </div>
  );
};
