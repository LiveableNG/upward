'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, X } from 'lucide-react';
import type { PublicAllianceListingMedia } from '../types/alliance.types';
import { getAllianceListingMediaList } from '../utils/allianceImages';

interface AllianceGalleryProps {
  media?: PublicAllianceListingMedia[];
  title: string;
}

export const AllianceGallery: React.FC<AllianceGalleryProps> = ({ media, title }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const effectiveMedia = getAllianceListingMediaList({ media, uuid: title });
  const currentPhoto = effectiveMedia[selectedIndex] || effectiveMedia[0];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="relative flex flex-col gap-3">
      {/* Main Image Container */}
      <div
        onClick={() => setIsLightboxOpen(true)}
        className="group relative aspect-[16/10] w-full cursor-pointer overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800 md:aspect-[16/9]"
      >
        <img
          src={currentPhoto?.publicUrl}
          alt={`${title} - Photo ${selectedIndex + 1}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Navigation arrows (if > 1 photo) */}
        {media.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-900/60 text-white backdrop-blur-md transition-transform hover:scale-110"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-900/60 text-white backdrop-blur-md transition-transform hover:scale-110"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Photo Counter Pill */}
        <div className="absolute bottom-3 right-3 rounded-full bg-neutral-900/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
          {selectedIndex + 1} / {media.length}
        </div>
      </div>

      {/* Thumbnails Row */}
      {media.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {media.map((item, idx) => (
            <button
              key={item.uuid}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`relative aspect-[4/3] h-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                selectedIndex === idx
                  ? 'border-neutral-900 shadow-sm dark:border-white'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={item.publicUrl}
                alt={`Thumbnail ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 text-white transition-colors hover:bg-neutral-700"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="relative max-h-[85vh] max-w-[90vw]">
            <img
              src={currentPhoto?.publicUrl}
              alt={`${title} - Zoomed Photo`}
              className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
            />
            {media.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-900/80 text-white backdrop-blur-md hover:bg-neutral-900"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-900/80 text-white backdrop-blur-md hover:bg-neutral-900"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
