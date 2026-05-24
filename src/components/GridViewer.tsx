import { useState, useRef, useMemo } from 'react';
import { Button, Space, Typography, Switch, Tooltip, InputNumber, Slider, Select } from 'antd';
import { FullscreenOutlined, FullscreenExitOutlined, ZoomInOutlined, ZoomOutOutlined, ShareAltOutlined, DownloadOutlined, FilterOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { GridMatrix } from './GridEditor';

const { Text } = Typography;
const BASE = 36;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;

interface Props {
  matrix: GridMatrix;
}

function isLight(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 150;
}

function compressToBase64(obj: unknown): string {
  try {
    const json = JSON.stringify(obj);
    return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
  } catch {
    return '';
  }
}

function decompressFromBase64(str: string): unknown | null {
  try {
    const json = decodeURIComponent(atob(str).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function GridViewer({ matrix }: Props) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [filterColorId, setFilterColorId] = useState<string | null>(null);
  const [filterWeightMin, setFilterWeightMin] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const cellSize = Math.round(BASE * zoom);

  const handleShare = async () => {
    const encoded = compressToBase64({ n: matrix.name, r: matrix.rows, c: matrix.cols, rl: matrix.rowLabels, cl: matrix.colLabels, cs: matrix.cells, co: matrix.colors.map(c => ({ i: c.id, n: c.name, h: c.hex })) });
    const url = `${window.location.origin}${window.location.pathname}?grid=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(matrix, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${matrix.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cellColor = (colorId?: string) => matrix.colors.find(c => c.id === colorId);

  const visibleCells = useMemo(() => {
    const allKeys: string[] = [];
    for (let r = 0; r < matrix.rows; r++) {
      for (let c = 0; c < matrix.cols; c++) {
        allKeys.push(`${r},${c}`);
      }
    }
    return allKeys.filter(key => {
      const cell = matrix.cells[key];
      if (filterColorId && cell?.colorId !== filterColorId) return false;
      if (filterWeightMin > 0 && (cell?.weight ?? 0) < filterWeightMin) return false;
      return true;
    });
  }, [matrix, filterColorId, filterWeightMin]);

  const body = (
    <div style={{ padding: fullscreen ? 24 : 0, height: fullscreen ? '100vh' : 'auto', background: '#0f172a', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Text style={{ color: '#e2e8f0', fontWeight: 600 }}>{matrix.name}</Text>
        <Text style={{ color: '#64748b', fontSize: 12 }}>{matrix.rows}x{matrix.cols}</Text>
        <div style={{ flex: 1 }} />
        <Space size={4}>
          <Tooltip title={t('training.filter')}>
            <FilterOutlined style={{ color: '#64748b', fontSize: 14 }} />
          </Tooltip>
          <Select
            style={{ width: 120 }}
            size="small"
            allowClear
            placeholder={t('training.color')}
            value={filterColorId}
            onChange={v => setFilterColorId(v || null)}
            options={matrix.colors.map(c => ({ label: c.name || c.hex, value: c.id }))}
          />
          {matrix.colors.some(c => matrix.cells[Object.keys(matrix.cells)[0]]?.weight !== undefined) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#94a3b8', fontSize: 11 }}>Weight ≥</Text>
              <InputNumber min={0} max={100} value={filterWeightMin} onChange={v => setFilterWeightMin(v || 0)} size="small" style={{ width: 60, background: '#1e293b', borderColor: '#475569' }} />
            </div>
          )}
        </Space>
        <Space size={4}>
          <Button size="small" icon={<ZoomOutOutlined />} onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 0.2))} />
          <Text style={{ color: '#94a3b8', fontSize: 11, minWidth: 32, textAlign: 'center' }}>{Math.round(zoom * 100)}%</Text>
          <Button size="small" icon={<ZoomInOutlined />} onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 0.2))} />
          <div style={{ width: 80 }}>
            <Slider min={MIN_ZOOM * 100} max={MAX_ZOOM * 100} value={zoom * 100} onChange={v => setZoom(v / 100)} step={5} />
          </div>
        </Space>
        <Button size="small" icon={<DownloadOutlined />} onClick={handleExport}>{t('training.export')}</Button>
        <Button size="small" icon={<ShareAltOutlined />} onClick={handleShare}>{t('training.share')}</Button>
        {!fullscreen ? (
          <Button size="small" icon={<FullscreenOutlined />} onClick={() => setFullscreen(true)}>{t('training.fullscreen')}</Button>
        ) : (
          <Button size="small" icon={<FullscreenExitOutlined />} onClick={() => setFullscreen(false)}>{t('training.exitFullscreen')}</Button>
        )}
      </div>

      {filterColorId || filterWeightMin > 0 ? (
        <div style={{ marginBottom: 8, padding: 8, borderRadius: 6, background: '#1e293b' }}>
          <Text style={{ color: '#94a3b8', fontSize: 12 }}>
            {t('training.showing')} {visibleCells.length} / {matrix.rows * matrix.cols} {t('training.cells')}
          </Text>
        </div>
      ) : null}

      <div ref={containerRef} style={{ overflowX: 'auto', display: 'inline-block' }}>
        <div>
          <div style={{ display: 'flex' }}>
            <div style={{ width: cellSize, height: Math.round(cellSize * 0.6) }} />
            {Array.from({ length: matrix.cols }, (_, c) => (
              <div key={c} style={{ width: cellSize, textAlign: 'center', color: '#64748b', fontSize: Math.max(8, Math.round(12 * zoom)), lineHeight: `${Math.round(cellSize * 0.6)}px` }}>
                {matrix.colLabels[c]}
              </div>
            ))}
          </div>
          {Array.from({ length: matrix.rows }, (_, r) => (
            <div key={r} style={{ display: 'flex' }}>
              <div style={{ width: cellSize, textAlign: 'center', color: '#64748b', fontSize: Math.max(8, Math.round(12 * zoom)), lineHeight: `${cellSize}px` }}>
                {matrix.rowLabels[r]}
              </div>
              {Array.from({ length: matrix.cols }, (_, c) => {
                const key = `${r},${c}`;
                const cell = matrix.cells[key];
                const color = cellColor(cell?.colorId);
                const bg = color?.hex || '#1e293b';
                const showWeight = cell?.weight !== undefined && cell.weight > 0;
                const fg = isLight(bg) ? '#0f172a' : '#e2e8f0';
                return (
                  <div
                    style={{
                      width: cellSize,
                      height: cellSize,
                      background: bg,
                      border: '1px solid #334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: Math.max(7, Math.round(10 * zoom)),
                      color: fg,
                      fontWeight: 600,
                      position: 'relative',
                    }}
                  >
                    {cell?.label && <span>{cell.label}</span>}
                    {showWeight && (
                      <span style={{ position: 'absolute', bottom: 1, right: 2, fontSize: Math.max(6, Math.round(8 * zoom)), opacity: 0.7 }}>{cell.weight}%</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (fullscreen) {
    return body;
  }

  return body;
}


