'use client';

interface AnimatedCounterProps {
  value: string;
  label: string;
  className?: string;
}

export default function AnimatedCounter({
  value,
  label,
  className,
}: AnimatedCounterProps) {
  return (
    <div className={className ? `text-left ${className}` : 'text-left'}>
      <div className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 tabular-nums">
        {value}
      </div>
      <div className="font-sans text-sm text-slate-600 mt-1.5 leading-snug">
        {label}
      </div>
    </div>
  );
}
