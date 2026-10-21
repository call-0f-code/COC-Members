export default function CalendarCell({ day, isToday, birthdayMembers, onClick }) {
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
