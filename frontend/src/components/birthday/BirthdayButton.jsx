import { cn } from '@/lib/utils';

export default function BirthdayButton({ className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 border-4 border-black bg-[#C1502E] px-4 py-2 text-sm font-black text-[#F5E6D3] uppercase shadow-[4px_4px_0_0_#000] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C1502E] disabled:pointer-events-none disabled:opacity-50 dark:border-[#F5E6D3]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
