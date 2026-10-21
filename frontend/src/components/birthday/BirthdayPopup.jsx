import { useEffect } from 'react';
import { MONTH_NAMES } from '@/utils/birthdayDate';

export default function BirthdayPopup({ members, day, month, year, onClose }) {
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
