import {
  Accessibility,
  Bird,
  Briefcase,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  House,
  IndianRupee,
  Milk,
  PersonStanding,
  Rocket,
  Sprout,
  Store,
  Trees,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Accessibility,
  Bird,
  Briefcase,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  House,
  IndianRupee,
  Milk,
  PersonStanding,
  Rocket,
  Sprout,
  Store,
  Trees,
  Users,
  Wrench,
};

export function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Sprout;
  return <Icon className={className ?? 'h-5 w-5'} aria-hidden />;
}
