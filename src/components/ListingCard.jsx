// Targets used for metric pill color-coding
const TARGETS = {
  coc:  { green: 0.07, amber: 0.04 },   // CoC %
  cap:  { green: 0.055, amber: 0.04 },  // Cap rate
  dscr: { green: 1.25,  amber: 1.0  },  // DSCR (higher = better)
  grm:  { green: 12,    amber: 15   },  // GRM (lower = better)
};

function metricColor(key, value) {
  const t = TARGETS[key];
  if (!t) return 'bg-slate-100 text-slate-600';
  const inverted = key === 'grm'; // lower GRM is better
  const hi = inverted ? value <= t.green : value >= t.green;
  const mid = inverted ? value <= t.amber : value >= t.amber;
  if (hi)  return 'bg-emerald-100 text-emerald-800';
  if (mid) return 'bg-amber-100 text-amber-800';
  return 'bg-rose-100 text-rose-700';
}

const VERDICT_BORDER = {
  buy:   'border-l-emerald-500  hover:border-l-emerald-600',
  watch: 'border-l-amber-400    hover:border-l-amber-500',
  pass:  'border-l-slate-300    hover:border-l-slate-400',
};

const VERDICT_BADGE = {
  buy:   'bg-emerald-100 text-emerald-800',
  watch: 'bg-amber-100 text-amber-800',
  pass:  'bg-slate-100 text-slate-500',
};

const VERDICT_LABELS = {
  buy:   'Strong Buy',
  watch: 'Watch',
  pass:  'Pass',
};

// Snapshot tag → label + style
function snapshotTagMeta(tag) {
  if (!tag) return null;
  const lower = tag.toLowerCase();
  if (lower.includes('drop') || lower.includes('reduced'))
    return { icon: '↓', label: tag, cls: 'bg-emerald-600 text-white' };
  if (lower.includes('up') || lower.includes('increase') || lower.includes('raised'))
    return { icon: '↑', label: tag, cls: 'bg-rose-500 text-white' };
  // "New Listing" or anything else
  return { icon: null, label: tag, cls: 'bg-blue-600 text-white' };
}

function fmt(n) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}
function fmtUSD(n) { return '$' + fmt(n); }
function fmtPct(n) { return (n * 100).toFixed(1) + '%'; }

// ─────────────────────────────────────────────────────────────

export default function ListingCard({ listing, isSaved, onSave, onClick }) {
  const { metrics, verdict } = listing;
  const tagMeta = snapshotTagMeta(listing.snapshot_tag);

  function handleSave(e) {
    e.stopPropagation();
    onSave(listing.id);
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onClick(listing)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(listing)}
      className={[
        'group relative bg-white rounded-xl border border-slate-200',
        'border-l-4 shadow-sm cursor-pointer select-none',
        'hover:shadow-md hover:border-slate-300 transition-all duration-150',
        VERDICT_BORDER[verdict],
      ].join(' ')}
    >
      {/* ── Top row ───────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
        {/* Left: address + badges */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <h3 className="text-sm font-semibold text-slate-800 leading-snug truncate">
              {listing.address}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Property type */}
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">
              {listing.type}
            </span>
            {/* Snapshot tag */}
            {tagMeta && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${tagMeta.cls}`}>
                {tagMeta.icon && <span className="mr-0.5">{tagMeta.icon}</span>}
                {tagMeta.label}
              </span>
            )}
          </div>
        </div>

        {/* Right: price + rent + verdict */}
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-slate-900 leading-tight">
            {fmtUSD(listing.price)}
          </p>
          {listing.rentEstimate ? (
            <p className="text-xs text-slate-400 leading-tight">
              {fmtUSD(listing.rentEstimate)}
              <span className="text-[10px]">/mo</span>
            </p>
          ) : (
            <p className="text-xs text-slate-400 leading-tight italic">Open for rent est.</p>
          )}
          {verdict && (
            <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${VERDICT_BADGE[verdict]}`}>
              {VERDICT_LABELS[verdict]}
            </span>
          )}
        </div>
      </div>

      {/* ── Sub row ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 px-4 pb-3 text-xs text-slate-500">
        <span>{listing.city}, {listing.state}</span>
        {listing.beds      && <><span className="text-slate-300">·</span><span>{listing.beds} bd</span></>}
        {listing.baths     && <><span className="text-slate-300">·</span><span>{listing.baths} ba</span></>}
        {listing.sqft      && <><span className="text-slate-300">·</span><span>{fmt(listing.sqft)} sqft</span></>}
        {listing.year      && <><span className="text-slate-300">·</span><span>Built {listing.year}</span></>}
      </div>

      {/* ── Metrics pills ─────────────────────────────────── */}
      {metrics && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          <MetricPill label="CoC"  value={fmtPct(metrics.CoCReturn)}    color={metricColor('coc',  metrics.CoCReturn)} />
          <MetricPill label="Cap"  value={fmtPct(metrics.capRate)}       color={metricColor('cap',  metrics.capRate)} />
          <MetricPill label="DSCR" value={metrics.DSCR.toFixed(2)}       color={metricColor('dscr', metrics.DSCR)} />
          <MetricPill label="GRM"  value={metrics.GRM.toFixed(1)}        color={metricColor('grm',  metrics.GRM)} />
          <MetricPill label="Down" value={fmtUSD(metrics.equity)}        color="bg-slate-100 text-slate-600" />
        </div>
      )}

      {/* ── Bottom action row ─────────────────────────────── */}
      <div
        className="flex items-center justify-between border-t border-slate-100 px-4 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] text-slate-400 uppercase tracking-wide">
          {metrics ? (
            <>Mo. CF&nbsp;
              <span className={`font-semibold ${metrics.monthlyCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {fmtUSD(metrics.monthlyCashFlow)}
              </span>
            </>
          ) : (
            <span className="italic">No rent est. yet</span>
          )}
        </span>

        <button
          onClick={handleSave}
          aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
          className={[
            'flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition',
            isSaved
              ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700',
          ].join(' ')}
        >
          {isSaved ? (
            <>
              <HeartFilledIcon />
              Saved
            </>
          ) : (
            <>
              <HeartOutlineIcon />
              Save
            </>
          )}
        </button>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components

function MetricPill({ label, value, color }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>
      <span className="text-[9px] font-normal opacity-70 uppercase tracking-wide">{label}</span>
      {value}
    </span>
  );
}

function HeartFilledIcon() {
  return (
    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function HeartOutlineIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}
