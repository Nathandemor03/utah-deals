import {
  MOCK_SALE_LISTINGS,
  MOCK_RENT_ESTIMATES,
  MOCK_RENTAL_LISTINGS,
} from './mockData.js';

const BASE_URL  = 'https://api.rentcast.io/v1';
const API_KEY   = import.meta.env.VITE_RENTCAST_TOKEN;
const USE_MOCK  = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// ─── Internal fetch helper ─────────────────────────────────────────────────────

async function apiFetch(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), {
    headers: { 'X-Api-Key': API_KEY },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Rentcast API error ${res.status} on ${path}: ${body || res.statusText}`
    );
  }

  return res.json();
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch active for-sale listings in Utah.
 * @returns {Promise<object[]>} Raw Rentcast listing objects
 */
export async function fetchSaleListings() {
  if (USE_MOCK) return MOCK_SALE_LISTINGS;

  const data = await apiFetch('/listings/sale', {
    state:        'UT',
    status:       'Active',
    propertyType: 'Single Family,Multi Family',
    minPrice:     200000,
    maxPrice:     2000000,
    limit:        100,
  });

  // Rentcast returns either an array or { listings: [...] }
  return Array.isArray(data) ? data : (data.listings ?? []);
}

/**
 * Fetch a long-term rent estimate for a specific property.
 * @returns {Promise<{ rent: number, rentRangeLow: number, rentRangeHigh: number }>}
 */
export async function fetchRentEstimate(address, propertyType, bedrooms, bathrooms, squareFootage) {
  if (USE_MOCK) {
    // Match mock estimate by address prefix since we don't have the id here
    const entry = Object.entries(MOCK_RENT_ESTIMATES).find(([id]) => {
      const mockListing = MOCK_SALE_LISTINGS.find((l) => l.id === id);
      return mockListing?.formattedAddress?.startsWith(address?.split(',')[0]);
    });
    if (entry) return entry[1];
    // Fallback: rough estimate based on sqft
    const rent = Math.round((squareFootage ?? 1500) * 1.4);
    return { rent, rentRangeLow: Math.round(rent * 0.9), rentRangeHigh: Math.round(rent * 1.1) };
  }

  const data = await apiFetch('/avm/rent/long-term', {
    address,
    propertyType,
    bedrooms,
    bathrooms,
    squareFootage,
  });

  const { rent, rentRangeLow, rentRangeHigh } = data;
  if (rent == null) throw new Error(`Rentcast returned no rent estimate for: ${address}`);

  return { rent, rentRangeLow, rentRangeHigh };
}

/**
 * Fetch active rental comp listings for a city to cross-check rent estimates.
 * @returns {Promise<object[]>} Raw Rentcast listing objects
 */
export async function fetchRentalListings(city, state = 'UT') {
  if (USE_MOCK) return MOCK_RENTAL_LISTINGS;

  const data = await apiFetch('/listings/sale', {
    status: 'Active',
    city,
    state,
  });

  return Array.isArray(data) ? data : (data.listings ?? []);
}
