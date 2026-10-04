import React from 'react';
import useFounderMembership from '@/components/founder/useFounderMembership';
import { FOUNDER_BADGE_URL } from '@/components/founder/founderBadgeAsset';
export default function FounderBadge({ userId, className = '' }) {
  const { membership } = useFounderMembership(userId);
  if (!membership?.badge_visible) return null;
  return <img src={FOUNDER_BADGE_URL} alt="Yardit Founding Member" title="Founding Member" className={`h-14 w-14 shrink-0 object-contain ${className}`} />;
}