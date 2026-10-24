import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Copy } from 'lucide-react';
import { MONTH_NAMES } from '@/utils/birthdayDate';
import BirthdayAvatar from './BirthdayAvatar';
import BirthdayButton from './BirthdayButton';

function BirthdayGreeting({ member, dateLabel }) {
  const [copyStatus, setCopyStatus] = useState('idle');
  const firstName = member.name.trim().split(/\s+/)[0] || 'friend';
  const greeting = `🎉 Happy Birthday, ${firstName}! Wishing you a wonderful birthday filled with happiness, success, and great memories! We're so glad you're part of Call of Code. 🚀`;

  const copyGreeting = async () => {
    setCopyStatus('copying');
    try {
      await navigator.clipboard.writeText(greeting);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
  };

  return (
    <li className="border-4 border-black dark:border-[#F5E6D3] bg-white dark:bg-[#3d2015] p-4 shadow-[4px_4px_0_0_#C1502E]">
      <div className="flex items-center gap-4 mb-3">
        <BirthdayAvatar member={member} className="size-16 border-4 shadow-[3px_3px_0_0_#C1502E]" />
        <div className="min-w-0">
          <p className="font-black text-lg text-[#2C1810] dark:text-[#F5E6D3] leading-tight break-words">
            {member.name}
          </p>
          <p className="text-[#C1502E] text-sm font-bold">🎂 {dateLabel}</p>
        </div>
      </div>
      <p className="select-text text-sm font-bold text-[#2C1810] dark:text-[#F5E6D3] leading-relaxed bg-[#F5E6D3] dark:bg-[#1a0e08] border-2 border-black dark:border-[#F5E6D3] p-3">
        {greeting}
      </p>
      <BirthdayButton
        className="mt-3"
        onClick={copyGreeting}
        disabled={copyStatus === 'copying'}
        aria-label={`Copy birthday greeting for ${member.name}`}
      >
        <Copy className="size-4" aria-hidden="true" />
        {copyStatus === 'copying' ? 'Copying…' : 'Copy greeting'}
      </BirthdayButton>
      <p role="status" className="mt-2 text-sm font-bold text-[#2C1810] dark:text-[#F5E6D3]">
        {copyStatus === 'copied'
          ? 'Greeting copied! Paste it into a message to wish them.'
          : copyStatus === 'error'
            ? 'Could not copy. Select the greeting above and copy it manually.'
            : ''}
      </p>
    </li>
  );
}

export default function BirthdayPopup({ members, date, today, onClose, onCloseAutoFocus }) {
  const { day, month, year } = date;
  const dateStr = `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
  const isToday = day === today.day && month === today.month && year === today.year;

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          onCloseAutoFocus={onCloseAutoFocus}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col border-4 border-black dark:border-[#F5E6D3] bg-[#F5E6D3] dark:bg-[#2C1810] shadow-[8px_8px_0_0_#C1502E] outline-none"
        >
          <div className="shrink-0 bg-[#C1502E] border-b-4 border-black dark:border-[#F5E6D3] p-4 sm:p-6 text-center">
            <div className="text-4xl mb-2" aria-hidden="true">🎂</div>
            <Dialog.Title className="text-xl sm:text-2xl font-black text-[#F5E6D3] uppercase tracking-wider">
              {dateStr}
            </Dialog.Title>
            <Dialog.Description className="text-[#F5E6D3] text-sm mt-1 font-bold">
              🎉 {members.length} Birthday{members.length !== 1 ? 's' : ''}{isToday ? ' Today' : ''}!
            </Dialog.Description>
          </div>

          <ul className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
            {members.map((member) => (
              <BirthdayGreeting key={member.id} member={member} dateLabel={`${MONTH_NAMES[month - 1]} ${day}`} />
            ))}
          </ul>

          <div className="shrink-0 p-4 border-t-4 border-black dark:border-[#F5E6D3] flex justify-end">
            <Dialog.Close asChild>
              <BirthdayButton>Close</BirthdayButton>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
