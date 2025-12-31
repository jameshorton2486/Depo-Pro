import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCard {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: LucideIcon;
}

interface StatsCardsProps {
  stats: StatCard[];
  className?: string;
}

export function StatsCards({ stats, className }: StatsCardsProps) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {stats.map((stat, index) => (
        <div key={index} className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-small text-slate font-medium">{stat.label}</p>
              <p className="mt-2 text-2xl font-bold text-ink">{stat.value}</p>
              {stat.change && (
                <p
                  className={cn(
                    'mt-1 text-small font-medium',
                    stat.changeType === 'increase' && 'text-success',
                    stat.changeType === 'decrease' && 'text-danger',
                    stat.changeType === 'neutral' && 'text-slate'
                  )}
                >
                  {stat.change}
                </p>
              )}
            </div>
            {stat.icon && (
              <div className="p-2 bg-bg rounded-md">
                <stat.icon className="w-5 h-5 text-accent" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
