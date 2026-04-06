import { useState, useEffect } from 'react';
import { fetchSaleListings } from '../lib/mlsApi';
import { transformListing } from '../lib/transformListing';

const CACHE_KEY = 'utah_deals_listings_v2';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

export function useListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      const cached = loadCache();
      if (cached) {
        setListings(cached);
        setLoading(false);
        return;
      }

      try {
        const raw = await fetchSaleListings();
        const transformed = raw.map(transformListing);

        if (!cancelled) {
          setListings(transformed);
          saveCache(transformed);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, []);

  return { listings, loading, error };
}
