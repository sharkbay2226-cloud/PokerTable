import { useState, useRef, useCallback } from 'react';
import { Button, Space, Input, ColorPicker, Typography, Popover, InputNumber, Slider, Tooltip } from 'antd';
import { PlusOutlined, SaveOutlined, CloseOutlined, BorderOutlined, BgColorsOutlined, ClearOutlined, ColumnHeightOutlined, ColumnWidthOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const PRESET_COLORS = [
  '#22c55e', '#eab308', '#ef4444', '#3b82f6', '#a855f7',
  '#ec4899', '#f97316', '#14b8a6', '#06b6d4', '#84cc16',
  '#f43f5e', '#6366f1', '#d946ef', '#78716c', '#1e293b',
];

const CELL = 40;

export interface CellData {
  colorId?: string;
  weight?: number;
  label?: string;
}

export interface GridColor {
  id: string;
  name: string;
  hex: string;
}

export interface GridMatrix {
  id: string;
  name: string;
  description?: string;
  rows: number;
  cols: number;
  rowLabels: string[];
  colLabels: string[];
  cells: Record<string, CellData>;
  colors: GridColor[];
}

let colorCounter = 0;
function nextColorId() { return 'g' + (++colorCounter); }

const defaultColors: GridColor[] = [
  { id: nextColorId(), name: 'Raise', hex: '#22c55e' },
  { id: nextColorId(), name: 'Call', hex: '#eab308' },
  { id: nextColorId(), name: 'Fold', hex: '#ef4444' },
];

export function createGrid(name: string): GridMatrix {
  return {
    id: crypto.randomUUID(),
    name,
    rows: 13,
    cols: 13,
    rowLabels: ['A','K','Q','J','T','9','8','7','6','5','4','3','2'],
    colLabels: ['A','K','Q','J','T','9','8','7','6','5','4','3','2'],
    cells: {},
    colors: defaultColors.map(c => ({ ...c })),
  };
}

const COLOR_LIB_KEY = 'poker-diary-color-library';
function loadColorLib(): string[] {
  try { return JSON.parse(localStorage.getItem(COLOR_LIB_KEY) || '[]'); } catch { return []; }
}
function saveColorLib(colors: string[]) {
  try { localStorage.setItem(COLOR_LIB_KEY, JSON.stringify(colors)); } catch {}
}

interface Props {
  matrix: GridMatrix;
  onSave: (m: GridMatrix) => void;
  onCancel: () => void;
}

export default function GridEditor({ matrix, onSave, onCancel }: Props) {
  const { t } = useTranslation();
  const [m, setM] = useState<GridMatrix>(() => JSON.parse(JSON.stringify(matrix)));
  const [selColor, setSelColor] = useState(m.colors[0]?.id ?? '');
  const [editingColor, setEditingColor] = useState<string | null>(null);
  const [ctxCell, setCtxCell] = useState<string | null>(null);
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customHex, setCustomHex] = useState('#22c55e');
  const [savedColors] = useState<string[]>(() => loadColorLib());
  const [tool, setTool] = useState<'paint' | 'eraser' | 'fill'>('paint');
  const [isDragging, setIsDragging] = useState(false);
  const [rowInput, setRowInput] = useState(String(m.rows));
  const [colInput, setColInput] = useState(String(m.cols));
  const gridRef = useRef<HTMLDivElement>(null);

  const getCell = (r: number, c: number): CellData => m.cells[`${r},${c}`] || {};
  const setCell = (r: number, c: number, data: CellData) => {
    setM(prev => {
      const cells = { ...prev.cells };
      const key = `${r},${c}`;
      const existing = cells[key] || {};
      const merged = { ...existing, ...data };
      if (!merged.colorId && merged.weight === undefined && !merged.label) {
        delete cells[key];
      } else {
        cells[key] = merged;
      }
      return { ...prev, cells };
    });
  };

  const handleCellClick = (r: number, c: number) => {
    if (tool === 'eraser') {
      setM(prev => {
        const cells = { ...prev.cells };
        delete cells[`${r},${c}`];
        return { ...prev, cells };
      });
    } else if (tool === 'fill') {
      const targetColor = getCell(r, c).colorId;
      if (!targetColor || !selColor) return;
      fillArea(r, c, targetColor, selColor);
    } else if (selColor) {
      const cell = getCell(r, c);
      if (cell.colorId === selColor) {
        setM(prev => {
          const cells = { ...prev.cells };
          delete cells[`${r},${c}`];
          return { ...prev, cells };
        });
      } else {
        setCell(r, c, { colorId: selColor, weight: cell.weight, label: cell.label });
      }
    }
  };

  const fillArea = (r: number, c: number, fromColor: string, toColor: string) => {
    if (fromColor === toColor) return;
    const visited = new Set<string>();
    const stack = [[r, c]];
    const rows = m.rows;
    const cols = m.cols;
    while (stack.length > 0) {
      const [cr, cc] = stack.pop()!;
      const key = `${cr},${cc}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const cell = m.cells[key];
      if ((cell?.colorId || '') !== fromColor) continue;
      setM(prev => {
        const cells = { ...prev.cells };
        cells[key] = { ...prev.cells[key], colorId: toColor };
        return { ...prev, cells };
      });
      for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          stack.push([nr, nc]);
        }
      }
    }
  };

  const handleMouseDown = (r: number, c: number) => {
    setIsDragging(true);
    handleCellClick(r, c);
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (!isDragging) return;
    if (tool === 'eraser') {
      setM(prev => {
        const cells = { ...prev.cells };
        delete cells[`${r},${c}`];
        return { ...prev, cells };
      });
    } else if (selColor && tool === 'paint') {
      setCell(r, c, { colorId: selColor });
    }
  };

  const handleContext = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    setCtxCell(`${r},${c}`);
    setCtxPos({ x: e.clientX, y: e.clientY });
  };

  const closeCtx = () => setCtxCell(null);

  const setWeight = (w: number | null) => {
    if (!ctxCell) return;
    const [r, c] = ctxCell.split(',').map(Number);
    if (w === null || w === 0) {
      setM(prev => {
        const cells = { ...prev.cells };
        const key = `${r},${c}`;
        if (cells[key]) {
          delete cells[key].weight;
          if (!cells[key].colorId && !cells[key].label) delete cells[key];
        }
        return { ...prev, cells };
      });
    } else {
      setCell(r, c, { weight: w });
    }
    closeCtx();
  };

  const setLabel = (label: string) => {
    if (!ctxCell) return;
    const [r, c] = ctxCell.split(',').map(Number);
    if (!label) {
      setM(prev => {
        const cells = { ...prev.cells };
        const key = `${r},${c}`;
        if (cells[key]) {
          delete cells[key].label;
          if (!cells[key].colorId && !cells[key].weight) delete cells[key];
        }
        return { ...prev, cells };
      });
    } else {
      setCell(r, c, { label });
    }
    closeCtx();
  };

  const selectRow = (r: number) => {
    if (!selColor) return;
    setM(prev => {
      const cells = { ...prev.cells };
      for (let c = 0; c < prev.cols; c++) {
        cells[`${r},${c}`] = { ...cells[`${r},${c}`], colorId: selColor };
      }
      return { ...prev, cells };
    });
  };

  const selectCol = (c: number) => {
    if (!selColor) return;
    setM(prev => {
      const cells = { ...prev.cells };
      for (let r = 0; r < prev.rows; r++) {
        cells[`${r},${c}`] = { ...cells[`${r},${c}`], colorId: selColor };
      }
      return { ...prev, cells };
    });
  };

  const clearGrid = () => {
    setM(prev => ({ ...prev, cells: {} }));
  };

  const applySize = () => {
    const rows = parseInt(rowInput) || m.rows;
    const cols = parseInt(colInput) || m.cols;
    setM(prev => {
      const cells = { ...prev.cells };
      for (const key of Object.keys(cells)) {
        const [r, c] = key.split(',').map(Number);
        if (r >= rows || c >= cols) delete cells[key];
      }
      return {
        ...prev,
        rows: Math.min(rows, 50),
        cols: Math.min(cols, 50),
        rowLabels: prev.rowLabels.slice(0, rows),
        colLabels: prev.colLabels.slice(0, cols),
        cells,
      };
    });
  };

  const addColor = (hex: string, saveToLib = false) => {
    const id = nextColorId();
    setM(prev => ({ ...prev, colors: [...prev.colors, { id, name: '', hex }] }));
    setEditingColor(id);
    if (saveToLib) {
      const lib = loadColorLib();
      if (!lib.includes(hex)) {
        const updated = [...lib, hex];
        saveColorLib(updated);
      }
    }
  };

  const updateColorName = (id: string, name: string) => {
    setM(prev => ({ ...prev, colors: prev.colors.map(c => c.id === id ? { ...c, name } : c) }));
  };

  const updateColorHex = (id: string, hex: string) => {
    setM(prev => ({ ...prev, colors: prev.colors.map(c => c.id === id ? { ...c, hex } : c) }));
  };

  const removeColor = (id: string) => {
    setM(prev => {
      const cells = { ...prev.cells };
      for (const [key, cell] of Object.entries(cells)) {
        if (cell.colorId === id) {
          const updated = { ...cell };
          delete updated.colorId;
          if (!updated.weight && !updated.label) delete cells[key];
          else cells[key] = updated;
        }
      }
      return { ...prev, colors: prev.colors.filter(c => c.id !== id), cells };
    });
  };

  const ctxR = ctxCell ? parseInt(ctxCell.split(',')[0]) : 0;
  const ctxC = ctxCell ? parseInt(ctxCell.split(',')[1]) : 0;
  const ctxData = ctxCell ? getCell(ctxR, ctxC) : {};

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Input
          value={m.name}
          onChange={e => setM(prev => ({ ...prev, name: e.target.value }))}
          style={{ width: 200, background: '#1e293b', borderColor: '#475569', color: '#e2e8f0' }}
        />
        <Space size={4}>
          <InputNumber min={1} max={50} value={m.rows} onChange={v => setRowInput(String(v || m.rows))} style={{ width: 60, background: '#1e293b', borderColor: '#475569' }} />
          <Text style={{ color: '#94a3b8' }}>x</Text>
          <InputNumber min={1} max={50} value={m.cols} onChange={v => setColInput(String(v || m.cols))} style={{ width: 60, background: '#1e293b', borderColor: '#475569' }} />
          <Button size="small" onClick={applySize}>{t('training.apply')}</Button>
        </Space>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<SaveOutlined />} onClick={() => onSave(m)}>{t('training.save')}</Button>
        <Button icon={<CloseOutlined />} onClick={onCancel}>{t('training.cancel')}</Button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Tooltip title={t('training.paint')}>
          <Button size="small" type={tool === 'paint' ? 'primary' : 'default'} icon={<BgColorsOutlined />} onClick={() => setTool('paint')} />
        </Tooltip>
        <Tooltip title={t('training.eraser')}>
          <Button size="small" type={tool === 'eraser' ? 'primary' : 'default'} icon={<ClearOutlined />} onClick={() => setTool('eraser')} />
        </Tooltip>
        <Tooltip title={t('training.fill')}>
          <Button size="small" type={tool === 'fill' ? 'primary' : 'default'} icon={<BorderOutlined />} onClick={() => setTool('fill')} />
        </Tooltip>
        <div style={{ width: 1, height: 24, background: '#334155', margin: '0 4px' }} />
        {m.colors.map(color => (
          <div
            key={color.id}
            onClick={() => { setSelColor(color.id); setTool('paint'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6,
              cursor: 'pointer', background: selColor === color.id ? '#334155' : 'transparent',
              border: selColor === color.id ? `2px solid ${color.hex}` : '2px solid transparent',
            }}
          >
            <ColorPicker value={color.hex} onChange={c => updateColorHex(color.id, c.toHexString())} size="small" trigger="click">
              <div style={{ width: 18, height: 18, borderRadius: 3, background: color.hex, border: '1px solid #475569', cursor: 'pointer' }} />
            </ColorPicker>
            {editingColor === color.id ? (
              <Input value={color.name} onChange={e => updateColorName(color.id, e.target.value)} onBlur={() => setEditingColor(null)} onPressEnter={() => setEditingColor(null)} autoFocus style={{ width: 70, height: 22, fontSize: 11, background: '#0f172a', borderColor: '#475569', color: '#e2e8f0' }} />
            ) : (
              <Text style={{ color: '#e2e8f0', fontSize: 12, cursor: 'pointer' }} onClick={() => setEditingColor(color.id)}>{color.name || '—'}</Text>
            )}
            <Button type="text" size="small" danger onClick={e => { e.stopPropagation(); removeColor(color.id); }} style={{ fontSize: 10, color: '#ef4444', padding: 0, minWidth: 16, height: 16 }}>x</Button>
          </div>
        ))}
        <Popover
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          trigger="click"
          content={
            <div style={{ width: 220 }}>
              <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 8 }}>Presets</Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                {PRESET_COLORS.map(hex => (
                  <div key={hex} onClick={() => { addColor(hex); setPickerOpen(false); }} style={{ width: 26, height: 26, borderRadius: 4, background: hex, cursor: 'pointer' }} />
                ))}
              </div>
              {savedColors.length > 0 && (
                <>
                  <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 8 }}>My Colors</Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                    {savedColors.map(hex => (
                      <div key={hex} onClick={() => { addColor(hex); setPickerOpen(false); }} style={{ width: 26, height: 26, borderRadius: 4, background: hex, cursor: 'pointer' }} />
                    ))}
                  </div>
                </>
              )}
              <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>Custom</Text>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <ColorPicker value={customHex} onChange={c => setCustomHex(c.toHexString())} size="small">
                  <div style={{ width: 26, height: 26, borderRadius: 4, background: customHex, border: '1px solid #475569', cursor: 'pointer' }} />
                </ColorPicker>
                <Button size="small" type="primary" onClick={() => { addColor(customHex, true); setPickerOpen(false); }}>{t('training.save')}</Button>
              </div>
            </div>
          }
        >
          <Button type="dashed" size="small" icon={<PlusOutlined />}>{t('training.addColor')}</Button>
        </Popover>
        <div style={{ width: 1, height: 24, background: '#334155', margin: '0 4px' }} />
        <Button size="small" danger onClick={clearGrid}>{t('training.clear')}</Button>
      </div>

      <div style={{ overflowX: 'auto' }} ref={gridRef} onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}>
        <div style={{ display: 'inline-block' }}>
          <div style={{ display: 'flex' }}>
            <div style={{ width: CELL, height: 24 }} />
            {Array.from({ length: m.cols }, (_, c) => (
              <div key={c} style={{ width: CELL, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Button type="text" size="small" icon={<ColumnWidthOutlined />} onClick={() => selectCol(c)} style={{ fontSize: 10, color: '#64748b', height: 18, width: 18, padding: 0 }} />
                <Input
                  value={m.colLabels[c] || ''}
                  onChange={e => setM(prev => {
                    const labels = [...prev.colLabels];
                    labels[c] = e.target.value;
                    return { ...prev, colLabels: labels };
                  })}
                  style={{ width: CELL - 4, height: 22, fontSize: 10, textAlign: 'center', background: '#1e293b', borderColor: '#475569', color: '#e2e8f0', padding: 0 }}
                />
              </div>
            ))}
          </div>
          {Array.from({ length: m.rows }, (_, r) => (
            <div key={r} style={{ display: 'flex' }}>
              <div style={{ width: CELL, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Button type="text" size="small" icon={<ColumnHeightOutlined />} onClick={() => selectRow(r)} style={{ fontSize: 10, color: '#64748b', height: 18, width: 18, padding: 0 }} />
                <Input
                  value={m.rowLabels[r] || ''}
                  onChange={e => setM(prev => {
                    const labels = [...prev.rowLabels];
                    labels[r] = e.target.value;
                    return { ...prev, rowLabels: labels };
                  })}
                  style={{ width: CELL - 4, height: 22, fontSize: 10, textAlign: 'center', background: '#1e293b', borderColor: '#475569', color: '#e2e8f0', padding: 0 }}
                />
              </div>
              {Array.from({ length: m.cols }, (_, c) => {
                const cell = getCell(r, c);
                const color = cell.colorId ? m.colors.find(co => co.id === cell.colorId) : undefined;
                return (
                  <div
                    key={c}
                    onMouseDown={() => handleMouseDown(r, c)}
                    onMouseEnter={() => handleMouseEnter(r, c)}
                    onContextMenu={e => handleContext(e, r, c)}
                    style={{
                      width: CELL,
                      height: CELL,
                      background: color?.hex || '#1e293b',
                      border: '1px solid #334155',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      color: '#fff',
                      fontWeight: 600,
                      transition: 'background 0.1s',
                    }}
                  >
                    {cell.label && <span style={{ fontSize: 8, opacity: 0.8 }}>{cell.label}</span>}
                    {cell.weight !== undefined && (
                      <span style={{ position: 'absolute', bottom: 1, right: 2, fontSize: 7, opacity: 0.6 }}>{cell.weight}%</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {ctxCell && (
        <div
          style={{
            position: 'fixed', top: ctxPos.y, left: ctxPos.x, zIndex: 1000,
            background: '#1e293b', border: '1px solid #475569', borderRadius: 8, padding: 12,
            minWidth: 180,
          }}
        >
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            <Text style={{ color: '#94a3b8', fontSize: 11 }}>{m.rowLabels[ctxR] || ctxR}:{m.colLabels[ctxC] || ctxC}</Text>
            <div>
              <Text style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginBottom: 4 }}>Weight: {ctxData.weight ?? 0}%</Text>
              <Slider min={0} max={100} value={ctxData.weight || 0} onChange={v => setWeight(v)} style={{ margin: 0 }} />
            </div>
            <Input
              placeholder="Label"
              value={ctxData.label || ''}
              onChange={e => setLabel(e.target.value)}
              onPressEnter={() => closeCtx()}
              style={{ height: 26, fontSize: 12, background: '#0f172a', borderColor: '#475569', color: '#e2e8f0' }}
            />
            <Button size="small" onClick={closeCtx} style={{ width: '100%' }}>Done</Button>
          </Space>
        </div>
      )}
    </div>
  );
}
