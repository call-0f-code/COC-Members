import { MONTH_NAMES, formatDaysUntil } from '@/utils/birthdayDate';

export default function UpcomingPanel({ members, isLoading, error }) {
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
