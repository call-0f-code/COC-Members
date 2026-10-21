import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useBirthdayMonth, useTodayBirthdays, useUpcomingBirthdays } from '@/hooks/useBirthdays';
import { ChevronLeft, ChevronRight, Calendar, Gift, Cake, PartyPopper, Clock } from 'lucide-react';
import BirthdayPopup from '@/components/birthday/BirthdayPopup';
import TodayBanner from '@/components/birthday/TodayBanner';
import CalendarCell from '@/components/birthday/CalendarCell';
import UpcomingPanel from '@/components/birthday/UpcomingPanel';
import { MONTH_NAMES, DAY_NAMES, getTodayIST, getCurrentMonthIST, buildCalendarGrid } from '@/utils/birthdayDate';

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export default function BirthdayCalendarPage() {
  const { theme } = useTheme();

  // Initialise to current IST month/year
  const todayIST = getTodayIST();
  const [view, setView] = useState(getCurrentMonthIST);
  const { month: viewMonth, year: viewYear } = view;
  const [popup, setPopup] = useState(null); // { day, members } | null

  // Data queries
  const { members: monthMembers, isLoading: calLoading, error: calError } =
    useBirthdayMonth(viewMonth, viewYear);
  const { members: todayMembers, isLoading: todayLoading } = useTodayBirthdays();
  const { members: upcomingMembers, isLoading: upLoading, error: upError } =
    useUpcomingBirthdays(30);

  // Build a day→members map for the current view month
  const birthdaysByDay = {};
  for (const m of monthMembers) {
    if (!birthdaysByDay[m.day]) birthdaysByDay[m.day] = [];
    birthdaysByDay[m.day].push(m);
  }

  const calendarCells = buildCalendarGrid(viewMonth, viewYear);

  const goToPrevMonth = () =>
    setView((v) => (v.month === 1 ? { month: 12, year: v.year - 1 } : { ...v, month: v.month - 1 }));

  const goToNextMonth = () =>
    setView((v) => (v.month === 12 ? { month: 1, year: v.year + 1 } : { ...v, month: v.month + 1 }));

  const goToToday = () => setView(getCurrentMonthIST());

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
              setView(getCurrentMonthIST());
              openPopup(getTodayIST().day, members);
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
