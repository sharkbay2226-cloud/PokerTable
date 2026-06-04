import { useState, useMemo } from 'react';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { CAT_ORDER } from '../data/boardAnalysis';

const { Text } = Typography;

const CAT_COLORS: Record<string, string> = {
  'Royal Flush': '#ff0000',
  'Straight Flush': '#8b5cf6',
  'Quads': '#ec4899',
  'Full House': '#f97316',
  'Flush': '#06b6d4',
  'Straight': '#84cc16',
  'Set': '#a855f7',
  'Trips': '#c084fc',
  'Two Pair': '#f43f5e',
  'Overpair': '#22c55e',
  'Top Pair': '#22d36e',
  'Middle Pair': '#eab308',
  'Bottom Pair': '#f59e0b',
  'Pair': '#f59e0b',
  'Paired Board': '#94a3b8',
  'Flush Draw + OESD': '#3b82f6',
  'Flush Draw + Gutshot': '#6366f1',
  'Two Overcards + Flush Draw': '#818cf8',
  'Flush Draw': '#60a5fa',
  'Backdoor Flush Draw': '#93c5fd',
  'OESD': '#14b8a6',
  'Gutshot': '#2dd4bf',
  'Overcards': '#f472b6',
  'One Overcard': '#fb7185',
  'Nothing': '#64748b',
};

interface RangeBreakdownProps {
  analysis: { categories: Record<string, { combos: number }>; totalCombos: number; categoryCells: Record<string, string[]> } | null;
  onHoverCategory: (cat: string | null) => void;
  categories?: string[];
  title?: string;
  highlightedCats?: Set<string>;
}

export default function RangeBreakdown({ analysis, onHoverCategory, categories, title, highlightedCats }: RangeBreakdownProps) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<string | null>(null);

  const items = useMemo(() => {
    if (!analysis) return [];
    const total = analysis.totalCombos;
    const order = categories || CAT_ORDER;
    return order.map(cat => {
      const data = analysis.categories[cat];
      const combos = data ? data.combos : 0;
      return {
        key: cat,
        category: cat,
        combos,
        pct: total > 0 ? (combos / total) * 100 : 0,
        color: CAT_COLORS[cat] || '#64748b',
        cells: analysis.categoryCells[cat] || [],
      };
    });
  }, [analysis, categories]);

  if (!analysis) {
    return (
      <div style={{ marginTop: 8, padding: '12px 0', textAlign: 'center' }}>
        <Text style={{ color: '#64748b', fontSize: 12 }}>{t('equity.selectRangeAndBoard')}</Text>
      </div>
    );
  }

  const trStyle = (cat: string): React.CSSProperties => ({
    background: highlightedCats?.has(cat) ? '#0a2e1a' : hovered === cat ? '#1a2a3a' : 'transparent',
    cursor: 'pointer',
    transition: 'background 0.1s',
    borderLeft: highlightedCats?.has(cat) ? '3px solid #22c55e' : '3px solid transparent',
  });

  return (
    <div style={{ marginTop: 8, width: '100%' }}>
      {title && (
        <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, paddingLeft: 4 }}>
          {title}
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {items.map(item => {
            const isHero = highlightedCats?.has(item.category);
            return (
              <tr
                key={item.key}
                style={trStyle(item.category)}
                onMouseEnter={() => { setHovered(item.category); onHoverCategory(item.category); }}
                onMouseLeave={() => { setHovered(null); onHoverCategory(null); }}
              >
                <td style={{ padding: '4px 8px' }}>
                  <span style={{ color: '#e2e8f0', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: isHero ? '#22c55e' : CAT_COLORS[item.category] || '#64748b', display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ color: isHero ? '#22c55e' : '#e2e8f0', fontWeight: isHero ? 700 : 400 }}>
                      {t(`equity.cat.${item.category.replace(/\s+/g, '')}` as any, item.category)}
                    </span>
                  </span>
                </td>
                <td style={{ padding: '4px 8px', textAlign: 'right', color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {isHero ? <span style={{ color: '#22c55e', fontWeight: 700 }}>{item.combos}</span> : item.combos}
                </td>
                <td style={{ padding: '4px 8px', width: 100 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ flex: 1, height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(item.pct, 100)}%`, height: '100%', background: isHero ? '#22c55e' : '#d4a843', borderRadius: 3 }} />
                    </div>
                    <span style={{ color: isHero ? '#22c55e' : '#94a3b8', fontSize: 11, minWidth: 32, textAlign: 'right', fontWeight: isHero ? 700 : 400 }}>{item.pct.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}