import { Gift, PartyPopper } from 'lucide-react';
import BirthdayAvatar from './BirthdayAvatar';
import BirthdayButton from './BirthdayButton';
import ConfettiScatter from './Confetti';

const MAX_AVATARS = 3;
const nameList = new Intl.ListFormat('en', { type: 'conjunction' });

/** "Aarav", "Aarav and Priya", "Aarav, Priya, and 2 others" */
function formatNames(members) {
  const firstNames = members.map((member) => member.name.trim().split(/\s+/)[0] || member.name);
  if (firstNames.length <= MAX_AVATARS) return nameList.format(firstNames);
  const shown = firstNames.slice(0, MAX_AVATARS - 1);
  return nameList.format([...shown, `${firstNames.length - shown.length} others`]);
}

const possessive = (names) => (names.endsWith('s') ? `${names}'` : `${names}'s`);

export default function TodayBanner({ members, onClickMember }) {
  if (!members || members.length === 0) return null;

  const names = formatNames(members);
  const extra = members.length - MAX_AVATARS;

  return (
    <section
      aria-labelledby="today-banner-title"
      className="relative mb-8 overflow-hidden border-4 border-black dark:border-[#F5E6D3] bg-[#C1502E] shadow-[8px_8px_0_0_#2C1810] dark:shadow-[8px_8px_0_0_rgba(245,230,211,0.9)] animate-in fade-in slide-in-from-top-4 duration-500"
    >
      <ConfettiScatter />
      <div className="relative flex flex-col md:flex-row md:items-center gap-5 sm:gap-7 p-5 sm:p-8">
        <div className="flex -space-x-4 self-start md:self-center -rotate-3 shrink-0" aria-hidden="true">
          {members.slice(0, MAX_AVATARS).map((member) => (
            <BirthdayAvatar
              key={member.id}
              member={member}
              className="size-16 sm:size-20 border-4 border-black dark:border-black shadow-[4px_4px_0_0_#2C1810]"
              fallbackClassName="bg-[#F5E6D3] text-[#2C1810] text-2xl sm:text-3xl"
            />
          ))}
          {extra > 0 ? (
            <span className="relative flex size-16 sm:size-20 items-center justify-center border-4 border-black bg-[#2C1810] text-lg font-black text-[#F5E6D3] shadow-[4px_4px_0_0_#2C1810]">
              +{extra}
            </span>
          ) : null}
        </div>

        <div className="flex-1 min-w-0">
          <p className="inline-flex items-center gap-1.5 border-2 border-black bg-[#F2B544] px-2 py-0.5 text-xs font-black uppercase tracking-widest text-[#2C1810]">
            <PartyPopper className="size-3.5" aria-hidden="true" /> Today
          </p>
          <h2 id="today-banner-title" className="mt-3 text-2xl sm:text-4xl font-black uppercase leading-[1.05] tracking-tight text-[#F5E6D3] break-words">
            It&apos;s {possessive(names)} birthday!
          </h2>
          <p className="mt-2 font-bold text-[#F5E6D3]/85">
            Make their day with a wish 🎂
          </p>
        </div>

        <BirthdayButton
          onClick={(event) => onClickMember(members, event.currentTarget)}
          aria-haspopup="dialog"
          className="self-start md:self-center min-h-13 px-6 text-base whitespace-nowrap bg-[#2C1810] dark:border-black dark:shadow-[4px_4px_0_0_#000] dark:hover:shadow-[6px_6px_0_0_#000] focus-visible:outline-[#F5E6D3]"
        >
          <Gift className="size-5" aria-hidden="true" />
          Send wishes
        </BirthdayButton>
      </div>
    </section>
  );
}
