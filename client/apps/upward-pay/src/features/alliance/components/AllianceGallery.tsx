'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { PublicAllianceListingMedia } from '../types/alliance.types';
import {
  getAllianceListingMediaList,
  ALLIANCE_REAL_ESTATE_PLACEHOLDERS,
} from '../utils/allianceImages';

interface AllianceGalleryProps {
  media?: PublicAllianceListingMedia[];
  title: string;
  uuid?: string;
}

export const AllianceGallery: React.FC<AllianceGalleryProps> = ({ media, title, uuid }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const effectiveMedia = getAllianceListingMediaList({ media, uuid: uuid || title });
  const totalPhotos = effectiveMedia.length;
  const currentPhoto = effectiveMedia[selectedIndex] || effectiveMedia[0];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalPhotos - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev < totalPhotos - 1 ? prev + 1 : 0));
  };

  return (
    <div className="pay-alliance-gallery">
      {/* Main Image Container */}
      <div
        onClick={() => setIsLightboxOpen(true)}
        className="pay-alliance-gallery__main"
      >
        <img
          src={currentPhoto?.publicUrl}
          alt={`${title} - Photo ${selectedIndex + 1}`}
          className="pay-alliance-gallery__main-img"
          onError={(e) => {
            const target = e.currentTarget;
            target.onerror = null;
            target.src = ALLIANCE_REAL_ESTATE_PLACEHOLDERS[selectedIndex % ALLIANCE_REAL_ESTATE_PLACEHOLDERS.length];
          }}
        />

        {/* Navigation arrows (if > 1 photo) */}
        {totalPhotos > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="pay-alliance-gallery__nav-btn pay-alliance-gallery__nav-btn--prev"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="pay-alliance-gallery__nav-btn pay-alliance-gallery__nav-btn--next"
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Photo Counter Pill */}
        <div className="pay-alliance-gallery__counter">
          {selectedIndex + 1} / {totalPhotos}
        </div>
      </div>

      {/* Thumbnails Row */}
      {totalPhotos > 1 && (
        <div className="pay-alliance-gallery__thumbs">
          {effectiveMedia.map((item, idx) => (
            <button
              key={item.uuid || idx}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`pay-alliance-gallery__thumb ${
                selectedIndex === idx ? 'pay-alliance-gallery__thumb--active' : ''
              }`}
            >
              <img
                src={item.publicUrl}
                alt={`Thumbnail ${idx + 1}`}
                className="pay-alliance-gallery__thumb-img"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = ALLIANCE_REAL_ESTATE_PLACEHOLDERS[idx % ALLIANCE_REAL_ESTATE_PLACEHOLDERS.length];
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="pay-alliance-modal-backdrop"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="pay-alliance-gallery__nav-btn"
            style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 10001 }}
            aria-label="Close fullscreen view"
          >
            <X size={20} />
          </button>

          <div
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentPhoto?.publicUrl}
              alt={`${title} - Zoomed Photo`}
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = ALLIANCE_REAL_ESTATE_PLACEHOLDERS[selectedIndex % ALLIANCE_REAL_ESTATE_PLACEHOLDERS.length];
              }}
              style={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                borderRadius: '16px',
                objectFit: 'contain',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              }}
            />
            {totalPhotos > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="pay-alliance-gallery__nav-btn pay-alliance-gallery__nav-btn--prev"
                  style={{ left: '-20px' }}
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="pay-alliance-gallery__nav-btn pay-alliance-gallery__nav-btn--next"
                  style={{ right: '-20px' }}
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
