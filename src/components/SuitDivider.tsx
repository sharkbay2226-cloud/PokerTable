interface SuitDividerProps {
  suit?: 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'mixed';
  label?: string;
  style?: React.CSSProperties;
}

const SUIT_MAP = {
  spades: { char: '♠', color: '#94a3b8' },
  hearts: { char: '♥', color: '#ef4444' },
  diamonds: { char: '♦', color: '#ef4444' },
  clubs: { char: '♣', color: '#94a3b8' },
};

const SUITS = [SUIT_MAP.spades, SUIT_MAP.hearts, SUIT_MAP.diamonds, SUIT_MAP.clubs];

export default function SuitDivider({ suit = 'mixed', label, style }: SuitDividerProps) {
  const items = suit === 'mixed' ? SUITS : [SUIT_MAP[suit]];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '16px 0', ...style,
    }}>
      <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {items.map((s, i) => (
          <span key={i} style={{ color: s.color, fontSize: 14, opacity: 0.6 }}>{s.char}</span>
        ))}
        {label && (
          <span style={{
            fontSize: 12, color: 'var(--color-text-muted)',
            letterSpacing: 1, textTransform: 'uppercase',
          }}>
            {label}
          </span>
        )}
        {label && items.map((s, i) => (
          <span key={i} style={{ color: s.color, fontSize: 14, opacity: 0.6 }}>{s.char}</span>
        ))}
      </div>
      <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
    </div>
  );
}
