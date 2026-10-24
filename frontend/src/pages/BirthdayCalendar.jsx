import { useRef, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useBirthdayMonth, useUpcomingBirthdays } from '@/hooks/useBirthdays';
import { useTodayIST } from '@/hooks/useTodayIST';
import { ChevronLeft, ChevronRight, Calendar, Gift, Cake, PartyPopper, Clock } from 'lucide-react';
import BirthdayPopup from '@/components/birthday/BirthdayPopup';
import BirthdayButton from '@/components/birthday/BirthdayButton';
import TodayBanner from '@/components/birthday/TodayBanner';
import CalendarCell from '@/components/birthday/CalendarCell';
import UpcomingPanel from '@/components/birthday/UpcomingPanel';
import { UPCOMING_BIRTHDAY_WINDOW_DAYS } from '@/constants/birthdayConstants';
import {
  MONTH_NAMES, DAY_NAMES, getCurrentMonthIST, buildCalendarGrid, shiftMonth, upcomingBirthdayDate,
} from '@/utils/birthdayDate';

export default function BirthdayCalendarPage() {
  const { theme } = useTheme();
  const todayIST = useTodayIST();
  const [view, setView] = useState(getCurrentMonthIST);
  const { month: viewMonth, year: viewYear } = view;
  const [popup, setPopup] = useState(null);
  const popupTriggerRef = useRef(null);
  const monthHeadingRef = useRef(null);
  const touchStartRef = useRef(null);

  const monthQuery = useBirthdayMonth(viewMonth, viewYear);
  const upcomingQuery = useUpcomingBirthdays(todayIST.dateKey);
  const isCalendarLoading = monthQuery.isLoading || monthQuery.isPlaceholderData;
  // Previous query data belongs to another month; keep it out of every view.
  const monthMembers = monthQuery.isPlaceholderData ? [] : (monthQuery.data ?? []);
  const upcomingMembers = upcomingQuery.data ?? [];
  const todayMembers = upcomingMembers.filter((member) => member.daysUntil === 0);

  const birthdaysByDay = {};
  for (const member of monthMembers) {
    if (!birthdaysByDay[member.day]) birthdaysByDay[member.day] = [];
    birthdaysByDay[member.day].push(member);
  }

  const calendarCells = buildCalendarGrid(viewMonth, viewYear);
  const calendarWeeks = Array.from({ length: calendarCells.length / 7 }, (_, index) =>
    calendarCells.slice(index * 7, index * 7 + 7));
  const monthLabel = `${MONTH_NAMES[viewMonth - 1]} ${viewYear}`;
  const isCurrentMonth = viewMonth === todayIST.month && viewYear === todayIST.year;
  const changeMonth = (offset) => setView((current) => shiftMonth(current, offset));
  const goToToday = () => setView({ month: todayIST.month, year: todayIST.year });

  const openPopup = (date, members, trigger) => {
    popupTriggerRef.current = trigger;
    setPopup({ date, members });
  };

  const openUpcomingBirthday = (member, trigger) => {
    const date = upcomingBirthdayDate(todayIST, member.daysUntil);
    setView({ month: date.month, year: date.year });
    openPopup(date, upcomingMembers.filter((entry) => entry.daysUntil === member.daysUntil), trigger);
  };

  const restorePopupFocus = (event) => {
    event.preventDefault();
    const target = popupTriggerRef.current;
    if (target?.isConnected) target.focus();
    else monthHeadingRef.current?.focus();
  };

  const handleMonthKeyDown = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      changeMonth(event.key === 'ArrowLeft' ? -1 : 1);
    }
  };

  const handleTouchStart = (event) => {
    touchStartRef.current = event.touches.length === 1
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
      : null;
  };

  const handleTouchEnd = (event) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || event.touches.length > 0) return;
    const touch = event.changedTouches[0];
    const distanceX = touch.clientX - start.x;
    const distanceY = touch.clientY - start.y;
    if (Math.abs(distanceX) >= 60 && Math.abs(distanceX) > Math.abs(distanceY) * 1.5) {
      changeMonth(distanceX < 0 ? 1 : -1);
    }
  };

  return (
    <main className={`min-h-screen transition-colors duration-300 pb-16 ${theme === 'dark' ? 'dark bg-[#2C1810]' : 'bg-[#F5E6D3]'}`}>
      <section className="max-w-7xl mx-auto px-3 sm:px-6 pt-8 sm:pt-12">
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#C1502E] p-2 border-4 border-black dark:border-[#F5E6D3] shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_rgba(245,230,211,1)]">
              <Cake className="w-6 h-6 text-[#F5E6D3]" aria-hidden="true" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#2C1810] dark:text-[#F5E6D3] uppercase tracking-tight">
              Birthday Calendar
            </h1>
          </div>
        </div>

        {!upcomingQuery.error ? (
          <TodayBanner
            members={todayMembers}
            onClickMember={(members, trigger) => {
              goToToday();
              openPopup(todayIST, members, trigger);
            }}
          />
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
          <aside aria-labelledby="upcoming-heading" className="min-w-0 lg:col-start-2 lg:row-start-1">
            <div className="border-4 border-black dark:border-[#F5E6D3] shadow-[6px_6px_0_0_#C1502E]">
              <div className="bg-[#2C1810] dark:bg-[#1a0e08] border-b-4 border-black dark:border-[#F5E6D3] p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#C1502E]" aria-hidden="true" />
                <h2 id="upcoming-heading" className="font-black text-[#F5E6D3] uppercase tracking-wider text-sm">
                  Upcoming ({UPCOMING_BIRTHDAY_WINDOW_DAYS} days)
                </h2>
                {!upcomingQuery.error && upcomingMembers.length > 0 ? (
                  <span className="ml-auto bg-[#C1502E] text-[#F5E6D3] text-xs font-black px-2 py-0.5 border-2 border-[#F5E6D3]">
                    {upcomingMembers.length}
                  </span>
                ) : null}
              </div>
              <div className="p-4 bg-[#F5E6D3] dark:bg-[#2C1810] max-h-56 lg:max-h-[600px] overflow-y-auto">
                <UpcomingPanel
                  members={upcomingMembers}
                  isLoading={upcomingQuery.isLoading}
                  isFetching={upcomingQuery.isFetching}
                  error={upcomingQuery.error}
                  onRetry={() => upcomingQuery.refetch()}
                  onSelectMember={openUpcomingBirthday}
                />
              </div>
            </div>

            {!monthQuery.error ? (
              <div aria-busy={isCalendarLoading} className="mt-4 border-4 border-black dark:border-[#F5E6D3] bg-[#C1502E] shadow-[6px_6px_0_0_#2C1810] dark:shadow-[6px_6px_0_0_rgba(245,230,211,0.3)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <PartyPopper className="w-5 h-5 text-[#F5E6D3]" aria-hidden="true" />
                  <h3 className="font-black text-[#F5E6D3] uppercase tracking-wider text-sm">{monthLabel}</h3>
                </div>
                <p className="text-4xl font-black text-[#F5E6D3]">{isCalendarLoading ? '…' : monthMembers.length}</p>
                <p className="text-[#F5E6D3] font-bold text-sm mt-1">
                  Birthday{monthMembers.length !== 1 ? 's' : ''} in {MONTH_NAMES[viewMonth - 1]}
                </p>
              </div>
            ) : null}
          </aside>

          <section
            aria-labelledby="calendar-month"
            aria-describedby="calendar-navigation-help"
            tabIndex={0}
            onKeyDown={handleMonthKeyDown}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => { touchStartRef.current = null; }}
            className="min-w-0 lg:col-start-1 lg:row-start-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C1502E]"
          >
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                <BirthdayButton
                  onClick={() => changeMonth(-1)}
                  aria-label="Previous month"
                  className="w-11 px-0 bg-[#F5E6D3] dark:bg-[#2C1810] text-[#2C1810] dark:text-[#F5E6D3]"
                >
                  <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                </BirthdayButton>
                <h2
                  id="calendar-month"
                  ref={monthHeadingRef}
                  tabIndex={-1}
                  aria-live="polite"
                  aria-atomic="true"
                  className="text-lg sm:text-2xl font-black text-[#2C1810] dark:text-[#F5E6D3] text-center uppercase tracking-wide"
                >
                  {monthLabel}
                </h2>
                <BirthdayButton
                  onClick={() => changeMonth(1)}
                  aria-label="Next month"
                  className="w-11 px-0 bg-[#F5E6D3] dark:bg-[#2C1810] text-[#2C1810] dark:text-[#F5E6D3]"
                >
                  <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </BirthdayButton>
              </div>

              <BirthdayButton onClick={goToToday} disabled={isCurrentMonth}>
                <Calendar className="w-4 h-4" aria-hidden="true" />
                Today
              </BirthdayButton>
            </div>

            <p role="status" className="min-h-6 mb-1 text-sm font-bold text-[#2C1810] dark:text-[#F5E6D3]">
              {isCalendarLoading ? 'Loading birthdays…' : ''}
            </p>
            <div className="border-4 border-black dark:border-[#F5E6D3] shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_rgba(245,230,211,0.3)] overflow-hidden">
              <table className="w-full table-fixed border-collapse" aria-busy={isCalendarLoading}>
                <caption className="sr-only">Birthday calendar for {monthLabel}. Dates use India Standard Time.</caption>
                <thead className="border-b-4 border-black dark:border-[#F5E6D3] bg-[#2C1810] dark:bg-[#1a0e08]">
                  <tr>
                    {DAY_NAMES.map((day) => (
                      <th key={day} scope="col" className="py-2 text-center text-[#F5E6D3] font-black text-xs sm:text-sm uppercase tracking-wider border-r-2 border-[#F5E6D3]/20 last:border-r-0">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthQuery.error ? (
                    <tr>
                      <td colSpan={7} className="p-6 sm:p-10 text-center bg-[#F5E6D3] dark:bg-[#2C1810]">
                        <div role="alert">
                          <p className="text-3xl mb-3" aria-hidden="true">⚠️</p>
                          <p className="font-black text-[#2C1810] dark:text-[#F5E6D3] text-lg uppercase">Failed to load calendar</p>
                          <p className="text-[#2C1810]/80 dark:text-[#F5E6D3]/80 text-sm mt-1">Please check your connection and try again.</p>
                        </div>
                        <BirthdayButton className="mt-4" onClick={() => monthQuery.refetch()} disabled={monthQuery.isFetching}>
                          {monthQuery.isFetching ? 'Retrying…' : 'Try again'}
                        </BirthdayButton>
                      </td>
                    </tr>
                  ) : calendarWeeks.map((week, row) => (
                    <tr key={row}>
                      {week.map((day, column) => {
                        if (monthQuery.isLoading) {
                          return (
                            <td key={column} className="p-0 border border-black/10 dark:border-white/10">
                              <div className="min-h-[76px] sm:min-h-[100px] bg-black/5 dark:bg-white/5 animate-pulse" />
                            </td>
                          );
                        }
                        const members = day ? (birthdaysByDay[day] ?? []) : [];
                        return (
                          <CalendarCell
                            key={column}
                            day={day}
                            dateLabel={`${MONTH_NAMES[viewMonth - 1]} ${day}, ${viewYear}`}
                            isToday={isCurrentMonth && day === todayIST.day}
                            birthdayMembers={members}
                            onClick={(event) => openPopup({ day, month: viewMonth, year: viewYear }, members, event.currentTarget)}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs sm:text-sm text-[#2C1810] dark:text-[#F5E6D3]">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-4 border-[#C1502E] bg-[#FFF3E0] dark:bg-[#3d2015]" aria-hidden="true" />
                <span className="font-bold">Has birthday(s)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 ring-4 ring-[#C1502E] ring-inset border-2 border-black dark:border-[#F5E6D3] bg-[#F5E6D3] dark:bg-[#2C1810]" aria-hidden="true" />
                <span className="font-bold">Today</span>
              </div>
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-[#C1502E]" aria-hidden="true" />
                <span className="font-bold">Click birthday dates to celebrate!</span>
              </div>
            </div>
            <p id="calendar-navigation-help" className="mt-3 text-xs font-bold text-[#2C1810]/80 dark:text-[#F5E6D3]/80">
              Focus the calendar and use the left/right arrow keys, or swipe, to change month.
            </p>
          </section>
        </div>
      </section>

      {popup ? (
        <BirthdayPopup
          members={popup.members}
          date={popup.date}
          today={todayIST}
          onClose={() => setPopup(null)}
          onCloseAutoFocus={restorePopupFocus}
        />
      ) : null}

      <div className="fixed bottom-10 left-8 w-10 h-10 bg-[#C1502E] border-4 border-black dark:border-[#F5E6D3] rotate-45 opacity-20 pointer-events-none z-0" />
      <div className="fixed top-1/3 right-6 w-6 h-20 bg-[#2C1810] dark:bg-[#F5E6D3] border-4 border-black dark:border-[#F5E6D3] -rotate-12 opacity-10 pointer-events-none z-0" />
    </main>
  );
}
