import React, { useMemo, useState } from 'react';
import {
  MapPin,
  Image,
  Video,
  Mic,
  Navigation,
  ArrowUpRight,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  CalendarHeart,
  History,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../services/api/client';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const OWNER_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'owner', label: 'My Pins' },
  { id: 'shared', label: 'Shared' },
];

/** "YYYY-MM-DD..." -> local Date (no timezone shift), or null. */
function parseDay(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function mediaUrl(item) {
  const url = item.url || '';
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

/**
 * Group memories into [{ year, months: [{ month, items }] }], sorted by date.
 * Memories without a valid date go into a trailing "Undated" group.
 */
function groupByYearMonth(memories, newestFirst) {
  const dir = newestFirst ? -1 : 1;
  const dated = [];
  const undated = [];
  memories.forEach((m) => {
    const day = parseDay(m.date);
    if (day) dated.push({ memory: m, day });
    else undated.push({ memory: m, day: null });
  });
  dated.sort((a, b) => dir * (a.day - b.day));

  const years = [];
  dated.forEach((entry) => {
    const year = entry.day.getFullYear();
    const month = entry.day.getMonth();
    let y = years[years.length - 1];
    if (!y || y.year !== year) {
      y = { year, months: [] };
      years.push(y);
    }
    let mo = y.months[y.months.length - 1];
    if (!mo || mo.month !== month) {
      mo = { month, items: [] };
      y.months.push(mo);
    }
    mo.items.push(entry);
  });
  if (undated.length) years.push({ year: 'Undated', months: [{ month: null, items: undated }] });
  return years;
}

export const TimelineView = ({
  memories = [],
  onLocateOnMap,
  onViewDetails,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [newestFirst, setNewestFirst] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState('all');

  const visible = useMemo(
    () => (ownerFilter === 'all' ? memories : memories.filter((m) => m.accessType === ownerFilter)),
    [memories, ownerFilter],
  );
  const groups = useMemo(() => groupByYearMonth(visible, newestFirst), [visible, newestFirst]);
  const yearCount = groups.filter((g) => g.year !== 'Undated').length;

  // Memories from today's date in earlier years.
  const onThisDay = useMemo(() => {
    const today = new Date();
    return memories.filter((m) => {
      const d = parseDay(m.date);
      return d && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
        && d.getFullYear() < today.getFullYear();
    });
  }, [memories]);

  const jumpToYear = (year) => {
    document.getElementById(`timeline-year-${year}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const chip = (active) => `px-3 py-1.5 rounded-xl border-2 border-[#1a2c35] text-xs font-semibold transition-colors cursor-pointer
    ${active
      ? 'bg-[#ffb72b] text-[#1a2c35]'
      : isDark ? 'bg-[#0d292e] text-neutral-200 hover:bg-[#0f4347]' : 'bg-white text-[#1a2c35] hover:bg-[#fffae8]'}`;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-xs font-medium opacity-65">
          {visible.length} {visible.length === 1 ? 'memory' : 'memories'}
          {yearCount > 0 && ` across ${yearCount} ${yearCount === 1 ? 'year' : 'years'}`}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {OWNER_FILTERS.map((f) => (
            <button key={f.id} type="button" onClick={() => setOwnerFilter(f.id)} className={chip(ownerFilter === f.id)}>
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setNewestFirst((v) => !v)}
            className={`${chip(false)} flex items-center gap-1.5`}
            aria-label={newestFirst ? 'Showing newest first' : 'Showing oldest first'}
          >
            {newestFirst ? <ArrowDownWideNarrow className="w-3.5 h-3.5" /> : <ArrowUpNarrowWide className="w-3.5 h-3.5" />}
            {newestFirst ? 'Newest first' : 'Oldest first'}
          </button>
        </div>
      </div>

      {/* Year jump bar */}
      {groups.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Jump to year">
          {groups.map((g) => (
            <button
              key={g.year}
              type="button"
              onClick={() => jumpToYear(g.year)}
              className={`shrink-0 px-2.5 py-1 rounded-lg border border-[#1a2c35] text-[11px] font-bold cursor-pointer
                ${isDark ? 'bg-[#0a2327] text-neutral-200 hover:text-[#ffb72b]' : 'bg-[#faf8f5] text-[#1a2c35] hover:bg-[#fffae8]'}`}
            >
              {g.year}
            </button>
          ))}
        </div>
      )}

      {/* On this day */}
      {onThisDay.length > 0 && (
        <div className={`rounded-2xl border-2.5 border-[#1a2c35] p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3
          ${isDark ? 'bg-[#0f4347] text-white' : 'bg-[#fffae8] text-[#1a2c35]'}`}
        >
          <div className="flex items-center gap-2 shrink-0">
            <CalendarHeart className="w-5 h-5 text-[#02a896] dark:text-[#ffb72b]" />
            <span className="font-chunky font-bold text-sm">On this day</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {onThisDay.map((m) => {
              const yearsAgo = new Date().getFullYear() - parseDay(m.date).getFullYear();
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onViewDetails(m)}
                  className={`px-2.5 py-1 rounded-lg border border-[#1a2c35] text-xs font-medium cursor-pointer
                    ${isDark ? 'bg-[#0d292e] hover:text-[#ffb72b]' : 'bg-white hover:bg-[#fff3cc]'}`}
                >
                  {m.title} · {yearsAgo} {yearsAgo === 1 ? 'year' : 'years'} ago
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline */}
      {visible.length === 0 ? (
        <div className={`p-8 rounded-2xl border-2 border-[#1a2c35] text-center max-w-sm mx-auto
          ${isDark ? 'bg-[#0d292e] text-white' : 'bg-white text-[#1a2c35]'}`}
        >
          <History className="w-8 h-8 mx-auto mb-2 opacity-60" />
          <p className="font-chunky font-bold">No memories yet</p>
          <p className="text-xs opacity-65 mt-1">Pins you create or are invited to will appear here in date order.</p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.year} id={`timeline-year-${group.year}`} className="scroll-mt-4">
            <h2 className="font-chunky font-bold text-xl sm:text-2xl mb-2 text-[#02a896] dark:text-[#ffb72b]">
              {group.year}
            </h2>

            {group.months.map((mo) => (
              <div key={mo.month ?? 'none'} className="mb-4">
                {mo.month !== null && (
                  <h3 className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2 ml-8 sm:ml-10">
                    {MONTHS[mo.month]}
                  </h3>
                )}

                {/* Vertical line with one dot per memory */}
                <ol className="relative ml-3 sm:ml-4 border-l-2 border-dashed border-[#1a2c35]/40 dark:border-[#1a2c35]">
                  {mo.items.map(({ memory, day }) => (
                    <TimelineEntry
                      key={memory.id}
                      memory={memory}
                      day={day}
                      isDark={isDark}
                      onViewDetails={onViewDetails}
                      onLocateOnMap={onLocateOnMap}
                    />
                  ))}
                </ol>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
};

const TimelineEntry = ({ memory, day, isDark, onViewDetails, onLocateOnMap }) => {
  const photos = (memory.media || []).filter((m) => m.file_type === 'image').slice(0, 3);
  const { photos: photoCount = 0, videos = 0, audios = 0 } = memory.mediaCount || {};

  return (
    <li className="relative pl-5 sm:pl-6 pb-4 last:pb-0">
      <span
        className="absolute -left-[9px] top-4 w-4 h-4 rounded-full border-2 border-[#1a2c35]"
        style={{ backgroundColor: memory.color }}
        aria-hidden="true"
      />

      <article
        aria-label={memory.title}
        className={`rounded-2xl border-2.5 border-[#1a2c35] p-3 sm:p-4 flex gap-3 sm:gap-4 transition-all duration-200 hover:-translate-y-0.5
          ${isDark
            ? 'bg-[#0d292e] text-white shadow-[0_4px_0_0_#041a1d,0_4px_0_2.5px_#1a2c35]'
            : 'bg-white text-[#1a2c35] shadow-[0_4px_0_0_#cbd5e1,0_4px_0_2.5px_#1a2c35]'}`}
      >
        {/* Date badge */}
        <div className={`shrink-0 w-12 sm:w-14 h-14 sm:h-16 rounded-xl border-2 border-[#1a2c35] flex flex-col items-center justify-center
          ${isDark ? 'bg-[#0a2327]' : 'bg-[#fffae8]'}`}
        >
          {day ? (
            <>
              <span className="font-chunky font-bold text-lg sm:text-xl leading-none">{day.getDate()}</span>
              <span className="text-[10px] font-semibold uppercase opacity-70 mt-0.5">{WEEKDAYS[day.getDay()]}</span>
            </>
          ) : (
            <span className="text-[10px] font-semibold opacity-70">—</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-chunky font-bold text-sm sm:text-base leading-snug truncate">{memory.title}</h4>
              <span className="text-xs font-medium opacity-70 flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 text-[#02a896] dark:text-[#ffb72b] shrink-0" />
                <span className="truncate">{memory.locationName}</span>
                {memory.accessType === 'shared' && (
                  <span className="ml-1 px-1.5 rounded border border-[#1a2c35] text-[10px] font-semibold shrink-0">Shared</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onLocateOnMap(memory)}
                title="Locate on map"
                className="p-1.5 rounded-lg border border-[#1a2c35] btn-3d-white cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 text-[#02a896]" />
              </button>
              <button
                type="button"
                onClick={() => onViewDetails(memory)}
                title="View memory"
                className="p-1.5 rounded-lg border border-[#1a2c35] btn-3d-yellow cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-[#1a2c35]" />
              </button>
            </div>
          </div>

          {memory.description && (
            <p className={`mt-1.5 text-xs sm:text-sm font-normal line-clamp-2 leading-relaxed
              ${isDark ? 'text-neutral-300' : 'text-[#1a2c35]/75'}`}
            >
              {memory.description}
            </p>
          )}

          {photos.length > 0 && (
            <div className="mt-2 flex gap-1.5">
              {photos.map((p) => (
                <img
                  key={p.id}
                  src={mediaUrl(p)}
                  alt={p.file_name}
                  loading="lazy"
                  className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg border-2 border-[#1a2c35]"
                />
              ))}
            </div>
          )}

          {(photoCount > 0 || videos > 0 || audios > 0) && (
            <div className="mt-2 flex items-center gap-3 text-[11px] font-medium opacity-70">
              {photoCount > 0 && <span className="flex items-center gap-1"><Image className="w-3 h-3 text-[#02a896]" />{photoCount}</span>}
              {videos > 0 && <span className="flex items-center gap-1"><Video className="w-3 h-3 text-rose-500" />{videos}</span>}
              {audios > 0 && <span className="flex items-center gap-1"><Mic className="w-3 h-3" />{audios}</span>}
            </div>
          )}
        </div>
      </article>
    </li>
  );
};
