import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useBirthdayMonth, useTodayBirthdays, useUpcomingBirthdays } from '@/hooks/useBirthdays';
import { ChevronLeft, ChevronRight, Calendar, Gift, Cake, PartyPopper, Clock } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getTodayIST() {
  const now = new Date();
  const str = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [y, m, d] = str.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function firstDayOfMonth(month, year) {
  return new Date(year, month - 1, 1).getDay(); // 0=Sun
}

function buildCalendarGrid(month, year) {
  const totalDays = daysInMonth(month, year);
  const startDow = firstDayOfMonth(month, year);
  const cells = [];

  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  // Pad end to complete final row
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatDaysUntil(daysUntil) {
  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  return `In ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
}

// ─────────────────────────────────────────────────────────────
// Birthday Popup / Modal
// ─────────────────────────────────────────────────────────────

function BirthdayPopup({ members, day, month, year, onClose }) {
  // Keyboard: close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus trap on mount
  useEffect(() => {
    const el = document.getElementById('birthday-popup-close');
    if (el) el.focus();
  }, []);

  const dateStr = `${MONTH_NAMES[month - 1]} ${day}, ${year}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Birthday popup for ${dateStr}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#F5E6D3] dark:bg-[#2C1810] border-4 border-black dark:border-[#F5E6D3] shadow-[12px_12px_0_0_#C1502E] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#C1502E] border-b-4 border-black dark:border-[#F5E6D3] p-6 text-center">
          <div className="text-5xl mb-2">🎂</div>
          <h2 className="text-2xl font-black text-[#F5E6D3] uppercase tracking-wider">
            {dateStr}
          </h2>
          <p className="text-[#F5E6D3]/80 text-sm mt-1 font-bold">
            🎉 {members.length} Birthday{members.length !== 1 ? 's' : ''} Today!
          </p>
        </div>

        {/* Members */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {members.map((m) => (
            <div
              key={m.id}
              className="border-4 border-black dark:border-[#F5E6D3] bg-white dark:bg-[#3d2015] p-4 shadow-[4px_4px_0_0_#C1502E]"
            >
              <div className="flex items-center gap-4 mb-3">
                {/* Avatar */}
                <div className="w-16 h-16 border-4 border-black dark:border-[#F5E6D3] shadow-[3px_3px_0_0_#C1502E] overflow-hidden flex-shrink-0 bg-[#F5E6D3]">
                  {m.profilePhoto ? (
                    <img
                      src={m.profilePhoto}
                      alt={m.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div
                    className={`w-full h-full ${m.profilePhoto ? 'hidden' : 'flex'} items-center justify-center text-2xl font-black text-[#C1502E]`}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                </div>

                <div>
                  <p className="font-black text-lg text-[#2C1810] dark:text-[#F5E6D3] leading-tight">
                    {m.name}
                  </p>
                  <p className="text-[#C1502E] text-sm font-bold">🎂 {MONTH_NAMES[month - 1]} {day}</p>
                </div>
              </div>

              {/* Greeting */}
              <div className="bg-[#F5E6D3] dark:bg-[#1a0e08] border-2 border-black dark:border-[#F5E6D3] p-3">
                <p className="text-sm font-bold text-[#2C1810] dark:text-[#F5E6D3] leading-relaxed">
                  🎉 <strong>Happy Birthday, {m.name.split(' ')[0]}!</strong>
                </p>
                <p className="text-xs text-[#2C1810]/70 dark:text-[#F5E6D3]/70 mt-1 leading-relaxed">
                  Wishing you a wonderful birthday filled with happiness, success, and great memories!
                  We're so glad you're part of Call of Code. 🚀
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Close button */}
        <div className="p-4 border-t-4 border-black dark:border-[#F5E6D3] flex justify-end">
          <button
            id="birthday-popup-close"
            onClick={onClose}
            className="px-6 py-2 font-black border-4 border-black dark:border-[#F5E6D3] bg-[#C1502E] text-[#F5E6D3] shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-150 uppercase tracking-wider"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Today's Birthday Banner
// ─────────────────────────────────────────────────────────────

function TodayBanner({ members, onClickMember }) {
  if (!members || members.length === 0) return null;

  const names = members.map((m) => m.name.split(' ')[0]);
  const displayNames =
    names.length === 1
      ? names[0]
      : names.length === 2
      ? `${names[0]} and ${names[1]}`
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

  return (
    <div className="border-4 border-black dark:border-[#F5E6D3] bg-[#C1502E] shadow-[6px_6px_0_0_#2C1810] dark:shadow-[6px_6px_0_0_rgba(245,230,211,0.5)] p-4 mb-8 animate-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Avatar strip */}
        <div className="flex -space-x-3 flex-shrink-0">
          {members.slice(0, 4).map((m) => (
            <div
              key={m.id}
              className="w-12 h-12 border-3 border-white rounded-none overflow-hidden shadow-[2px_2px_0_0_#2C1810] bg-[#F5E6D3] flex-shrink-0"
            >
              {m.profilePhoto ? (
                <img src={m.profilePhoto} alt={m.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-black text-[#C1502E]">
                  {m.name.charAt(0)}
                </div>
              )}
            </div>
          ))}
          {members.length > 4 && (
            <div className="w-12 h-12 border-2 border-white bg-[#2C1810] flex items-center justify-center text-xs font-black text-[#F5E6D3] flex-shrink-0">
              +{members.length - 4}
            </div>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <p className="font-black text-[#F5E6D3] text-lg leading-tight">
            🎂 Today is <span className="underline underline-offset-2">{displayNames}</span>'s birthday!
          </p>
          <p className="text-[#F5E6D3]/80 text-sm font-bold mt-0.5">
            Let's wish them a fantastic day! 🎉
          </p>
        </div>

        <button
          onClick={() => onClickMember && onClickMember(members)}
          className="px-4 py-2 border-4 border-[#F5E6D3] bg-[#2C1810] text-[#F5E6D3] font-black text-sm shadow-[3px_3px_0_0_rgba(245,230,211,0.5)] hover:shadow-[5px_5px_0_0_rgba(245,230,211,0.5)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all duration-150 uppercase whitespace-nowrap"
        >
          🎁 Wish Them!
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Calendar Day Cell
// ─────────────────────────────────────────────────────────────

function CalendarCell({ day, isToday, birthdayMembers, onClick }) {
  if (day === null) {
    return <div className="min-h-[72px] sm:min-h-[90px] border-2 border-black/20 dark:border-[#F5E6D3]/10 bg-black/5 dark:bg-white/5" />;
  }

  const hasBirthday = birthdayMembers.length > 0;

  return (
    <div
      onClick={hasBirthday ? onClick : undefined}
      className={[
        'min-h-[72px] sm:min-h-[90px] border-2 border-black dark:border-[#F5E6D3] p-1.5 sm:p-2 flex flex-col gap-1 relative transition-all duration-150',
        hasBirthday
          ? 'cursor-pointer bg-[#FFF3E0] dark:bg-[#3d2015] hover:shadow-[4px_4px_0_0_#C1502E] hover:-translate-x-0.5 hover:-translate-y-0.5'
          : 'bg-[#F5E6D3] dark:bg-[#2C1810]',
        isToday
          ? 'ring-4 ring-[#C1502E] ring-inset'
          : '',
      ].join(' ')}
      aria-label={hasBirthday ? `${birthdayMembers.length} birthday(s) on day ${day}` : `Day ${day}`}
      role={hasBirthday ? 'button' : undefined}
      tabIndex={hasBirthday ? 0 : undefined}
      onKeyDown={hasBirthday ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {/* Day number */}
      <span
        className={[
          'text-sm sm:text-base font-black leading-none self-start',
          isToday
            ? 'bg-[#C1502E] text-[#F5E6D3] px-1.5 py-0.5'
            : 'text-[#2C1810] dark:text-[#F5E6D3]',
        ].join(' ')}
      >
        {day}
      </span>

      {/* Birthday indicators */}
      {hasBirthday && (
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          {birthdayMembers.slice(0, 2).map((m) => (
            <div key={m.id} className="flex items-center gap-1 min-w-0">
              {m.profilePhoto ? (
                <img
                  src={m.profilePhoto}
                  alt=""
                  className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-black dark:border-[#F5E6D3] object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-black dark:border-[#F5E6D3] bg-[#C1502E] flex items-center justify-center text-[9px] font-black text-[#F5E6D3] flex-shrink-0">
                  {m.name.charAt(0)}
                </div>
              )}
              <span className="text-[9px] sm:text-[10px] font-black text-[#C1502E] truncate leading-tight">
                {m.name.split(' ')[0]}
              </span>
            </div>
          ))}
          {birthdayMembers.length > 2 && (
            <span className="text-[9px] sm:text-[10px] font-black text-[#C1502E]">
              +{birthdayMembers.length - 2} more 🎂
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Upcoming Birthdays Panel
// ─────────────────────────────────────────────────────────────

function UpcomingPanel({ members, isLoading, error }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 border-4 border-black dark:border-[#F5E6D3] bg-black/10 dark:bg-white/10 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-4 border-black dark:border-[#F5E6D3] bg-[#C1502E]/20 p-4 text-center">
        <p className="font-black text-[#2C1810] dark:text-[#F5E6D3] text-sm">Failed to load upcoming birthdays.</p>
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="border-4 border-black dark:border-[#F5E6D3] p-6 text-center bg-[#F5E6D3] dark:bg-[#2C1810]">
        <p className="text-3xl mb-2">🎈</p>
        <p className="font-black text-[#2C1810] dark:text-[#F5E6D3] text-sm uppercase">No upcoming birthdays in the next 30 days</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {members.map((m) => (
        <div
          key={m.id}
          className="border-4 border-black dark:border-[#F5E6D3] bg-[#F5E6D3] dark:bg-[#2C1810] p-3 flex items-center gap-3 shadow-[3px_3px_0_0_#C1502E] hover:shadow-[5px_5px_0_0_#C1502E] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-150"
        >
          {/* Avatar */}
          <div className="w-11 h-11 border-2 border-black dark:border-[#F5E6D3] overflow-hidden flex-shrink-0 bg-[#C1502E] flex items-center justify-center">
            {m.profilePhoto ? (
              <img src={m.profilePhoto} alt={m.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-black text-[#F5E6D3]">{m.name.charAt(0)}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-black text-[#2C1810] dark:text-[#F5E6D3] text-sm truncate">{m.name}</p>
            <p className="text-xs text-[#2C1810]/60 dark:text-[#F5E6D3]/60 font-bold">
              🎂 {MONTH_NAMES[m.month - 1]} {m.day}
            </p>
          </div>

          {/* Days until badge */}
          <div
            className={[
              'px-2 py-1 border-2 border-black dark:border-[#F5E6D3] text-xs font-black whitespace-nowrap flex-shrink-0',
              m.daysUntil === 0
                ? 'bg-[#C1502E] text-[#F5E6D3]'
                : m.daysUntil <= 7
                ? 'bg-[#2C1810] dark:bg-[#F5E6D3] text-[#F5E6D3] dark:text-[#2C1810]'
                : 'bg-[#F5E6D3] dark:bg-[#2C1810] text-[#2C1810] dark:text-[#F5E6D3]',
            ].join(' ')}
          >
            {formatDaysUntil(m.daysUntil)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export default function BirthdayCalendarPage() {
  const { theme } = useTheme();

  // Initialise to current IST month/year
  const todayIST = getTodayIST();
  const [viewMonth, setViewMonth] = useState(todayIST.month);
  const [viewYear, setViewYear] = useState(todayIST.year);
  const [popup, setPopup] = useState(null); // { day, members } | null

  // Data queries
  const { data: monthMembers = [], isLoading: calLoading, error: calError } =
    useBirthdayMonth(viewMonth, viewYear);
  const { data: todayMembers = [], isLoading: todayLoading } = useTodayBirthdays();
  const { data: upcomingMembers = [], isLoading: upLoading, error: upError } =
    useUpcomingBirthdays(30);

  // Build a day→members map for the current view month
  const birthdaysByDay = {};
  for (const m of monthMembers) {
    if (!birthdaysByDay[m.day]) birthdaysByDay[m.day] = [];
    birthdaysByDay[m.day].push(m);
  }

  const calendarCells = buildCalendarGrid(viewMonth, viewYear);

  const goToPrevMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev === 1) { setViewYear((y) => y - 1); return 12; }
      return prev - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev === 12) { setViewYear((y) => y + 1); return 1; }
      return prev + 1;
    });
  }, []);

  const goToToday = useCallback(() => {
    setViewMonth(todayIST.month);
    setViewYear(todayIST.year);
  }, [todayIST.month, todayIST.year]);

  const openPopup = (day, members) => setPopup({ day, members });
  const closePopup = () => setPopup(null);

  const isCurrentMonth =
    viewMonth === todayIST.month && viewYear === todayIST.year;

  return (
    <main className={`min-h-screen transition-colors duration-300 pb-16 ${theme === 'dark' ? 'dark bg-[#2C1810]' : 'bg-[#F5E6D3]'}`}>
      {/* Page header */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 pt-8 sm:pt-12">
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#C1502E] p-2 border-4 border-black dark:border-[#F5E6D3] shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_rgba(245,230,211,1)]">
              <Cake className="w-6 h-6 text-[#F5E6D3]" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#2C1810] dark:text-[#F5E6D3] uppercase tracking-tight">
              Birthday Calendar
            </h1>
          </div>
        </div>

        {/* Today's birthday banner */}
        {!todayLoading && (
          <TodayBanner
            members={todayMembers}
            onClickMember={(members) => {
              const today = getTodayIST();
              if (viewMonth !== today.month || viewYear !== today.year) {
                setViewMonth(today.month);
                setViewYear(today.year);
              }
              openPopup(today.day, members);
            }}
          />
        )}

        {/* Main layout: Calendar + Sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          {/* ── Calendar ── */}
          <div>
            {/* Calendar navigation */}
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPrevMonth}
                  aria-label="Previous month"
                  className="flex items-center justify-center w-10 h-10 border-4 border-black dark:border-[#F5E6D3] bg-[#F5E6D3] dark:bg-[#2C1810] text-[#2C1810] dark:text-[#F5E6D3] shadow-[4px_4px_0_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_0_rgba(245,230,211,1)] hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-150"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <h2 className="text-xl sm:text-2xl font-black text-[#2C1810] dark:text-[#F5E6D3] min-w-[200px] text-center uppercase tracking-wide">
                  {MONTH_NAMES[viewMonth - 1]} {viewYear}
                </h2>

                <button
                  onClick={goToNextMonth}
                  aria-label="Next month"
                  className="flex items-center justify-center w-10 h-10 border-4 border-black dark:border-[#F5E6D3] bg-[#F5E6D3] dark:bg-[#2C1810] text-[#2C1810] dark:text-[#F5E6D3] shadow-[4px_4px_0_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_0_rgba(245,230,211,1)] hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-150"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {!isCurrentMonth && (
                <button
                  onClick={goToToday}
                  className="flex items-center gap-2 px-4 py-2 border-4 border-black dark:border-[#F5E6D3] bg-[#C1502E] text-[#F5E6D3] font-black text-sm shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-150 uppercase"
                >
                  <Calendar className="w-4 h-4" />
                  Today
                </button>
              )}
            </div>

            {/* Calendar grid */}
            <div className="border-4 border-black dark:border-[#F5E6D3] shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_rgba(245,230,211,0.3)] overflow-hidden">
              {/* Day header row */}
              <div className="grid grid-cols-7 border-b-4 border-black dark:border-[#F5E6D3] bg-[#2C1810] dark:bg-[#1a0e08]">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="py-2 text-center text-[#F5E6D3] font-black text-xs sm:text-sm uppercase tracking-wider border-r-2 border-[#F5E6D3]/20 last:border-r-0">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar loading state */}
              {calLoading ? (
                <div className="grid grid-cols-7">
                  {[...Array(35)].map((_, i) => (
                    <div key={i} className="min-h-[72px] sm:min-h-[90px] border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : calError ? (
                <div className="p-10 text-center bg-[#F5E6D3] dark:bg-[#2C1810]">
                  <p className="text-3xl mb-3">⚠️</p>
                  <p className="font-black text-[#2C1810] dark:text-[#F5E6D3] text-lg uppercase">Failed to load calendar</p>
                  <p className="text-[#2C1810]/60 dark:text-[#F5E6D3]/60 text-sm mt-1">Please check your connection and try again.</p>
                </div>
              ) : (
                <div className="grid grid-cols-7">
                  {calendarCells.map((day, idx) => {
                    const isToday =
                      isCurrentMonth &&
                      day === todayIST.day;
                    const members = day ? (birthdaysByDay[day] ?? []) : [];
                    return (
                      <CalendarCell
                        key={idx}
                        day={day}
                        isToday={isToday}
                        birthdayMembers={members}
                        onClick={() => openPopup(day, members)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-4 border-[#C1502E] bg-[#FFF3E0] dark:bg-[#3d2015]" />
                <span className="font-bold text-[#2C1810] dark:text-[#F5E6D3]">Has birthday(s)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 ring-4 ring-[#C1502E] ring-inset border-2 border-black dark:border-[#F5E6D3] bg-[#F5E6D3] dark:bg-[#2C1810]" />
                <span className="font-bold text-[#2C1810] dark:text-[#F5E6D3]">Today</span>
              </div>
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-[#C1502E]" />
                <span className="font-bold text-[#2C1810] dark:text-[#F5E6D3]">Click birthday dates to celebrate!</span>
              </div>
            </div>
          </div>

          {/* ── Sidebar: Upcoming Birthdays ── */}
          <div>
            <div className="border-4 border-black dark:border-[#F5E6D3] shadow-[6px_6px_0_0_#C1502E]">
              {/* Panel header */}
              <div className="bg-[#2C1810] dark:bg-[#1a0e08] border-b-4 border-black dark:border-[#F5E6D3] p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#C1502E]" />
                <h3 className="font-black text-[#F5E6D3] uppercase tracking-wider text-sm">
                  Upcoming (30 days)
                </h3>
                {!upLoading && upcomingMembers.length > 0 && (
                  <span className="ml-auto bg-[#C1502E] text-[#F5E6D3] text-xs font-black px-2 py-0.5 border-2 border-[#F5E6D3]">
                    {upcomingMembers.length}
                  </span>
                )}
              </div>

              <div className="p-4 bg-[#F5E6D3] dark:bg-[#2C1810] max-h-[600px] overflow-y-auto">
                <UpcomingPanel
                  members={upcomingMembers}
                  isLoading={upLoading}
                  error={upError}
                />
              </div>
            </div>

            {/* Stats card */}
            {!calLoading && !calError && (
              <div className="mt-4 border-4 border-black dark:border-[#F5E6D3] bg-[#C1502E] shadow-[6px_6px_0_0_#2C1810] dark:shadow-[6px_6px_0_0_rgba(245,230,211,0.3)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <PartyPopper className="w-5 h-5 text-[#F5E6D3]" />
                  <h4 className="font-black text-[#F5E6D3] uppercase tracking-wider text-sm">This Month</h4>
                </div>
                <p className="text-4xl font-black text-[#F5E6D3]">{monthMembers.length}</p>
                <p className="text-[#F5E6D3]/80 font-bold text-sm mt-1">
                  Birthday{monthMembers.length !== 1 ? 's' : ''} in {MONTH_NAMES[viewMonth - 1]}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Birthday popup */}
      {popup && (
        <BirthdayPopup
          members={popup.members}
          day={popup.day}
          month={viewMonth}
          year={viewYear}
          onClose={closePopup}
        />
      )}

      {/* Decorative brutalist accents */}
      <div className="fixed bottom-10 left-8 w-10 h-10 bg-[#C1502E] border-4 border-black dark:border-[#F5E6D3] rotate-45 opacity-20 pointer-events-none z-0" />
      <div className="fixed top-1/3 right-6 w-6 h-20 bg-[#2C1810] dark:bg-[#F5E6D3] border-4 border-black dark:border-[#F5E6D3] -rotate-12 opacity-10 pointer-events-none z-0" />
    </main>
  );
}
