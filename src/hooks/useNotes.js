import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useNotes(listingId, userId) {
  const [notes,   setNotes]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listingId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchNotes() {
      setLoading(true);

      const { data } = await supabase
        .from('notes')
        .select('*')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        setNotes(data ?? []);
        setLoading(false);
      }
    }

    fetchNotes();
    return () => { cancelled = true; };
  }, [listingId]);

  const addNote = useCallback(async (body) => {
    if (!body?.trim() || !listingId || !userId) return;

    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: userId, listing_id: listingId, body: body.trim() })
      .select()
      .single();

    if (!error && data) {
      setNotes((prev) => [data, ...prev]);
    }
  }, [listingId, userId]);

  return { notes, addNote, loading };
}
