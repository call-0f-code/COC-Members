export default function TodayBanner({ members, onClickMember }) {
  if (!members || members.length === 0) return null;

  const names = members.map((m) => m.name.split(' ')[0]);
  const displayNames =
    names.length === 1
      ? names[0]
      : names.length === 2
      ? `${names[0]} and ${names[1]}`
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

  return (
    <div className="border-4 border-black dark:border-[#F5E6D3] bg-[#C1502E] shadow-[6px_6px_0_0_#2C1810] dark:shadow-[6px_6px_0_0_rgba(245,230,211,0.5)] p-4 mb-8 animate-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Avatar strip */}
        <div className="flex -space-x-3 flex-shrink-0">
          {members.slice(0, 4).map((m) => (
            <div
              key={m.id}
              className="w-12 h-12 border-3 border-white rounded-none overflow-hidden shadow-[2px_2px_0_0_#2C1810] bg-[#F5E6D3] flex-shrink-0"
            >
              {m.profilePhoto ? (
                <img src={m.profilePhoto} alt={m.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-black text-[#C1502E]">
                  {m.name.charAt(0)}
                </div>
              )}
            </div>
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

        <button
          onClick={() => onClickMember && onClickMember(members)}
          className="px-4 py-2 border-4 border-[#F5E6D3] bg-[#2C1810] text-[#F5E6D3] font-black text-sm shadow-[3px_3px_0_0_rgba(245,230,211,0.5)] hover:shadow-[5px_5px_0_0_rgba(245,230,211,0.5)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all duration-150 uppercase whitespace-nowrap"
        >
          🎁 Wish Them!
        </button>
      </div>
    </div>
  );
}
