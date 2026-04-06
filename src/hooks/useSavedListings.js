import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useSavedListings(userId) {
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!userId) {
      setSavedIds(new Set());
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchSaved() {
      const { data } = await supabase
        .from('saved_listings')
        .select('listing_id')
        .eq('user_id', userId);

      if (!cancelled) {
        setSavedIds(new Set((data ?? []).map((r) => r.listing_id)));
        setLoading(false);
      }
    }

    fetchSaved();
    return () => { cancelled = true; };
  }, [userId]);

  const toggleSave = useCallback(async (listingId) => {
    if (!userId) return;

    if (savedIds.has(listingId)) {
      setSavedIds((prev) => { const next = new Set(prev); next.delete(listingId); return next; });
      await supabase
        .from('saved_listings')
        .delete()
        .eq('user_id', userId)
        .eq('listing_id', listingId);
    } else {
      setSavedIds((prev) => new Set(prev).add(listingId));
      await supabase
        .from('saved_listings')
        .upsert({ user_id: userId, listing_id: listingId });
    }
  }, [userId, savedIds]);

  return { savedIds, toggleSave, loading };
}
