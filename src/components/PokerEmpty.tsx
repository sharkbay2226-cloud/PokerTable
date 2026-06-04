import { ReactNode } from 'react';

const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_COLORS = ['#94a3b8', '#ef4444', '#ef4444', '#94a3b8'];

interface PokerEmptyProps {
  description?: ReactNode;
  icon?: 'cards' | 'chips' | 'trophy' | 'default';
}

export default function PokerEmpty({ description, icon = 'default' }: PokerEmptyProps) {
  const renderIcon = () => {
    if (icon === 'cards') {
      return (
        <div style={{ position: 'relative', width: 80, height: 64 }}>
          <div style={{
            position: 'absolute', left: 8, top: 4, width: 52, height: 68,
            borderRadius: 6, border: '2px solid var(--color-border)',
            background: 'var(--color-surface-card)', transform: 'rotate(-8deg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, color: '#ef4444',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            ♥
          </div>
          <div style={{
            position: 'absolute', left: 24, top: 0, width: 52, height: 68,
            borderRadius: 6, border: '2px solid var(--color-border)',
            background: 'var(--color-surface-card)', transform: 'rotate(4deg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, color: '#94a3b8',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            ♠
          </div>
        </div>
      );
    }

    if (icon === 'chips') {
      return (
        <div style={{ position: 'relative', width: 60, height: 56 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              position: 'absolute', left: 0, top: i * 6,
              width: 60, height: 18, borderRadius: '50%',
              border: '2px solid var(--color-border)',
              background: i === 0 ? '#d4a843' : i === 1 ? '#3b82f6' : '#ef4444',
              opacity: 0.5 + i * 0.15,
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              zIndex: 3 - i,
            }}>
              <div style={{
                position: 'absolute', top: 2, left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 9, fontWeight: 700, color: '#fff',
                letterSpacing: 0.5,
              }}>$</div>
            </div>
          ))}
        </div>
      );
    }

    if (icon === 'trophy') {
      return (
        <div style={{ fontSize: 48, lineHeight: 1, opacity: 0.3 }}>
          🏆
        </div>
      );
    }

    return (
      <div style={{
        display: 'flex', gap: 6, opacity: 0.5,
        fontSize: 28, fontWeight: 300,
        letterSpacing: 4,
      }}>
        {SUITS.map((s, i) => (
          <span key={i} style={{
            color: SUIT_COLORS[i],
            animation: 'suitFloat 3s ease-in-out infinite',
            animationDelay: `${i * 0.4}s`,
          }}>
            {s}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 24px', gap: 16,
    }}>
      {renderIcon()}
      {description && (
        <div style={{
          fontSize: 14, color: 'var(--color-text-muted)',
          textAlign: 'center', maxWidth: 280, lineHeight: 1.5,
        }}>
          {description}
        </div>
      )}
    </div>
  );
}
