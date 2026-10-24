import { MONTH_NAMES, formatDaysUntil } from '@/utils/birthdayDate';
import { UPCOMING_BIRTHDAY_WINDOW_DAYS } from '@/constants/birthdayConstants';
import BirthdayAvatar from './BirthdayAvatar';
import BirthdayButton from './BirthdayButton';

export default function UpcomingPanel({ members, isLoading, isFetching, error, onRetry, onSelectMember }) {
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
      <div role="alert" className="border-4 border-black dark:border-[#F5E6D3] bg-[#C1502E]/20 p-4 text-center">
        <p className="font-black text-[#2C1810] dark:text-[#F5E6D3] text-sm">Failed to load upcoming birthdays.</p>
        <BirthdayButton className="mt-3" onClick={onRetry} disabled={isFetching}>
          {isFetching ? 'Retrying…' : 'Try again'}
        </BirthdayButton>
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="border-4 border-black dark:border-[#F5E6D3] p-6 text-center bg-[#F5E6D3] dark:bg-[#2C1810]">
        <p className="text-3xl mb-2">🎈</p>
        <p className="font-black text-[#2C1810] dark:text-[#F5E6D3] text-sm uppercase">No upcoming birthdays in the next {UPCOMING_BIRTHDAY_WINDOW_DAYS} days</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {members.map((m) => (
        <li key={m.id}>
          <button
            type="button"
            onClick={(event) => onSelectMember(m, event.currentTarget)}
            aria-label={`${m.name}, ${MONTH_NAMES[m.month - 1]} ${m.day}, ${formatDaysUntil(m.daysUntil)}. Open birthday wishes.`}
            aria-haspopup="dialog"
            className="w-full text-left cursor-pointer border-4 border-black dark:border-[#F5E6D3] bg-[#F5E6D3] dark:bg-[#2C1810] p-3 flex items-center gap-3 shadow-[3px_3px_0_0_#C1502E] hover:shadow-[5px_5px_0_0_#C1502E] hover:-translate-x-0.5 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C1502E] transition-all duration-150"
          >
          {/* Avatar */}
          <BirthdayAvatar member={m} />

          {/* Info */}
          <span className="flex-1 min-w-0">
            <span className="block font-black text-[#2C1810] dark:text-[#F5E6D3] text-sm truncate">{m.name}</span>
            <span className="block text-xs text-[#2C1810]/60 dark:text-[#F5E6D3]/60 font-bold">
              🎂 {MONTH_NAMES[m.month - 1]} {m.day}
            </span>
          </span>

          {/* Days until badge */}
          <span
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
          </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
