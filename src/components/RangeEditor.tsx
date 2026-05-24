import { useState, useEffect } from 'react';
import { Button, Input, ColorPicker, Typography, Popover, Slider } from 'antd';
import { PlusOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { RANKS, allHands } from '../data/ranges';
import type { RangeData } from '../types';

const { Text } = Typography;
const CELL = 44;
const GAP = 1;

const PRESET_COLORS = [
  '#22c55e', '#eab308', '#ef4444', '#3b82f6', '#a855f7',
  '#ec4899', '#f97316', '#14b8a6', '#06b6d4', '#84cc16',
  '#f43f5e', '#6366f1', '#d946ef', '#78716c', '#1e293b',
];

const COLOR_LIB_KEY = 'poker-diary-color-library';

function loadColorLibrary(): string[] {
  try {
    const raw = localStorage.getItem(COLOR_LIB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveColorLibrary(colors: string[]) {
  try { localStorage.setItem(COLOR_LIB_KEY, JSON.stringify(colors)); } catch {}
}

function handName(i: number, j: number): string {
  const r = RANKS[i], c = RANKS[j];
  return i === j ? r + c : i < j ? r + c + 's' : c + r + 'o';
}

interface Props {
  range: RangeData;
  onSave: (range: RangeData) => void;
  onCancel: () => void;
}

export default function RangeEditor({ range, onSave, onCancel }: Props) {
  const { t } = useTranslation();
  const [localRange, setLocalRange] = useState<RangeData>(() => ({
    ...range,
    colors: range.colors.map((c) => ({ ...c })),
    grid: { ...range.grid },
    weights: range.weights ? { ...range.weights } : {},
  }));
  const [selectedColor, setSelectedColor] = useState<string>(localRange.colors[0]?.id ?? '');
  const [editingColor, setEditingColor] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customHex, setCustomHex] = useState('#22c55e');
  const [savedColors, setSavedColors] = useState<string[]>(() => loadColorLibrary());
  const [selectedHand, setSelectedHand] = useState<string | null>(null);

  useEffect(() => {
    setLocalRange({
      ...range,
      colors: range.colors.map((c) => ({ ...c })),
      grid: { ...range.grid },
      weights: range.weights ? { ...range.weights } : {},
    });
  }, [range.id]);

  const getColor = (id: string) => localRange.colors.find((c) => c.id === id);

  const handleCellClick = (hand: string) => {
    if (!selectedColor) return;
    setLocalRange((prev) => {
      const grid = { ...prev.grid };
      if (grid[hand] === selectedColor) {
        delete grid[hand];
        const w = { ...(prev.weights || {}) };
        delete w[hand];
        return { ...prev, grid, weights: w };
      }
      grid[hand] = selectedColor;
      return { ...prev, grid };
    });
    setSelectedHand(hand);
  };

  const paintCell = (hand: string) => {
    if (!selectedColor) return;
    setLocalRange((prev) => {
      const grid = { ...prev.grid };
      grid[hand] = selectedColor;
      return { ...prev, grid };
    });
  };

  const setWeight = (hand: string, weight: number) => {
    setLocalRange((prev) => {
      const w = { ...(prev.weights || {}) };
      if (weight <= 0) delete w[hand];
      else w[hand] = weight;
      return { ...prev, weights: w };
    });
  };

  const getWeight = (hand: string): number => localRange.weights?.[hand] || 0;

  const getCellBg = (hand: string) => {
    const colorId = localRange.grid[hand];
    if (!colorId) return '#334155';
    const color = getColor(colorId);
    if (!color) return '#334155';
    const w = getWeight(hand);
    if (w <= 0) return color.hex;
    return `linear-gradient(to right, ${color.hex} ${w}%, #1e293b ${w}%)`;
  };

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Input
            value={localRange.name}
            onChange={(e) => setLocalRange((prev) => ({ ...prev, name: e.target.value }))}
            style={{ width: 250, background: '#1e293b', borderColor: '#475569', color: '#e2e8f0' }}
          />
          <Button type="primary" icon={<SaveOutlined />} onClick={() => onSave(localRange)}>
            {t('training.save')}
          </Button>
          <Button icon={<CloseOutlined />} onClick={onCancel}>
            {t('training.cancel')}
          </Button>
        </div>
        <Input.TextArea
          value={localRange.description || ''}
          onChange={(e) => setLocalRange((prev) => ({ ...prev, description: e.target.value || undefined }))}
          placeholder={t('training.descriptionPlaceholder')}
          rows={2}
          style={{ width: 450, background: '#1e293b', borderColor: '#475569', color: '#e2e8f0', fontSize: 13 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {localRange.colors.map((color) => (
          <div
            key={color.id}
            onClick={() => setSelectedColor(color.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              background: selectedColor === color.id ? '#334155' : 'transparent',
              border: selectedColor === color.id ? '2px solid ' + color.hex : '2px solid transparent',
            }}
          >
            <ColorPicker
              value={color.hex}
              onChange={(c) => updateColorHex(color.id, c.toHexString())}
              size="small"
              trigger="click"
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: color.hex,
                  border: '1px solid #475569',
                  cursor: 'pointer',
                }}
              />
            </ColorPicker>
            {editingColor === color.id ? (
              <Input
                value={color.name}
                onChange={(e) => updateColorName(color.id, e.target.value)}
                onBlur={() => setEditingColor(null)}
                onPressEnter={() => setEditingColor(null)}
                autoFocus
                style={{ width: 80, height: 24, fontSize: 12, background: '#0f172a', borderColor: '#475569', color: '#e2e8f0' }}
              />
            ) : (
              <Text
                style={{ color: '#e2e8f0', fontSize: 13, cursor: 'pointer', minWidth: 40 }}
                onClick={() => setEditingColor(color.id)}
              >
                {color.name || 'name'}
              </Text>
            )}
            <Button
              type="text"
              size="small"
              danger
              onClick={(e) => { e.stopPropagation(); removeColor(color.id); }}
              style={{ fontSize: 12, color: '#ef4444', padding: 0, minWidth: 20, height: 20 }}
            >
              x
            </Button>
          </div>
        ))}
        <Popover
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          trigger="click"
          placement="bottomLeft"
          content={
            <div style={{ width: 220 }}>
              <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 8 }}>Presets</Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                {PRESET_COLORS.map((hex) => (
                  <div
                    key={hex}
                    onClick={() => { addColor(hex); setPickerOpen(false); }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 4,
                      background: hex,
                      cursor: 'pointer',
                      border: '2px solid transparent',
                    }}
                  />
                ))}
              </div>
              {savedColors.length > 0 && (
                <>
                  <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 8 }}>My Colors</Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                    {savedColors.map((hex) => (
                      <div
                        key={hex}
                        onClick={() => { addColor(hex); setPickerOpen(false); }}
                        style={{ width: 28, height: 28, borderRadius: 4, background: hex, cursor: 'pointer', border: '2px solid transparent' }}
                      />
                    ))}
                  </div>
                </>
              )}
              <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>Custom</Text>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <ColorPicker
                  value={customHex}
                  onChange={(c) => setCustomHex(c.toHexString())}
                  size="small"
                >
                  <div style={{ width: 28, height: 28, borderRadius: 4, background: customHex, border: '1px solid #475569', cursor: 'pointer' }} />
                </ColorPicker>
                <Button
                  size="small"
                  type="primary"
                  onClick={() => { addColor(customHex, true); setPickerOpen(false); }}
                >
                  {t('training.save')}
                </Button>
              </div>
            </div>
          }
        >
          <Button type="dashed" icon={<PlusOutlined />} size="small">
            {t('training.addColor')}
          </Button>
        </Popover>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
        <div style={{ display: 'inline-block' }}>
          <div style={{ display: 'flex', marginBottom: 4 }}>
            <div style={{ width: CELL, height: CELL }} />
            {RANKS.map((r) => (
              <div key={r} style={{ width: CELL, height: CELL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#64748b' }}>{r}</div>
            ))}
          </div>
          {RANKS.map((rowRank, i) => (
            <div key={rowRank} style={{ display: 'flex', marginBottom: GAP }}>
              <div style={{ width: CELL, height: CELL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#64748b' }}>{rowRank}</div>
              {RANKS.map((colRank, j) => {
                const hand = handName(i, j);
                const w = getWeight(hand);
                const hasWeight = w > 0;
                return (
                  <div
                    key={hand}
                    onClick={() => handleCellClick(hand)}
                    onMouseEnter={(e) => {
                      if (e.buttons === 1 && selectedColor) {
                        paintCell(hand);
                      }
                    }}
                    style={{
                      width: CELL,
                      height: CELL,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      borderRadius: 3,
                      marginRight: GAP,
                      background: getCellBg(hand),
                      color: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.1s',
                      userSelect: 'none',
                      position: 'relative',
                      border: selectedHand === hand ? '2px solid #3b82f6' : '2px solid transparent',
                      boxShadow: selectedHand === hand ? '0 0 6px rgba(59,130,246,0.4)' : 'none',
                    }}
                    title={hand + (hasWeight ? ` (${w}%)` : '')}
                  >
                    {hand}
                    {hasWeight && (
                      <span style={{ position: 'absolute', bottom: 1, right: 2, fontSize: 7, opacity: 0.7, fontWeight: 400 }}>{w}%</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {selectedHand && localRange.grid[selectedHand] && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>100</Text>
            <Slider
              vertical
              min={0}
              max={100}
              reverse
              value={getWeight(selectedHand)}
              onChange={(v) => setWeight(selectedHand, v)}
              style={{ flex: 1, margin: 0 }}
              tooltip={{ formatter: (v) => `${v}%` }}
            />
            <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>0</Text>
            <Text style={{ color: '#e2e8f0', fontSize: 12, marginTop: 4 }}>{selectedHand}</Text>
            <Text style={{ color: '#64748b', fontSize: 11 }}>{getWeight(selectedHand)}%</Text>
            <Button size="small" type="text" onClick={() => setSelectedHand(null)} style={{ color: '#64748b', fontSize: 11, padding: 0, height: 20 }}>OK</Button>
          </div>
        )}
      </div>
    </div>
  );

  function addColor(hex: string, saveToLib = false) {
    const id = 'c' + Date.now();
    setLocalRange((prev) => ({
      ...prev,
      colors: [...prev.colors, { id, name: '', hex }],
    }));
    setEditingColor(id);
    if (saveToLib && !savedColors.includes(hex)) {
      const updated = [...savedColors, hex];
      setSavedColors(updated);
      saveColorLibrary(updated);
    }
  }

  function updateColorName(id: string, name: string) {
    setLocalRange((prev) => ({
      ...prev,
      colors: prev.colors.map((c) => (c.id === id ? { ...c, name } : c)),
    }));
  }

  function updateColorHex(id: string, hex: string) {
    setLocalRange((prev) => ({
      ...prev,
      colors: prev.colors.map((c) => (c.id === id ? { ...c, hex } : c)),
    }));
  }

  function removeColor(id: string) {
    setLocalRange((prev) => {
      const grid = { ...prev.grid };
      for (const [hand, cid] of Object.entries(grid)) {
        if (cid === id) delete grid[hand];
      }
      return {
        ...prev,
        colors: prev.colors.filter((c) => c.id !== id),
        grid,
      };
    });
  }
}
