import React from 'react';
import Link from 'next/link';
import {
  MapPin,
  Bed,
  Bath,
  ShieldCheck,
  Star,
  Image as ImageIcon,
  ArrowUpRight,
  Sparkles,
  Building2,
} from 'lucide-react';
import { LegalHeader } from '@/components/layout/legal-header';
import { Footer } from '@/components/layout/footer';
import {
  fetchPublicListings,
  getAllianceListingImage,
  ALLIANCE_REAL_ESTATE_PLACEHOLDERS,
  type PublicAllianceListingCard,
} from '@/lib/alliance';

interface AlliancePageProps {
  searchParams: Promise<{
    intent?: string;
    propertyType?: string;
    city?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function WebAllianceMarketplacePage({ searchParams }: AlliancePageProps) {
  const resolvedParams = await searchParams;
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;

  const { items, meta } = await fetchPublicListings({
    intent: resolvedParams.intent,
    propertyType: resolvedParams.propertyType,
    city: resolvedParams.city,
    search: resolvedParams.search,
    page,
    limit: 12,
  });

  const formatPrice = (amount?: number | null, currency = 'NGN') => {
    if (amount === undefined || amount === null) return 'Price on Request';
    const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '₦';
    return `${symbol}${amount.toLocaleString()}`;
  };

  return (
    <div style={{ background: '#faf9f5', minHeight: '100vh', color: '#141413' }}>
      <LegalHeader />

      {/* Hero Header */}
      <section style={{ paddingTop: 120, paddingBottom: 40, borderBottom: '1px solid rgba(20, 20, 19, 0.08)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0ede6', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#685c49', marginBottom: 12 }}>
            <Sparkles size={14} color="#d97706" />
            <span>Upward Alliance Marketplace</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 10px 0', lineHeight: 1.2 }}>
            Verified Homes & Managed Properties
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#685c49', maxWidth: 680, margin: 0, lineHeight: 1.5 }}>
            Browse verified listings represented by accredited professional property managers. Inquire directly or sign in with Upward Pay to rent with credibility.
          </p>

          {/* Quick Filter Bar */}
          <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <Link
              href="/alliance"
              style={{
                padding: '8px 18px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                background: !resolvedParams.intent ? '#141413' : '#fff',
                color: !resolvedParams.intent ? '#fff' : '#141413',
                border: '1px solid rgba(20, 20, 19, 0.12)',
              }}
            >
              All Properties
            </Link>
            <Link
              href="/alliance?intent=RENT"
              style={{
                padding: '8px 18px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                background: resolvedParams.intent === 'RENT' ? '#141413' : '#fff',
                color: resolvedParams.intent === 'RENT' ? '#fff' : '#141413',
                border: '1px solid rgba(20, 20, 19, 0.12)',
              }}
            >
              For Rent
            </Link>
            <Link
              href="/alliance?intent=SALE"
              style={{
                padding: '8px 18px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                background: resolvedParams.intent === 'SALE' ? '#141413' : '#fff',
                color: resolvedParams.intent === 'SALE' ? '#fff' : '#141413',
                border: '1px solid rgba(20, 20, 19, 0.12)',
              }}
            >
              For Sale
            </Link>
          </div>
        </div>
      </section>

      {/* Main Grid Section */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 80px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, fontSize: 13, color: '#685c49' }}>
          <span>Showing {items.length} of {meta.total} properties</span>
          <Link
            href="/signup"
            style={{ color: '#141413', fontWeight: 600, textDecoration: 'underline' }}
          >
            Create an Upward Pay account →
          </Link>
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: 20, border: '1px dashed rgba(20, 20, 19, 0.15)' }}>
            <Building2 size={48} color="#a8a29e" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>No properties found</h3>
            <p style={{ fontSize: 14, color: '#685c49', margin: '0 0 20px' }}>Try resetting your filter to view all verified listings.</p>
            <Link
              href="/alliance"
              style={{
                display: 'inline-block',
                background: '#141413',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              View All Listings
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {items.map((listing: PublicAllianceListingCard) => (
              <Link
                key={listing.uuid}
                href={`/alliance/${listing.uuid}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#fff',
                  borderRadius: 20,
                  overflow: 'hidden',
                  border: '1px solid rgba(20, 20, 19, 0.08)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {/* Photo */}
                <div style={{ position: 'relative', aspectRatio: '16/10', background: '#f0ede6', overflow: 'hidden' }}>
                  <img
                    src={getAllianceListingImage(listing)}
                    alt={listing.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />

                  {/* Intent tag */}
                  <span
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      background: listing.intent === 'SALE' ? '#059669' : '#141413',
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {listing.intent === 'SALE' ? 'For Sale' : 'For Rent'}
                  </span>
                </div>

                {/* Body */}
                <div style={{ padding: 18, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#141413' }}>
                      {formatPrice(listing.price, listing.currency)}
                      {listing.intent === 'RENT' && <span style={{ fontSize: 12, fontWeight: 500, color: '#685c49' }}> / yr</span>}
                    </span>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f0ede6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ArrowUpRight size={16} />
                    </div>
                  </div>

                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '10px 0 4px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {listing.title}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#685c49', marginBottom: 12 }}>
                    <MapPin size={14} color="#a8a29e" />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {[listing.address, listing.city, listing.state].filter(Boolean).join(', ') || 'Location on Request'}
                    </span>
                  </div>

                  {/* Specs */}
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#141413', fontWeight: 600, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(20, 20, 19, 0.05)' }}>
                    {listing.bedrooms !== null && listing.bedrooms !== undefined && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Bed size={14} color="#685c49" />
                        <span>{listing.bedrooms} Beds</span>
                      </div>
                    )}
                    {listing.bathrooms !== null && listing.bathrooms !== undefined && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Bath size={14} color="#685c49" />
                        <span>{listing.bathrooms} Baths</span>
                      </div>
                    )}
                  </div>

                  {/* PM line */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(20, 20, 19, 0.05)', fontSize: 11, color: '#685c49' }}>
                    <span style={{ fontWeight: 600, color: '#141413', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {listing.pm.displayName}
                      <ShieldCheck size={14} color="#059669" />
                    </span>
                    {listing.ratingSummary && listing.ratingSummary.totalRatings > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontWeight: 700, color: '#141413' }}>
                        <Star size={12} fill="#f59e0b" color="#f59e0b" />
                        {listing.ratingSummary.averageScore.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
