import { useState, useRef } from 'react';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { GRID_LABELS, handLabel, comboCount } from '../data/preflopEquity';

const { Text } = Typography;

const CELL = 34;
const HEADER = 26;
const SELECTED = '#d4a843';
const SELECTED_BORDER = '#e5b832';

interface HandGridProps {
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
  label: string;
  highlightedCells?: Set<string>;
}

export default function HandGrid({ selected, onChange, label, highlightedCells }: HandGridProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const dragModeRef = useRef<'select' | 'deselect'>('select');
  const currentRef = useRef<Set<string>>(selected);
  currentRef.current = selected;

  const toggle = (r: number, c: number, mode?: 'select' | 'deselect') => {
    const key = `${r},${c}`;
    const cur = currentRef.current;
    const next = new Set(cur);
    const action = mode || (cur.has(key) ? 'deselect' : 'select');
    if (action === 'select') next.add(key);
    else next.delete(key);
    currentRef.current = next;
    onChange(next);
    return action;
  };

  const handleDown = (r: number, c: number) => {
    const action = toggle(r, c);
    dragModeRef.current = action;
    setIsDragging(true);
  };

  const handleEnter = (r: number, c: number) => {
    if (!isDragging) return;
    const key = `${r},${c}`;
    const cur = currentRef.current;
    const next = new Set(cur);
    if (dragModeRef.current === 'select') next.add(key);
    else next.delete(key);
    currentRef.current = next;
    onChange(next);
  };

  const handleUp = () => setIsDragging(false);

  const totalCombos = Array.from(selected).reduce((sum, k) => {
    const [r, c] = k.split(',').map(Number);
    return sum + comboCount(r, c);
  }, 0);

  const bg = (r: number, c: number, sel: boolean, highlight: boolean) => {
    if (highlight) return '#1a472a';
    if (sel) return SELECTED;
    if (r === c) return '#162133';
    if (r < c) return '#111827';
    return '#0c1420';
  };

  const borderClr = (r: number, c: number, sel: boolean, highlight: boolean) => {
    if (highlight) return 'var(--color-profit)';
    if (sel) return SELECTED_BORDER;
    return '#1e293b';
  };

  const cellColor = (r: number, c: number, sel: boolean, highlight: boolean) => {
    if (highlight) return '#b7eb8f';
    if (sel) return '#0f172a';
    return '#64748b';
  };

  return (
    <div
      style={{ display: 'inline-block', userSelect: 'none' }}
      onMouseUp={handleUp}
      onMouseLeave={handleUp}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: '#94a3b8', fontSize: 11 }}>
          {selected.size} {t('equity.hands')} · {totalCombos} {t('equity.combos')}
        </Text>
      </div>

      <div style={{ display: 'flex' }}>
        <div style={{ width: HEADER, height: HEADER }} />
        {GRID_LABELS.map((_, c) => (
          <div key={c} style={{ width: CELL, textAlign: 'center', color: '#64748b', fontSize: 10, lineHeight: `${HEADER}px` }}>
            {GRID_LABELS[c]}
          </div>
        ))}
      </div>

      {GRID_LABELS.map((_, r) => (
        <div key={r} style={{ display: 'flex' }}>
          <div style={{ width: HEADER, height: CELL, textAlign: 'center', color: '#64748b', fontSize: 10, lineHeight: `${CELL}px` }}>
            {GRID_LABELS[r]}
          </div>
          {GRID_LABELS.map((_, c) => {
            const key = `${r},${c}`;
            const sel = selected.has(key);
            const hl = highlightedCells ? highlightedCells.has(key) : false;
            const lb = handLabel(r, c);
            const fs = lb.length === 3 ? 8 : lb.length === 2 ? 10 : 11;
            return (
              <div
                key={key}
                onMouseDown={() => handleDown(r, c)}
                onMouseEnter={() => handleEnter(r, c)}
                  style={{
                    width: CELL, height: CELL, margin: 0.5,
                    background: bg(r, c, sel, hl),
                    border: `1px solid ${borderClr(r, c, sel, hl)}`,
                    borderRadius: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: fs,
                    color: cellColor(r, c, sel, hl),
                    fontWeight: sel || hl ? 700 : 400,
                    transition: 'background 0.1s',
                  }}
              >
                {lb}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
