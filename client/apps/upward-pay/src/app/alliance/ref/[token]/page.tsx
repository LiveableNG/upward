'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAllianceReferral } from '@/features/alliance/hooks/useAllianceMarketplace';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AllianceReferralRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const { data: referralContext, isLoading, isError, error } = useAllianceReferral(token);

  useEffect(() => {
    if (referralContext?.listing?.uuid) {
      // Forward to listing detail with the ref token in searchParams
      router.replace(`/alliance/${referralContext.listing.uuid}?ref=${encodeURIComponent(token)}`);
    }
  }, [referralContext, token, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 text-center dark:bg-neutral-950">
        <Loader2 className="h-10 w-10 animate-spin text-neutral-900 dark:text-white" />
        <h3 className="mt-4 text-base font-bold text-neutral-900 dark:text-white">
          Resolving Your Property Referral...
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          Connecting you directly with your verified property opportunity.
        </p>
      </div>
    );
  }

  if (isError || !referralContext) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 text-center dark:bg-neutral-950">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-base font-bold text-neutral-900 dark:text-white">
          Invalid or Expired Referral Link
        </h3>
        <p className="mt-1 max-w-sm text-xs text-neutral-500">
          {(error as any)?.message ||
            'This referral link is no longer active or could not be found.'}
        </p>
        <Link
          href="/alliance"
          className="mt-6 inline-flex rounded-xl bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900"
        >
          Explore Alliance Marketplace
        </Link>
      </div>
    );
  }

  return null;
}
