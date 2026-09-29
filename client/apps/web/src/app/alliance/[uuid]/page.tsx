import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  MapPin,
  Bed,
  Bath,
  Building,
  ShieldCheck,
  Star,
  ArrowLeft,
  Award,
  Lock,
  UserCheck,
} from 'lucide-react';
import { LegalHeader } from '@/components/layout/legal-header';
import { Footer } from '@/components/layout/footer';
import { fetchPublicListingDetail, fetchReferralContext } from '@/lib/alliance';
import { WebInquirySection } from '@/components/alliance/WebInquirySection';

interface ListingDetailPageProps {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ ref?: string }>;
}

export default async function WebAllianceListingDetailPage({
  params,
  searchParams,
}: ListingDetailPageProps) {
  const { uuid } = await params;
  const { ref: refToken } = await searchParams;

  const listing = await fetchPublicListingDetail(uuid);
  if (!listing) {
    notFound();
  }

  const referralContext = refToken ? await fetchReferralContext(refToken) : null;
  const referringPm = referralContext?.referringPm;

  const paySignupUrl = refToken
    ? `/signup?redirect=${encodeURIComponent(`/dashboard/alliance/${uuid}?ref=${refToken}`)}`
    : `/signup?redirect=${encodeURIComponent(`/dashboard/alliance/${uuid}`)}`;

  const payLoginUrl = refToken
    ? `/login?redirect=${encodeURIComponent(`/dashboard/alliance/${uuid}?ref=${refToken}`)}`
    : `/login?redirect=${encodeURIComponent(`/dashboard/alliance/${uuid}`)}`;

  const formatPrice = (amount?: number | null, currency = 'NGN') => {
    if (amount === undefined || amount === null) return 'Price on Request';
    const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '₦';
    return `${symbol}${amount.toLocaleString()}`;
  };

  return (
    <div style={{ background: '#faf9f5', minHeight: '100vh', color: '#141413' }}>
      <LegalHeader />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '110px 24px 80px 24px' }}>
        {/* Back Link */}
        <div style={{ marginBottom: 20 }}>
          <Link
            href="/alliance"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: '#685c49',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Marketplace</span>
          </Link>
        </div>

        {/* Referral Trust Banner */}
        {referringPm && (
          <div
            style={{
              marginBottom: 24,
              padding: '16px 20px',
              borderRadius: 16,
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: '#059669',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserCheck size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#065f46' }}>
                  <span>Referred Opportunity</span>
                  <ShieldCheck size={16} color="#059669" />
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#047857' }}>
                  {referralContext?.clientName ? `Hello ${referralContext.clientName}, you` : 'You'} were referred directly by{' '}
                  <strong>{referringPm.displayName}</strong>.
                </p>
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#065f46', background: '#d1fae5', padding: '4px 10px', borderRadius: 8 }}>
              Referral Active
            </span>
          </div>
        )}

        {/* Image Gallery */}
        <div style={{ marginBottom: 32 }}>
          {listing.media && listing.media.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: listing.media.length > 1 ? '2fr 1fr' : '1fr', gap: 12 }}>
              <div style={{ borderRadius: 16, overflow: 'hidden', height: 420, background: '#f0ede6' }}>
                <img
                  src={listing.media[0]?.publicUrl}
                  alt={listing.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              {listing.media.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: 420 }}>
                  {listing.media.slice(1, 3).map((m, idx) => (
                    <div key={idx} style={{ flex: 1, borderRadius: 16, overflow: 'hidden', background: '#f0ede6' }}>
                      <img src={m.publicUrl} alt={`Photo ${idx + 2}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ height: 320, borderRadius: 16, background: '#f0ede6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a8a29e' }}>
              No photos available
            </div>
          )}
        </div>

        {/* Content & Action Box */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 36, alignItems: 'start' }}>
          {/* Left info */}
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <span style={{ background: listing.intent === 'SALE' ? '#059669' : '#141413', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                {listing.intent === 'SALE' ? 'For Sale' : 'For Rent'}
              </span>
              {listing.propertyType && (
                <span style={{ background: '#f0ede6', color: '#685c49', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  {listing.propertyType}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {listing.title}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#685c49', marginBottom: 24 }}>
              <MapPin size={16} color="#a8a29e" />
              <span>{[listing.address, listing.city, listing.state, listing.country].filter(Boolean).join(', ')}</span>
            </div>

            {/* Specs bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: '16px 20px', background: '#fff', borderRadius: 16, border: '1px solid rgba(20, 20, 19, 0.08)', marginBottom: 28 }}>
              {listing.bedrooms !== null && listing.bedrooms !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700 }}>
                  <Bed size={18} color="#685c49" />
                  <span>{listing.bedrooms} Bedrooms</span>
                </div>
              )}
              {listing.bathrooms !== null && listing.bathrooms !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700 }}>
                  <Bath size={18} color="#685c49" />
                  <span>{listing.bathrooms} Bathrooms</span>
                </div>
              )}
              {listing.targetType && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700 }}>
                  <Building size={18} color="#685c49" />
                  <span>{listing.targetType}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {listing.description && (
              <div style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid rgba(20, 20, 19, 0.08)', marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>Description</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: '#444', margin: 0, whiteSpace: 'pre-line' }}>
                  {listing.description}
                </p>
              </div>
            )}

            {/* PM Profile Card */}
            <div style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid rgba(20, 20, 19, 0.08)', marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a8a29e' }}>
                    Listing Property Manager
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>{listing.pm.displayName}</h3>
                    <ShieldCheck size={18} color="#059669" />
                  </div>
                  {listing.pm.pmTitle && <p style={{ fontSize: 13, color: '#685c49', margin: '2px 0 0' }}>{listing.pm.pmTitle}</p>}
                </div>
                {listing.ratingSummary && listing.ratingSummary.totalRatings > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fef3c7', padding: '4px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#b45309' }}>
                    <Star size={14} fill="#f59e0b" color="#f59e0b" />
                    <span>{listing.ratingSummary.averageScore.toFixed(1)}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#92400e' }}>({listing.ratingSummary.totalRatings})</span>
                  </div>
                )}
              </div>

              {listing.pm.bio && (
                <p style={{ fontSize: 13, color: '#685c49', marginTop: 12, lineHeight: 1.5 }}>
                  {listing.pm.bio}
                </p>
              )}

              {listing.pm.qualifications && listing.pm.qualifications.length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(20, 20, 19, 0.05)' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {listing.pm.qualifications.map((q) => (
                      <span key={q.code} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0ede6', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#141413' }}>
                        <Award size={14} color="#059669" />
                        {q.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Direct Inquiry Form (Client Component) */}
            <WebInquirySection
              listingUuid={listing.uuid}
              listingTitle={listing.title}
              referralToken={refToken}
              initialClientName={referralContext?.clientName}
            />
          </div>

          {/* Right Action / Conversion Box */}
          <div style={{ position: 'sticky', top: 120 }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 28, border: '1px solid rgba(20, 20, 19, 0.1)', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#685c49' }}>
                {listing.intent === 'SALE' ? 'Purchase Price' : 'Annual Rent'}
              </span>
              <div style={{ fontSize: 32, fontWeight: 800, margin: '6px 0 16px', color: '#141413' }}>
                {formatPrice(listing.price, listing.currency)}
                {listing.intent === 'RENT' && <span style={{ fontSize: 14, fontWeight: 500, color: '#685c49' }}> / year</span>}
              </div>

              {/* Primary CTA: Sign Up & Apply on Upward Pay */}
              <Link
                href={paySignupUrl}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: '#141413',
                  color: '#fff',
                  padding: '14px 20px',
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: 'none',
                  textAlign: 'center',
                  marginBottom: 10,
                  transition: 'opacity 0.2s',
                }}
              >
                <span>Sign Up to Rent on Upward Pay</span>
              </Link>

              {/* Secondary CTA: Already have an account? */}
              <Link
                href={payLoginUrl}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: '#f0ede6',
                  color: '#141413',
                  padding: '12px 20px',
                  borderRadius: 14,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                  textAlign: 'center',
                  marginBottom: 16,
                }}
              >
                <span>Already have an account? Sign In</span>
              </Link>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#685c49', justifyContent: 'center' }}>
                <Lock size={14} />
                <span>Protected Upward Alliance Transaction</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
