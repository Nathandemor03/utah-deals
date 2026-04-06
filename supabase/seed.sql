-- ============================================================
-- utah-deals seed data — 12 Utah investment properties
-- ============================================================

insert into listings (
  address, city, state, type,
  price, rent_estimate,
  beds, baths, sqft, year_built, lot_size,
  garage, hoa_monthly,
  snapshot_tag, snapshot_note,
  photos, active
) values

-- 1. SLC — Avenues Single Family
(
  '847 N F St', 'Salt Lake City', 'UT', 'Single Family',
  575000, 2850,
  4, 2.0, 1820, 1952, 6534,
  true, 0,
  'New Listing', 'Classic Avenues craftsman, strong rental history in high-demand neighborhood.',
  '[]', true
),

-- 2. Provo — Single Family near BYU
(
  '1134 N 500 W', 'Provo', 'UT', 'Single Family',
  385000, 2200,
  4, 2.0, 1650, 1968, 7200,
  true, 0,
  'Price Drop', 'Reduced $15k. Near BYU campus — consistent tenant pool of students and faculty.',
  '[]', true
),

-- 3. Ogden — Multi-Family duplex
(
  '2256 Adams Ave', 'Ogden', 'UT', 'Multi-Family',
  420000, 3100,
  0, 0, 2400, 1948, 8712,
  false, 0,
  'New Listing', 'Side-by-side duplex, each unit 2bd/1ba. Both currently leased at market rate.',
  '[]', true
),

-- 4. Murray — Single Family
(
  '315 W 5600 S', 'Murray', 'UT', 'Single Family',
  490000, 2600,
  3, 2.0, 1740, 1978, 7920,
  true, 0,
  null, 'Mid-valley location with easy freeway access. Well-maintained, newer roof and HVAC.',
  '[]', true
),

-- 5. Holladay — Single Family higher-end
(
  '1978 E Murray Holladay Rd', 'Holladay', 'UT', 'Single Family',
  795000, 3400,
  5, 3.0, 2680, 1972, 10890,
  true, 0,
  null, 'Larger lot in Holladay. Rents premium for SLC suburb. ADU potential in backyard.',
  '[]', true
),

-- 6. Logan — Single Family near USU
(
  '445 E 400 N', 'Logan', 'UT', 'Single Family',
  310000, 1850,
  3, 1.5, 1320, 1959, 6098,
  false, 0,
  'New Listing', 'Walking distance to USU. Perennial tenant demand. Currently vacant — priced to move.',
  '[]', true
),

-- 7. Orem — Single Family
(
  '782 W 400 N', 'Orem', 'UT', 'Single Family',
  455000, 2450,
  4, 2.5, 2010, 1985, 8276,
  true, 0,
  null, 'Quiet street, large backyard. Updated kitchen 2021. Close to Geneva Rd corridor.',
  '[]', true
),

-- 8. Cottonwood Heights — Single Family
(
  '6842 S Wasatch Blvd', 'Cottonwood Heights', 'UT', 'Single Family',
  685000, 3100,
  4, 2.5, 2250, 1969, 9583,
  true, 0,
  'Price Drop', 'Reduced $20k. Ski-access premium — strong short-term and annual rental demand.',
  '[]', true
),

-- 9. Midvale — Multi-Family triplex
(
  '7234 S 700 W', 'Midvale', 'UT', 'Multi-Family',
  620000, 4200,
  0, 0, 3300, 1962, 10019,
  false, 0,
  'New Listing', 'Triplex — two 2bd units + one 1bd unit. All units occupied. CAP ~6.1%.',
  '[]', true
),

-- 10. Springville — Single Family
(
  '296 S 400 E', 'Springville', 'UT', 'Single Family',
  349000, 1975,
  3, 2.0, 1490, 1997, 7405,
  true, 0,
  null, 'Move-in ready. Attached garage. Lower price point makes for strong CoC entry.',
  '[]', true
),

-- 11. American Fork — Small Apartment (4-plex)
(
  '155 N 200 E', 'American Fork', 'UT', 'Small Apartment',
  1150000, 7200,
  0, 0, 5200, 1975, 18295,
  false, 0,
  'New Listing', 'Four-plex, each unit 2bd/1ba. Separately metered. Long-term tenants, below-market rents — upside on turns.',
  '[]', true
),

-- 12. SLC — East Bench Single Family
(
  '1623 S 1500 E', 'Salt Lake City', 'UT', 'Single Family',
  680000, 3050,
  4, 3.0, 2100, 1955, 7840,
  true, 0,
  null, 'East Bench location. Hardwood floors throughout, updated baths. Strong appreciation history.',
  '[]', true
);

-- ============================================================
-- Seed initial snapshots (mark all 12 as "new")
-- ============================================================

insert into snapshots (listing_id, date, price, rent_estimate, status, change_type, change_delta)
select
  id,
  current_date,
  price,
  rent_estimate,
  'active',
  'new',
  null
from listings;
