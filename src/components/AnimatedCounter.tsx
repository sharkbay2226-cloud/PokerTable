import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  precision?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  pulseOnChange?: boolean;
  style?: React.CSSProperties;
}

export default function AnimatedCounter({
  value, precision = 2, prefix = '', suffix = '',
  duration = 400, pulseOnChange, style,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [pulseKey, setPulseKey] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(value);

  useEffect(() => {
    if (value === displayValue) return;
    fromRef.current = displayValue;
    startRef.current = performance.now();
    if (pulseOnChange) setPulseKey((k) => k + 1);

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromRef.current + (value - fromRef.current) * eased;
      setDisplayValue(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  const cls = [
    pulseOnChange && pulseKey > 0 ? (value >= 0 ? 'pulse-profit' : 'pulse-loss') : '',
    'counter-spring',
  ].filter(Boolean).join(' ');

  const formatted = displayValue.toFixed(precision);
  const display = `${prefix}${formatted}${suffix}`;

  return (
    <span key={pulseKey} className={cls} style={style}>
      {display}
    </span>
  );
}
