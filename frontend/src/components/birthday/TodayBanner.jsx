import BirthdayAvatar from './BirthdayAvatar';
import BirthdayButton from './BirthdayButton';

// "A", "A and B", "A, B, and C"
const nameList = new Intl.ListFormat('en', { type: 'conjunction' });

export default function TodayBanner({ members, onClickMember }) {
  if (!members || members.length === 0) return null;

  const displayNames = nameList.format(members.map((m) => m.name.split(' ')[0]));

  return (
    <div className="border-4 border-black dark:border-[#F5E6D3] bg-[#C1502E] shadow-[6px_6px_0_0_#2C1810] dark:shadow-[6px_6px_0_0_rgba(245,230,211,0.5)] p-4 mb-8 animate-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Avatar strip */}
        <div className="flex -space-x-3 flex-shrink-0">
          {members.slice(0, 4).map((m) => (
            <BirthdayAvatar
              key={m.id}
              member={m}
              className="size-12 border-3 border-white dark:border-white shadow-[2px_2px_0_0_#2C1810]"
            />
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

        <BirthdayButton
          onClick={(event) => onClickMember(members, event.currentTarget)}
          aria-haspopup="dialog"
          className="border-[#F5E6D3] bg-[#2C1810] whitespace-nowrap focus-visible:outline-[#F5E6D3]"
        >
          🎁 Wish Them!
        </BirthdayButton>
      </div>
    </div>
  );
}
