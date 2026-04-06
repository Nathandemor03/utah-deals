import { useState, useMemo } from 'react';
import { useListings } from '../hooks/useListings';
import { useSavedListings } from '../hooks/useSavedListings';
import { useSnapshots } from '../hooks/useSnapshots';
import { useNotes } from '../hooks/useNotes';
import ListingCard from '../components/ListingCard';
import PropertyModal from '../components/PropertyModal';

const TABS   = ['all', 'buy', 'watch', 'saved'];
const TAB_LABELS = { all: 'All', buy: 'Strong Buys', watch: 'Worth a Look', saved: 'Saved' };

const SORT_OPTIONS = [
  { value: 'coc_desc',    label: 'CoC % (High → Low)' },
  { value: 'price_asc',   label: 'Price (Low → High)' },
  { value: 'price_desc',  label: 'Price (High → Low)' },
];

const TYPE_OPTIONS = [
  { value: 'all',              label: 'All Types' },
  { value: 'Single Family',    label: 'Single Family' },
  { value: 'Multi-Family',     label: 'Multi-Family' },
  { value: 'Small Apartment',  label: 'Small Apartment' },
];

const CHANGE_TYPE_STYLES = {
  'new':           { dot: 'bg-blue-500',   label: 'New Listing',   text: 'text-blue-700' },
  'price-drop':    { dot: 'bg-emerald-500', label: 'Price Drop',    text: 'text-emerald-700' },
  'price-up':      { dot: 'bg-rose-500',    label: 'Price Increase',text: 'text-rose-700' },
  'status-change': { dot: 'bg-amber-500',   label: 'Status Change', text: 'text-amber-700' },
};

function fmtUSD(n) {
  return '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
      <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${accent ? 'text-blue-100' : 'text-slate-400'}`}>{label}</p>
      <p className="text-2xl font-bold leading-none">{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-blue-200' : 'text-slate-400'}`}>{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { listings, loading, error } = useListings();
  const { savedIds, toggleSave } = useSavedListings(null);
  const { snapshots } = useSnapshots();

  const [activeTab,   setActiveTab]   = useState('all');
  const [sort,        setSort]        = useState('coc_desc');
  const [typeFilter,  setTypeFilter]  = useState('all');
  const [selected,    setSelected]    = useState(null);

  const { notes, addNote } = useNotes(selected?.id, null);

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // --- Summary stats ---
  const totalCount  = listings.length;
  const buyCount    = listings.filter((l) => l.verdict === 'buy').length;
  const watchCount  = listings.filter((l) => l.verdict === 'watch').length;
  const readyListings = listings.filter((l) => l.metrics != null);
  const bestCoC     = readyListings.length
    ? Math.max(...readyListings.map((l) => l.metrics.CoCReturn))
    : null;

  // --- Filtered + sorted listings ---
  const visible = useMemo(() => {
    let result = [...listings];

    // Tab filter
    if (activeTab === 'buy')   result = result.filter((l) => l.verdict === 'buy');
    if (activeTab === 'watch') result = result.filter((l) => l.verdict === 'watch');
    if (activeTab === 'saved') result = result.filter((l) => savedIds.has(l.id));

    // Type filter
    if (typeFilter !== 'all') result = result.filter((l) => l.type === typeFilter);

    // Sort
    if (sort === 'coc_desc')   result.sort((a, b) => (b.metrics?.CoCReturn ?? -Infinity) - (a.metrics?.CoCReturn ?? -Infinity));
    if (sort === 'price_asc')  result.sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') result.sort((a, b) => b.price - a.price);

    return result;
  }, [listings, activeTab, typeFilter, sort, savedIds]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Utah Investment Properties</h1>
            <p className="text-sm text-slate-500 mt-1">
              Assumptions: 70% LTV · 6.5% rate · 1% tax · 0.25% ins · 0.5% mgmt · 7% vacancy
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Refreshed {today}
          </span>
        </div>

        {/* ── Error ──────────────────────────────────────────── */}
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
            Failed to load listings: {error}
          </div>
        )}

        {/* ── Stat cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Listings"   value={loading ? '—' : totalCount} />
          <StatCard label="Strong Buys"      value={loading ? '—' : buyCount}   accent />
          <StatCard label="Worth a Look"     value={loading ? '—' : watchCount} />
          <StatCard
            label="Best CoC"
            value={loading || bestCoC === null ? '—' : (bestCoC * 100).toFixed(1) + '%'}
            sub="at current assumptions"
          />
        </div>

        {/* ── Tab bar ────────────────────────────────────────── */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
          {TABS.map((tab) => {
            const count =
              tab === 'buy'   ? buyCount :
              tab === 'watch' ? watchCount :
              tab === 'saved' ? savedIds.size :
              totalCount;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {TAB_LABELS[tab]}
                {!loading && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Controls ───────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium">Sort</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <p className="ml-auto text-xs text-slate-400 self-center">
            {loading ? 'Loading…' : `${visible.length} listing${visible.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* ── Listings grid ──────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-4xl mb-3">🏠</p>
            <p className="text-lg font-medium text-slate-600">No listings match</p>
            <p className="text-sm">Try a different tab or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visible.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isSaved={savedIds.has(listing.id)}
                onSave={toggleSave}
                onClick={setSelected}
              />
            ))}
          </div>
        )}

        {/* ── Snapshot feed ──────────────────────────────────── */}
        {snapshots.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-slate-700 mb-3">Recent Activity</h2>
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {snapshots.map((snap) => {
                const style = CHANGE_TYPE_STYLES[snap.change_type] ?? CHANGE_TYPE_STYLES['new'];
                const address = snap.listings?.address ?? 'Unknown address';
                const city    = snap.listings?.city    ?? '';
                return (
                  <div key={snap.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                      <div>
                        <p className={`text-xs font-semibold ${style.text}`}>{style.label}</p>
                        <p className="text-sm text-slate-700">{address}{city ? `, ${city}` : ''}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      {snap.price && (
                        <p className="text-sm font-medium text-slate-800">{fmtUSD(snap.price)}</p>
                      )}
                      {snap.change_delta != null && (
                        <p className={`text-xs font-medium ${snap.change_delta < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {snap.change_delta > 0 ? '+' : ''}{fmtUSD(snap.change_delta)}
                        </p>
                      )}
                      <p className="text-xs text-slate-400">{new Date(snap.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Property Modal ─────────────────────────────────── */}
      {selected && (
        <PropertyModal
          listing={selected}
          isSaved={savedIds.has(selected.id)}
          onSave={toggleSave}
          onClose={() => setSelected(null)}
          notes={notes}
          onAddNote={addNote}
        />
      )}
    </div>
  );
}
