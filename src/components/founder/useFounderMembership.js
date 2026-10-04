import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
export const founderKey = ['founderMemberships'];
let listeners = 0;
let unsubscribe;
export default function useFounderMembership(userId) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: founderKey, queryFn: () => base44.entities.FounderMembership.filter({ active: true }), staleTime: 10000, refetchInterval: 30000 });
  useEffect(() => {
    if (listeners++ === 0) unsubscribe = base44.entities.FounderMembership.subscribe(() => client.invalidateQueries({ queryKey: founderKey }));
    return () => { if (--listeners === 0) { unsubscribe?.(); unsubscribe = null; } };
  }, [client]);
  const membership = query.data?.find(row => row.user_id === userId);
  return { ...query, membership, isVip: membership?.residential_vip === true };
}