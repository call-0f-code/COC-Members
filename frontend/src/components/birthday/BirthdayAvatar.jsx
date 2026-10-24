import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function BirthdayAvatar({ member, className }) {
  return (
    <Avatar
      aria-hidden="true"
      className={cn('size-11 rounded-none border-2 border-black bg-[#C1502E] text-[#F5E6D3] dark:border-[#F5E6D3]', className)}
    >
      <AvatarImage src={member.profilePhoto || undefined} alt="" className="object-cover" />
      <AvatarFallback className="rounded-none bg-[#C1502E] text-inherit text-base font-black">
        {member.name.trim().charAt(0).toUpperCase() || '?'}
      </AvatarFallback>
    </Avatar>
  );
}
