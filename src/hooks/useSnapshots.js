import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useSnapshots() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchSnapshots() {
      setLoading(true);

      // Supabase doesn't support ORDER BY on a related table in a simple
      // select, so we fetch snapshots and join the listing address manually.
      const { data } = await supabase
        .from('snapshots')
        .select(`
          *,
          listings ( address, city )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!cancelled) {
        setSnapshots(data ?? []);
        setLoading(false);
      }
    }

    fetchSnapshots();
    return () => { cancelled = true; };
  }, []);

  return { snapshots, loading };
}
