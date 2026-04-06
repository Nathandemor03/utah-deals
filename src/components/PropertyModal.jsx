import { useState, useMemo, useEffect } from 'react';
import { calcMetrics } from '../lib/calculations';
import { fetchRentEstimate } from '../lib/mlsApi';

// ─── Formatting helpers ────────────────────────────────────────────────────────

function fmt(n)     { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n); }
function fmtUSD(n)  { return '$' + fmt(Math.round(n)); }
function fmtPct(n)  { return (n * 100).toFixed(1) + '%'; }
function fmtPct2(n) { return (n * 100).toFixed(2) + '%'; }

// ─── Color helpers ─────────────────────────────────────────────────────────────

function cocColor(v)       { return v >= 0.07 ? 'text-emerald-600' : v >= 0.04 ? 'text-amber-500' : 'text-rose-600'; }
function capColor(v)       { return v >= 0.055 ? 'text-emerald-600' : v >= 0.04 ? 'text-amber-500' : 'text-rose-600'; }
function dscrColor(v)      { return v >= 1.25 ? 'text-emerald-600' : v >= 1.0 ? 'text-amber-500' : 'text-rose-600'; }
function cfColor(v)        { return v > 0 ? 'text-emerald-600' : v > -200 ? 'text-amber-500' : 'text-rose-600'; }
function grmColor(v)       { return v <= 12 ? 'text-emerald-600' : v <= 15 ? 'text-amber-500' : 'text-rose-600'; }
function beColor(v)        { return v <= 0.80 ? 'text-emerald-600' : v <= 0.90 ? 'text-amber-500' : 'text-rose-600'; }

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
      {children}
    </h3>
  );
}

function DetailPill({ label, value }) {
  if (value == null || value === '' || value === false) return null;
  return (
    <span className="inline-flex gap-1 items-baseline text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </span>
  );
}

function MetricCell({ label, value, colorClass, target }) {
  return (
    <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl p-3 gap-0.5">
      <span className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold leading-none ${colorClass}`}>{value}</span>
      {target && <span className="text-[9px] text-slate-400 mt-0.5">{target}</span>}
    </div>
  );
}

function TableRow({ label, value, sub = false, bold = false, separator = false }) {
  return (
    <tr className={separator ? 'border-t border-slate-200' : ''}>
      <td className={`py-1.5 pr-4 text-sm ${sub ? 'pl-4 text-slate-400' : bold ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
        {label}
      </td>
      <td className={`py-1.5 text-right text-sm tabular-nums ${bold ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>
        {value}
      </td>
    </tr>
  );
}

// ─── Photo Gallery ─────────────────────────────────────────────────────────────

function PhotoGallery({ photos, fallbackType, fallbackAddress }) {
  const [idx, setIdx] = useState(0);
  const hasPhotos = Array.isArray(photos) && photos.length > 0;

  if (!hasPhotos) {
    return (
      <div className="w-full h-52 bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center gap-2 rounded-t-2xl">
        <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
            d="M3 9.75L12 4l9 5.75V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.75z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 21V12h6v9" />
        </svg>
        <p className="text-xs text-slate-400 font-medium">{fallbackType}</p>
        <p className="text-xs text-slate-400">{fallbackAddress}</p>
      </div>
    );
  }

  const prev = (e) => { e.stopPropagation(); setIdx((i) => (i - 1 + photos.length) % photos.length); };
  const next = (e) => { e.stopPropagation(); setIdx((i) => (i + 1) % photos.length); };

  return (
    <div className="relative w-full h-52 bg-slate-900 rounded-t-2xl overflow-hidden">
      <img
        src={photos[idx]}
        alt={`Property photo ${idx + 1}`}
        className="w-full h-full object-cover"
      />

      {photos.length > 1 && (
        <>
          <button onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {photos.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                className={`w-1.5 h-1.5 rounded-full transition ${i === idx ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        </>
      )}

      <div className="absolute top-2 right-2 text-[10px] font-medium bg-black/50 text-white px-2 py-0.5 rounded-full">
        {idx + 1} / {photos.length}
      </div>
    </div>
  );
}

// ─── Scenario Slider ───────────────────────────────────────────────────────────

function ScenarioSlider({ label, value, min, max, step, format, onChange }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <span className="text-sm font-semibold text-slate-800">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full accent-blue-600 cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

const RENT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function loadRentCache(id) {
  try {
    const raw = localStorage.getItem(`utah_deals_rent_${id}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > RENT_CACHE_TTL) return null;
    return entry;
  } catch { return null; }
}

function saveRentCache(id, rent, rentRangeLow, rentRangeHigh) {
  try {
    localStorage.setItem(`utah_deals_rent_${id}`, JSON.stringify({ rent, rentRangeLow, rentRangeHigh, timestamp: Date.now() }));
  } catch {}
}

export default function PropertyModal({ listing, isSaved, onSave, onClose, notes = [], onAddNote }) {
  const [noteText, setNoteText] = useState('');

  // Rent estimate — fetch lazily (1 API call per unique listing opened)
  const [rentEstimate, setRentEstimate]   = useState(() => listing.rentEstimate ?? null);
  const [rentLoading,  setRentLoading]    = useState(!listing.rentEstimate);

  useEffect(() => {
    if (listing.rentEstimate) return; // already have it from cache
    const cached = loadRentCache(listing.id);
    if (cached) {
      setRentEstimate(cached.rent);
      setRentLoading(false);
      return;
    }
    let cancelled = false;
    fetchRentEstimate(
      listing.address,
      listing.type === 'Multi-Family' ? 'Multi Family' : 'Single Family',
      listing.beds,
      listing.baths,
      listing.sqft,
    ).then(({ rent, rentRangeLow, rentRangeHigh }) => {
      if (cancelled) return;
      setRentEstimate(rent);
      setRentLoading(false);
      saveRentCache(listing.id, rent, rentRangeLow, rentRangeHigh);
    }).catch(() => {
      if (!cancelled) setRentLoading(false);
    });
    return () => { cancelled = true; };
  }, [listing.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive metrics from the fetched rent estimate
  const metrics = useMemo(
    () => rentEstimate ? calcMetrics(Number(listing.price), rentEstimate) : null,
    [listing.price, rentEstimate],
  );

  // Scenario state — defaults match calcMetrics defaults
  const [scenarioRent, setScenarioRent] = useState(() => listing.rentEstimate ?? 0);
  const [scenarioLTV,  setScenarioLTV]  = useState(0.70);
  const [scenarioRate, setScenarioRate] = useState(0.065);

  // Update scenario default once rent estimate loads
  useEffect(() => {
    if (rentEstimate && !listing.rentEstimate) setScenarioRent(rentEstimate);
  }, [rentEstimate]); // eslint-disable-line react-hooks/exhaustive-deps

  const scenarioMetrics = useMemo(
    () => scenarioRent > 0 ? calcMetrics(Number(listing.price), scenarioRent, scenarioLTV, scenarioRate) : null,
    [listing.price, scenarioRent, scenarioLTV, scenarioRate],
  );

  // Escape to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!listing) return null;

  const verdict = metrics
    ? (metrics.CoCReturn >= 0.07 ? 'buy' : metrics.CoCReturn >= 0.04 ? 'watch' : 'pass')
    : null;
  const sqftPrice = listing.sqft ? listing.price / listing.sqft : null;

  function handleAddNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    onAddNote(noteText.trim());
    setNoteText('');
  }

  const VERDICT_BADGE = {
    buy:   'bg-emerald-100 text-emerald-800',
    watch: 'bg-amber-100 text-amber-800',
    pass:  'bg-slate-100 text-slate-500',
  };
  const VERDICT_LABELS = { buy: 'Strong Buy', watch: 'Worth a Look', pass: 'Pass' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full sm:max-w-2xl max-h-[95dvh] sm:max-h-[90vh] overflow-y-auto bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl">

        {/* ── Close button ──────────────────────────────────── */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-white/80 backdrop-blur text-slate-400 hover:text-slate-700 hover:bg-white transition shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* ══════════════════════════════════════════════════════
            1. PHOTO GALLERY
        ══════════════════════════════════════════════════════ */}
        <PhotoGallery
          photos={listing.photos}
          fallbackType={listing.type}
          fallbackAddress={listing.address}
        />

        <div className="p-5 space-y-6">

          {/* ══════════════════════════════════════════════════
              2. HEADER
          ══════════════════════════════════════════════════ */}
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">{listing.address}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{listing.city}, {listing.state}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-bold text-slate-900 leading-none">{fmtUSD(listing.price)}</p>
                {sqftPrice && (
                  <p className="text-xs text-slate-400 mt-0.5">{fmtUSD(sqftPrice)}/sqft</p>
                )}
                <span className={`inline-block mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${VERDICT_BADGE[verdict]}`}>
                  {VERDICT_LABELS[verdict]}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              <DetailPill label="Type"    value={listing.type} />
              <DetailPill label="Beds"    value={listing.beds} />
              <DetailPill label="Baths"   value={listing.baths} />
              <DetailPill label="Sqft"    value={listing.sqft ? fmt(listing.sqft) : null} />
              <DetailPill label="Built"   value={listing.year} />
              <DetailPill label="Lot"     value={listing.lot ? (listing.lot.toFixed(2) + ' ac') : null} />
              <DetailPill label="Garage"  value={listing.garage ? 'Yes' : null} />
              <DetailPill label="HOA"     value={listing.hoa > 0 ? fmtUSD(listing.hoa) + '/mo' : null} />
              <DetailPill label="Rent est." value={rentEstimate ? fmtUSD(rentEstimate) + '/mo' : (rentLoading ? 'Fetching…' : '—')} />
            </div>

            {listing.snapshot_note && (
              <p className="mt-3 text-sm text-slate-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                {listing.snapshot_note}
              </p>
            )}
          </div>

          {/* ══════════════════════════════════════════════════
              3. KEY METRICS GRID
          ══════════════════════════════════════════════════ */}
          <div>
            <SectionTitle>Key Metrics</SectionTitle>
            {metrics ? (
              <div className="grid grid-cols-3 gap-2">
                <MetricCell label="CoC Return"   value={fmtPct(metrics.CoCReturn)}          colorClass={cocColor(metrics.CoCReturn)}          target="Target 7–10%" />
                <MetricCell label="Cap Rate"     value={fmtPct(metrics.capRate)}             colorClass={capColor(metrics.capRate)}             target="Target ≥ 5.5%" />
                <MetricCell label="DSCR"         value={metrics.DSCR.toFixed(2)}             colorClass={dscrColor(metrics.DSCR)}               target="Target 1.2+" />
                <MetricCell label="Mo. Cash Flow" value={fmtUSD(metrics.monthlyCashFlow)}    colorClass={cfColor(metrics.monthlyCashFlow)}      target="Target > $0" />
                <MetricCell label="GRM"          value={metrics.GRM.toFixed(1)}              colorClass={grmColor(metrics.GRM)}                 target="Target ≤ 12" />
                <MetricCell label="Break-Even"   value={fmtPct(metrics.breakEvenOccupancy)}  colorClass={beColor(metrics.breakEvenOccupancy)}   target="Target ≤ 80%" />
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">
                {rentLoading ? 'Fetching rent estimate…' : 'Rent estimate unavailable'}
              </p>
            )}
          </div>

          {/* ══════════════════════════════════════════════════
              4. ANNUAL COST BREAKDOWN
          ══════════════════════════════════════════════════ */}
          {metrics && (
            <div>
              <SectionTitle>Annual Cost Breakdown</SectionTitle>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <tbody className="divide-y divide-slate-100">
                    <TableRow label="Gross rental income"        value={fmtUSD(metrics.grossRent)} />
                    <TableRow label="Vacancy (7%)"               value={`– ${fmtUSD(metrics.vacancy)}`} sub />
                    <TableRow label="Effective gross income"     value={fmtUSD(metrics.effectiveRent)} bold separator />
                    <TableRow label="Property tax (1%)"          value={`– ${fmtUSD(metrics.annualTax)}`} sub />
                    <TableRow label="Insurance (0.25%)"          value={`– ${fmtUSD(metrics.annualInsurance)}`} sub />
                    <TableRow label="Mgmt / overhead (0.5%)"     value={`– ${fmtUSD(metrics.annualMgmt)}`} sub />
                    <TableRow label="Net Operating Income (NOI)" value={fmtUSD(metrics.NOI)} bold separator />
                    <TableRow label="Annual debt service"        value={`– ${fmtUSD(metrics.annualDebtService)}`} sub />
                    <TableRow label="Annual cash flow"           value={fmtUSD(metrics.NOI - metrics.annualDebtService)} bold separator />
                  </tbody>
                </table>
              </div>
              <div className="mt-2.5 flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                <span className="text-xs text-blue-700">Rent needed for <strong>7% CoC</strong></span>
                <span className="text-sm font-bold text-blue-800">{fmtUSD(metrics.rentNeeded)}/mo</span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              5. SCENARIO ANALYSIS
          ══════════════════════════════════════════════════ */}
          {scenarioRent > 0 && (
          <div>
            <SectionTitle>Scenario Analysis</SectionTitle>
            <div className="space-y-4 bg-slate-50 rounded-xl p-4 mb-4">
              <ScenarioSlider
                label="Monthly Rent"
                value={scenarioRent}
                min={Math.round(scenarioRent * 0.5 / 50) * 50}
                max={Math.round(scenarioRent * 2.0 / 50) * 50}
                step={50}
                format={(v) => fmtUSD(v) + '/mo'}
                onChange={setScenarioRent}
              />
              <ScenarioSlider
                label="LTV"
                value={scenarioLTV}
                min={0.55} max={0.80} step={0.01}
                format={(v) => fmtPct(v)}
                onChange={setScenarioLTV}
              />
              <ScenarioSlider
                label="Interest Rate"
                value={scenarioRate}
                min={0.04} max={0.10} step={0.0025}
                format={(v) => fmtPct2(v)}
                onChange={setScenarioRate}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <ScenarioResult
                label="CoC Return"
                value={fmtPct(scenarioMetrics.CoCReturn)}
                colorClass={cocColor(scenarioMetrics.CoCReturn)}
              />
              <ScenarioResult
                label="Mo. Cash Flow"
                value={fmtUSD(scenarioMetrics.monthlyCashFlow)}
                colorClass={cfColor(scenarioMetrics.monthlyCashFlow)}
              />
              <ScenarioResult
                label="DSCR"
                value={scenarioMetrics.DSCR.toFixed(2)}
                colorClass={dscrColor(scenarioMetrics.DSCR)}
              />
            </div>
          </div>
          )}

          {/* ══════════════════════════════════════════════════
              6. NOTES
          ══════════════════════════════════════════════════ */}
          <div>
            <SectionTitle>Notes</SectionTitle>
            <form onSubmit={handleAddNote} className="flex gap-2 mb-3">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(e); }}}
                placeholder="Add a note… (Enter to save)"
                rows={2}
                className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-700 placeholder-slate-400"
              />
              <button
                type="submit"
                disabled={!noteText.trim()}
                className="self-end px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Save
              </button>
            </form>

            {notes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No notes yet.</p>
            ) : (
              <ul className="space-y-2">
                {notes.map((note) => (
                  <li key={note.id} className="bg-slate-50 rounded-lg px-3 py-2.5">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.body}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(note.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ══════════════════════════════════════════════════
              7. ACTION ROW
          ══════════════════════════════════════════════════ */}
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={() => onSave(listing.id)}
              className={[
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition',
                isSaved
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              ].join(' ')}
            >
              {isSaved ? (
                <>
                  <svg className="w-4 h-4 fill-rose-500" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  Saved
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Save Listing
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

function ScenarioResult({ label, value, colorClass }) {
  return (
    <div className="flex flex-col items-center bg-white border border-slate-200 rounded-xl p-3 gap-0.5">
      <span className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</span>
      <span className={`text-xl font-bold leading-none ${colorClass}`}>{value}</span>
    </div>
  );
}
