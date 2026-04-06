import { calcMetrics } from './calculations.js';

const SQFT_PER_ACRE = 43560;

// Rentcast propertyType → our internal type enum
const TYPE_MAP = {
  'Single Family': 'Single Family',
  'Multi Family':  'Multi-Family',
  'Apartment':     'Small Apartment',
  'Condo':         'Single Family',
  'Townhouse':     'Single Family',
};

function normalizeType(rentcastType) {
  return TYPE_MAP[rentcastType] ?? 'Single Family';
}

function verdict(CoCReturn) {
  if (CoCReturn >= 0.07) return 'buy';
  if (CoCReturn >= 0.04) return 'watch';
  return 'pass';
}

/**
 * Maps a raw Rentcast listing object to our internal shape and attaches
 * calcMetrics output. rentEstimate may be null if not yet fetched —
 * call attachRentEstimate() afterwards to complete the metrics.
 *
 * @param {object} raw  - Raw listing from Rentcast API or mockData
 * @returns {object}    - Normalized listing with metrics (or null metrics if no rent)
 */
export function transformListing(raw) {
  const price        = raw.price          ?? 0;
  const rentEstimate = raw.rentEstimate   ?? null;   // filled later by attachRentEstimate
  const lotAcres     = raw.lotSize != null ? raw.lotSize / SQFT_PER_ACRE : null;

  const listing = {
    // ── Identity ────────────────────────────────────────────
    id:            raw.id,
    address:       raw.formattedAddress ?? '',
    city:          raw.city         ?? '',
    state:         raw.state        ?? 'UT',
    zip:           raw.zipCode      ?? '',
    // ── Property details ────────────────────────────────────
    type:          normalizeType(raw.propertyType),
    price,
    beds:          raw.bedrooms     ?? null,
    baths:         raw.bathrooms    ?? null,
    sqft:          raw.squareFootage ?? null,
    year:          raw.yearBuilt    ?? null,
    lot:           lotAcres,
    garage:        raw.garage       || 0,
    hoa:           raw.hoa          ?? 0,
    // ── Location ────────────────────────────────────────────
    lat:           raw.latitude     ?? null,
    lng:           raw.longitude    ?? null,
    // ── Media ───────────────────────────────────────────────
    photos:        Array.isArray(raw.photoUrls) ? raw.photoUrls : [],
    // ── Rent ────────────────────────────────────────────────
    rentEstimate,
    rentRangeLow:  raw.rentRangeLow  ?? null,
    rentRangeHigh: raw.rentRangeHigh ?? null,
    // ── Status ──────────────────────────────────────────────
    status:        raw.status       ?? 'Active',
    listedDate:    raw.listedDate   ?? null,
    tags:          raw.tags         ?? [],
  };

  // Attach metrics if we already have a rent estimate
  return rentEstimate ? attachRentEstimate(listing, rentEstimate) : { ...listing, metrics: null, verdict: null };
}

/**
 * Attach (or re-attach) a rent estimate + recalculate all metrics.
 * Call this after fetchRentEstimate() resolves.
 *
 * @param {object} listing        - Already-transformed listing (from transformListing)
 * @param {number} rent           - Monthly rent estimate
 * @param {number} [rentRangeLow]
 * @param {number} [rentRangeHigh]
 * @returns {object}              - Same listing with metrics/verdict populated
 */
export function attachRentEstimate(listing, rent, rentRangeLow = null, rentRangeHigh = null) {
  const metrics = calcMetrics(listing.price, rent);
  return {
    ...listing,
    rentEstimate:  rent,
    rentRangeLow:  rentRangeLow  ?? listing.rentRangeLow,
    rentRangeHigh: rentRangeHigh ?? listing.rentRangeHigh,
    metrics,
    verdict:       verdict(metrics.CoCReturn),
  };
}
