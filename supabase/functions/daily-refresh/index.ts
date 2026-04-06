// supabase/functions/daily-refresh/index.ts
// Scheduled daily at 7:00 AM MT (13:00 UTC) — see config.toml

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Types ────────────────────────────────────────────────────────────────────

type PropertyType = 'Single Family' | 'Multi-Family' | 'Small Apartment';
type ChangeType   = 'new' | 'price-drop' | 'price-up' | 'status-change';

interface FeedListing {
  address:       string;
  city:          string;
  state:         string;
  type:          PropertyType;
  price:         number;
  rent_estimate: number;
  beds?:         number;
  baths?:        number;
  sqft?:         number;
  year_built?:   number;
  lot_size?:     number;
  garage?:       boolean;
  hoa_monthly?:  number;
  photos?:       string[];
}

interface DbListing extends FeedListing {
  id:           string;
  active:       boolean;
  snapshot_tag: string | null;
  created_at:   string;
  updated_at:   string;
}

interface RefreshResult {
  inserted:    number;
  updated:     number;
  unchanged:   number;
  deactivated: number;
  errors:      string[];
}

// ─── Mock feed data ───────────────────────────────────────────────────────────
// TODO: replace fetchTodaysFeed() body with a real MLS / data-provider API call.
// Example integration point:
//
//   const res = await fetch(Deno.env.get('MLS_API_URL')!, {
//     headers: { Authorization: `Bearer ${Deno.env.get('MLS_API_KEY')}` },
//   });
//   if (!res.ok) throw new Error(`MLS API error: ${res.status} ${res.statusText}`);
//   const raw = await res.json();
//   return raw.listings.map(normalizeMlsListing);  // add your normalizer here
//
// The function below returns a hardcoded snapshot that mirrors the seed data so
// the refresh logic can be exercised end-to-end before the real feed is wired up.

function fetchTodaysFeed(): FeedListing[] {
  return [
    // ── Unchanged from seed ──────────────────────────────────────────────────
    {
      address: '847 N F St',        city: 'Salt Lake City', state: 'UT',
      type: 'Single Family',        price: 575000, rent_estimate: 2850,
      beds: 4, baths: 2.0, sqft: 1820, year_built: 1952, lot_size: 6534,
      garage: true,  hoa_monthly: 0,
    },
    {
      address: '1134 N 500 W',      city: 'Provo', state: 'UT',
      type: 'Single Family',        price: 370000, rent_estimate: 2200, // price dropped $15k
      beds: 4, baths: 2.0, sqft: 1650, year_built: 1968, lot_size: 7200,
      garage: true,  hoa_monthly: 0,
    },
    {
      address: '2256 Adams Ave',    city: 'Ogden', state: 'UT',
      type: 'Multi-Family',         price: 420000, rent_estimate: 3100,
      garage: false, hoa_monthly: 0,
    },
    {
      address: '315 W 5600 S',      city: 'Murray', state: 'UT',
      type: 'Single Family',        price: 490000, rent_estimate: 2600,
      beds: 3, baths: 2.0, sqft: 1740, year_built: 1978, lot_size: 7920,
      garage: true,  hoa_monthly: 0,
    },
    {
      address: '1978 E Murray Holladay Rd', city: 'Holladay', state: 'UT',
      type: 'Single Family',        price: 815000, rent_estimate: 3400, // price up $20k
      beds: 5, baths: 3.0, sqft: 2680, year_built: 1972, lot_size: 10890,
      garage: true,  hoa_monthly: 0,
    },
    {
      address: '445 E 400 N',       city: 'Logan', state: 'UT',
      type: 'Single Family',        price: 310000, rent_estimate: 1850,
      beds: 3, baths: 1.5, sqft: 1320, year_built: 1959, lot_size: 6098,
      garage: false, hoa_monthly: 0,
    },
    {
      address: '782 W 400 N',       city: 'Orem', state: 'UT',
      type: 'Single Family',        price: 455000, rent_estimate: 2450,
      beds: 4, baths: 2.5, sqft: 2010, year_built: 1985, lot_size: 8276,
      garage: true,  hoa_monthly: 0,
    },
    {
      address: '6842 S Wasatch Blvd', city: 'Cottonwood Heights', state: 'UT',
      type: 'Single Family',        price: 665000, rent_estimate: 3100, // price dropped $20k
      beds: 4, baths: 2.5, sqft: 2250, year_built: 1969, lot_size: 9583,
      garage: true,  hoa_monthly: 0,
    },
    {
      address: '7234 S 700 W',      city: 'Midvale', state: 'UT',
      type: 'Multi-Family',         price: 620000, rent_estimate: 4200,
      garage: false, hoa_monthly: 0,
    },
    {
      address: '296 S 400 E',       city: 'Springville', state: 'UT',
      type: 'Single Family',        price: 349000, rent_estimate: 1975,
      beds: 3, baths: 2.0, sqft: 1490, year_built: 1997, lot_size: 7405,
      garage: true,  hoa_monthly: 0,
    },
    {
      address: '155 N 200 E',       city: 'American Fork', state: 'UT',
      type: 'Small Apartment',      price: 1150000, rent_estimate: 7200,
      garage: false, hoa_monthly: 0,
    },
    {
      address: '1623 S 1500 E',     city: 'Salt Lake City', state: 'UT',
      type: 'Single Family',        price: 680000, rent_estimate: 3050,
      beds: 4, baths: 3.0, sqft: 2100, year_built: 1955, lot_size: 7840,
      garage: true,  hoa_monthly: 0,
    },
    // ── New listing not in seed ──────────────────────────────────────────────
    {
      address: '3412 W 5400 S',     city: 'Taylorsville', state: 'UT',
      type: 'Single Family',        price: 415000, rent_estimate: 2300,
      beds: 3, baths: 2.0, sqft: 1560, year_built: 1988, lot_size: 6800,
      garage: true,  hoa_monthly: 0,
    },
  ];
}

// ─── Snapshot tag helper ──────────────────────────────────────────────────────

function snapshotTag(changeType: ChangeType): string | null {
  if (changeType === 'new')        return 'New Listing';
  if (changeType === 'price-drop') return 'Price Drop';
  if (changeType === 'price-up')   return 'Price Increase';
  return null;
}

// ─── Core refresh logic ───────────────────────────────────────────────────────

async function refreshListings(
  supabase: SupabaseClient,
  feed: FeedListing[],
): Promise<RefreshResult> {
  const result: RefreshResult = { inserted: 0, updated: 0, unchanged: 0, deactivated: 0, errors: [] };

  // Build address lookup for O(1) checks
  const feedAddresses = new Set(feed.map((l) => l.address.trim().toLowerCase()));

  // Fetch all currently active DB rows in one query
  const { data: existingRows, error: fetchErr } = await supabase
    .from('listings')
    .select('id, address, price, active')
    .eq('active', true);

  if (fetchErr) throw new Error(`Failed to fetch existing listings: ${fetchErr.message}`);

  const existingByAddress = new Map<string, Pick<DbListing, 'id' | 'address' | 'price' | 'active'>>();
  for (const row of (existingRows ?? [])) {
    existingByAddress.set(row.address.trim().toLowerCase(), row);
  }

  // ── Process each listing in today's feed ────────────────────────────────────
  for (const item of feed) {
    const key = item.address.trim().toLowerCase();
    const existing = existingByAddress.get(key);

    try {
      if (!existing) {
        // ── NEW listing ───────────────────────────────────────────────────────
        const { data: inserted, error: insertErr } = await supabase
          .from('listings')
          .insert({
            ...item,
            snapshot_tag: 'New Listing',
            active: true,
          })
          .select('id')
          .single();

        if (insertErr) throw new Error(insertErr.message);

        await supabase.from('snapshots').insert({
          listing_id:    inserted.id,
          price:         item.price,
          rent_estimate: item.rent_estimate,
          status:        'active',
          change_type:   'new',
          change_delta:  null,
        });

        result.inserted++;

      } else {
        const priceDelta = item.price - Number(existing.price);

        if (Math.abs(priceDelta) >= 100) {
          // ── PRICE CHANGED ─────────────────────────────────────────────────
          const changeType: ChangeType = priceDelta < 0 ? 'price-drop' : 'price-up';

          const { error: updateErr } = await supabase
            .from('listings')
            .update({
              price:         item.price,
              rent_estimate: item.rent_estimate,
              snapshot_tag:  snapshotTag(changeType),
              active:        true,
            })
            .eq('id', existing.id);

          if (updateErr) throw new Error(updateErr.message);

          await supabase.from('snapshots').insert({
            listing_id:    existing.id,
            price:         item.price,
            rent_estimate: item.rent_estimate,
            status:        'active',
            change_type:   changeType,
            change_delta:  priceDelta,
          });

          result.updated++;

        } else {
          // ── NO CHANGE — touch updated_at only ────────────────────────────
          const { error: touchErr } = await supabase
            .from('listings')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', existing.id);

          if (touchErr) throw new Error(touchErr.message);

          result.unchanged++;
        }
      }
    } catch (err) {
      result.errors.push(`${item.address}: ${(err as Error).message}`);
    }
  }

  // ── Deactivate listings not seen in today's feed ──────────────────────────
  const toDeactivate: string[] = [];
  for (const [key, row] of existingByAddress) {
    if (!feedAddresses.has(key)) {
      toDeactivate.push(row.id);
    }
  }

  if (toDeactivate.length > 0) {
    const { error: deactivateErr } = await supabase
      .from('listings')
      .update({ active: false, snapshot_tag: null })
      .in('id', toDeactivate);

    if (deactivateErr) {
      result.errors.push(`Deactivate batch: ${deactivateErr.message}`);
    } else {
      result.deactivated += toDeactivate.length;
    }
  }

  return result;
}

// ─── Edge Function handler ────────────────────────────────────────────────────

Deno.serve(async (_req: Request): Promise<Response> => {
  try {
    const supabaseUrl     = Deno.env.get('SUPABASE_URL');
    const supabaseKey     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // service role — bypasses RLS
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // TODO: swap fetchTodaysFeed() with a real async MLS/data-provider call
    const feed = fetchTodaysFeed();

    console.log(`[daily-refresh] Processing ${feed.length} listings from feed…`);

    const result = await refreshListings(supabase, feed);

    console.log('[daily-refresh] Complete:', result);

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const message = (err as Error).message;
    console.error('[daily-refresh] Fatal error:', message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
