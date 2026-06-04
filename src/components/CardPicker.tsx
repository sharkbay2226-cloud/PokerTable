import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Card } from '../data/handEval';
import { RANK_NAMES, SUIT_SYMBOLS } from '../data/handEval';

const { Text } = Typography;

const CARD_W = 38;
const CARD_H = 52;
const GAP = 3;

interface CardSection {
  count: number;
  label: string;
  color: string;
}

interface CardPickerProps {
  selected: Card[];
  onChange: (cards: Card[]) => void;
  maxCards: number;
  label?: string;
  sections?: CardSection[];
}

export default function CardPicker({ selected, onChange, maxCards = 5, label, sections }: CardPickerProps) {
  const { t } = useTranslation();
  const totalMax = sections ? sections.reduce((s, sec) => s + sec.count, 0) : maxCards;

  const selIdx = (r: number, s: number) => selected.findIndex(c => c.rank === r && c.suit === s);
  const isSelected = (r: number, s: number) => selIdx(r, s) >= 0;

  const toggle = (r: number, s: number) => {
    if (isSelected(r, s)) {
      onChange(selected.filter(c => !(c.rank === r && c.suit === s)));
    } else if (selected.length < totalMax) {
      onChange([...selected, { rank: r, suit: s }]);
    }
  };

  const sectionForIdx = (idx: number): CardSection | null => {
    if (!sections) return null;
    let offset = 0;
    for (const sec of sections) {
      if (idx < offset + sec.count) return sec;
      offset += sec.count;
    }
    return null;
  };

  const suits = [0, 1, 2, 3];
  const ranks = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

  return (
    <div style={{ textAlign: 'center' }}>
      <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8, display: 'block' }}>
        {label || t('equity.selectFlop')}
        {selected.length > 0 && ` (${selected.length}/${totalMax})`}
      </Text>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: CARD_W, height: 22 }} />
        {ranks.map(r => (
          <div key={r} style={{ width: CARD_W, textAlign: 'center', color: '#94a3b8', fontSize: 13, lineHeight: '22px', fontWeight: 600 }}>
            {RANK_NAMES[r]}
          </div>
        ))}
      </div>

      {suits.map(s => (
        <div key={s} style={{ display: 'flex', justifyContent: 'center', marginBottom: GAP }}>
          <div style={{ width: CARD_W, height: CARD_H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s === 1 || s === 2 ? '#ef4444' : '#475569', fontSize: 20 }}>
            {SUIT_SYMBOLS[s]}
          </div>
          {ranks.map(r => {
            const idx = selIdx(r, s);
            const sel = idx >= 0;
            const sec = sel ? sectionForIdx(idx) : null;
            const secColor = sec ? sec.color : '#d4a843';
            const suitColor = s === 1 || s === 2 ? '#ef4444' : '#475569';
            const bg = sel ? secColor : '#ffffff';
            const borderClr = sel ? secColor : '#cbd5e1';
            const hoverBg = sel ? bg : '#fffbe6';

            return (
              <div
                key={`${r}-${s}`}
                onClick={() => toggle(r, s)}
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  marginRight: GAP,
                  background: bg,
                  border: `2px solid ${borderClr}`,
                  borderRadius: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontSize: 16,
                  color: sel ? '#1a1d23' : suitColor,
                  fontWeight: 700,
                  opacity: selected.length >= totalMax && !sel ? 0.3 : 1,
                  transition: 'all 0.15s',
                  boxShadow: sel ? `0 0 8px ${secColor}80` : 'none',
                }}
                title={`${RANK_NAMES[r]}${SUIT_SYMBOLS[s]}`}
                onMouseEnter={e => { if (!sel && selected.length < totalMax) { e.currentTarget.style.borderColor = '#d4a843'; e.currentTarget.style.background = hoverBg; }}}
                onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = borderClr; e.currentTarget.style.background = bg; }}}
              >
                <span style={{ lineHeight: 1.2, fontSize: 16 }}>{RANK_NAMES[r]}</span>
                <span style={{ fontSize: 12, marginTop: 1 }}>{SUIT_SYMBOLS[s]}</span>
              </div>
            );
          })}
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
        {(sections || [{ count: maxCards, label: '', color: '#d4a843' }]).map((section, si) => (
          <div key={si} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {section.label && (
              <span style={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{section.label}</span>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: section.count }, (_, i) => {
                const idx = sections ? sections.slice(0, si).reduce((s, sec) => s + sec.count, 0) + i : i;
                const filled = idx < selected.length;
                const card = filled ? selected[idx] : null;
                return (
                  <div
                    key={i}
                    style={{
                      width: 42,
                      height: 56,
                      background: filled ? section.color : '#1e293b',
                      border: `2px solid ${filled ? section.color : '#334155'}`,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      color: filled ? '#1a1d23' : '#475569',
                      fontWeight: 700,
                      boxShadow: filled ? `0 0 6px ${section.color}40` : 'none',
                    }}
                  >
                    {card ? `${RANK_NAMES[card.rank]}${SUIT_SYMBOLS[card.suit]}` : ''}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
