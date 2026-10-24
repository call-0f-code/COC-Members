import BirthdayAvatar from './BirthdayAvatar';

export default function CalendarCell({ day, dateLabel, isToday, birthdayMembers, onClick }) {
  if (day === null) {
    return <td className="border-2 border-black/20 bg-black/5 dark:border-[#F5E6D3]/10 dark:bg-white/5" />;
  }

  const hasBirthday = birthdayMembers.length > 0;
  const contentClassName = 'min-h-[76px] sm:min-h-[100px] w-full p-1.5 sm:p-2 flex flex-col gap-1 text-left';
  const content = (
    <>
      <span
        className={`text-sm sm:text-base font-black leading-none self-start ${isToday
          ? 'bg-[#C1502E] text-[#F5E6D3] px-1.5 py-0.5'
          : 'text-[#2C1810] dark:text-[#F5E6D3]'}`}
      >
        {day}
      </span>

      {hasBirthday ? (
        <span className="flex flex-col gap-1 min-w-0 w-full" aria-hidden="true">
          {birthdayMembers.slice(0, 2).map((member) => (
            <span key={member.id} className="flex items-center gap-1 min-w-0">
              <BirthdayAvatar member={member} className="size-6" />
              <span className="hidden sm:block text-xs font-black text-[#C1502E] truncate leading-tight">
                {member.name.split(' ')[0]}
              </span>
            </span>
          ))}
          {birthdayMembers.length > 2 ? (
            <span className="text-xs font-black text-[#C1502E]">
              +{birthdayMembers.length - 2}<span className="hidden sm:inline"> more</span>
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  );

  return (
    <td
      aria-label={hasBirthday ? undefined : dateLabel}
      aria-current={isToday ? 'date' : undefined}
      className={[
        'border-2 border-black dark:border-[#F5E6D3] p-0 align-top',
        hasBirthday ? 'bg-[#FFF3E0] dark:bg-[#3d2015]' : 'bg-[#F5E6D3] dark:bg-[#2C1810]',
        isToday ? 'ring-4 ring-[#C1502E] ring-inset' : '',
      ].join(' ')}
    >
      {hasBirthday ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={`${dateLabel}${isToday ? ', today' : ''}: ${birthdayMembers.length} birthday${birthdayMembers.length === 1 ? '' : 's'}. ${birthdayMembers.map((member) => member.name).join(', ')}. Open birthday wishes.`}
          aria-haspopup="dialog"
          className={`${contentClassName} cursor-pointer transition-colors hover:bg-[#C1502E]/10 focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-[#C1502E]`}
        >
          {content}
        </button>
      ) : (
        <div className={contentClassName}>{content}</div>
      )}
    </td>
  );
}
