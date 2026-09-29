'use client';

import React from 'react';
import { Search, X, ArrowUpDown, RotateCcw } from 'lucide-react';
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
    <div className="pay-alliance-filters">
      {/* Top Search, Intent & Sort Row */}
      <div className="pay-alliance-filters__top">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="pay-alliance-filters__search-form">
          <Search className="pay-alliance-filters__search-icon" size={16} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by location, neighborhood, or title..."
            className="pay-alliance-filters__search-input"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="pay-alliance-filters__search-clear"
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </form>

        {/* Intent Segmented Control */}
        <div className="pay-alliance-filters__segmented">
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
                className={`pay-alliance-filters__tab ${
                  isSelected ? 'pay-alliance-filters__tab--active' : ''
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sort Select */}
        <div className="pay-alliance-filters__select-wrapper">
          <select
            value={query.sortBy || 'newest'}
            onChange={(e) =>
              onChange({
                sortBy: e.target.value as 'newest' | 'price_asc' | 'price_desc',
                page: 1,
              })
            }
            className="pay-alliance-filters__select"
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
          <ArrowUpDown className="pay-alliance-filters__select-icon" size={14} />
        </div>
      </div>

      {/* Bottom Quick Filters Row */}
      <div className="pay-alliance-filters__bottom">
        {/* Property Type Dropdown */}
        <select
          value={query.propertyType || ''}
          onChange={(e) =>
            onChange({ propertyType: e.target.value || undefined, page: 1 })
          }
          className="pay-alliance-filters__chip-select"
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
          className="pay-alliance-filters__chip-select"
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
            className="pay-alliance-filters__reset-btn"
          >
            <RotateCcw size={13} />
            <span>Reset filters ({activeFilterCount})</span>
          </button>
        )}
      </div>
    </div>
  );
};
