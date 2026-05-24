import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Typography, Tabs, Button, Space, Card, message, Select } from 'antd';
import { EditOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { isRange, isFolder } from '../types';
import type { TrainingItem, RangeData } from '../types';
import { loadTrainingData, saveTrainingData } from '../db/db';
import FolderTree from '../components/FolderTree';
import RangeEditor from '../components/RangeEditor';
import GridTrainer from '../components/GridTrainer';
import type { GridMatrix, CellData } from '../components/GridEditor';

const { Title, Text } = Typography;
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

function allHandsOrder(): string[] {
  const hands: string[] = [];
  for (let i = 0; i < RANKS.length; i++) {
    for (let j = 0; j < RANKS.length; j++) {
      if (i === j) hands.push(RANKS[i] + RANKS[j]);
      else if (i < j) hands.push(RANKS[i] + RANKS[j] + 's');
      else hands.push(RANKS[j] + RANKS[i] + 'o');
    }
  }
  return hands;
}

function rangeToGrid(range: RangeData): GridMatrix {
  const allHands = allHandsOrder();
  const cells: Record<string, CellData> = {};
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      const hand = allHands[r * 13 + c];
      const colorId = range.grid[hand];
      if (colorId) {
        cells[`${r},${c}`] = { colorId, weight: range.weights?.[hand] };

      }
    }
  }
  return {
    id: range.id,
    name: range.name,
    description: range.description,
    rows: 13,
    cols: 13,
    rowLabels: RANKS,
    colLabels: RANKS,
    cells,
    colors: range.colors || [
      { id: 'c1', name: 'Raise', hex: '#22c55e' },
      { id: 'c2', name: 'Call', hex: '#eab308' },
      { id: 'c3', name: 'Fold', hex: '#ef4444' },
    ],
  };
}

export default function TrainingPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<TrainingItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingRange, setEditingRange] = useState<RangeData | null>(null);
  const [tab, setTab] = useState('editor');
  const [loading, setLoading] = useState(true);
  const [trainerFolderId, setTrainerFolderId] = useState<string | null>(null);
  const [trainerRangeId, setTrainerRangeId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await loadTrainingData();
        if (data && data.length > 0) {
          setItems(data);
          setLoading(false);
          return;
        }
      } catch {}
      const LOCAL_KEY = 'poker-diary-training';
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) {
          const local = JSON.parse(raw);
          if (local.length > 0) {
            setItems(local);
            await saveTrainingData(local).catch(() => {});
            localStorage.removeItem(LOCAL_KEY);
          }
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const save = useCallback(async (newItems: TrainingItem[]) => {
    setItems(newItems);
    try {
      await saveTrainingData(newItems);
    } catch (e) {
      message.error('Failed to save training data: ' + (e instanceof Error ? e.message : String(e)));
    }
  }, []);

  const handleItemsChange = (newItems: TrainingItem[]) => {
    save(newItems);
  };

  const handleSelect = (id: string | null) => {
    setSelectedId(id);
    if (id) {
      const item = items.find((i) => i.id === id);
      if (item && isRange(item)) {
        setEditingRange({ ...item });
      } else {
        setEditingRange(null);
      }
    } else {
      setEditingRange(null);
    }
  };

  const handleSaveRange = (range: RangeData) => {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === range.id ? { ...range, parentId: i.parentId } : i));
      saveTrainingData(next).catch((e) => message.error('Failed to save: ' + e.message));
      return next;
    });
    setEditingRange(range);
  };

  const handleCancelEdit = () => {
    setEditingRange(null);
    setSelectedId(null);
  };

  const selectedItem = useMemo(() => {
    if (editingRange) return editingRange;
    if (!selectedId) return null;
    const item = items.find((i) => i.id === selectedId && isRange(i));
    return item ? (item as RangeData) : null;
  }, [editingRange, selectedId, items]);

  const folders = useMemo(() => items.filter(isFolder), [items]);

  const trainerRanges = useMemo(() => {
    if (!trainerFolderId) return [];
    return items.filter(i => isRange(i) && i.parentId === trainerFolderId) as RangeData[];
  }, [items, trainerFolderId]);

  const trainerRange = useMemo(() => {
    if (!trainerRangeId) return null;
    return items.find(i => i.id === trainerRangeId && isRange(i)) as RangeData | null;
  }, [items, trainerRangeId]);

  const trainerGrid = useMemo(() => {
    if (!trainerRange) return null;
    return rangeToGrid(trainerRange);
  }, [trainerRange]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: '#64748b' }}>Loading...</div>;

  return (
    <div>
      <Title level={3} style={{ marginBottom: 16 }}>{t('training.title')}</Title>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        style={{ marginBottom: 16 }}
        items={[
          {
            key: 'editor',
            label: <span><EditOutlined /> {t('training.tabEditor')}</span>,
            children: (
              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ width: 320, flexShrink: 0 }}>
                  <Card title={t('training.library')} style={{ background: '#0f172a', borderColor: '#334155' }} headStyle={{ color: '#e2e8f0', borderBottomColor: '#334155' }}>
                    <FolderTree items={items} onChange={handleItemsChange} selectedId={selectedId} onSelect={handleSelect} />
                  </Card>
                </div>
                <div style={{ flex: 1 }}>
                  {selectedItem ? (
                    <RangeEditor
                      key={selectedItem.id}
                      range={selectedItem}
                      onSave={handleSaveRange}
                      onCancel={handleCancelEdit}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#64748b' }}>
                      {t('training.selectRange')}
                    </div>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'trainer',
            label: <span><PlayCircleOutlined /> {t('training.tabTrainer')}</span>,
            children: (
              <div>
                <Card style={{ background: '#0f172a', borderColor: '#334155', marginBottom: 16 }}>
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <div>
                      <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('training.selectFolder')}</Text>
                      <Select
                        placeholder={t('training.selectFolder')}
                        style={{ width: '100%' }}
                        value={trainerFolderId}
                        onChange={(v) => { setTrainerFolderId(v); setTrainerRangeId(null); }}
                        options={folders.map(f => ({ value: f.id, label: f.name }))}
                        allowClear
                      />
                    </div>
                    {trainerFolderId && (
                      <div>
                        <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6 }}>{t('training.chooseRange')}</Text>
                        <Select
                          placeholder={t('training.chooseRange')}
                          style={{ width: '100%' }}
                          value={trainerRangeId}
                          onChange={setTrainerRangeId}
                          options={trainerRanges.map(r => ({ value: r.id, label: r.name }))}
                          allowClear
                        />
                      </div>
                    )}
                  </Space>
                </Card>
                {trainerGrid && trainerRangeId ? (
                  <GridTrainer key={trainerGrid.id} matrix={trainerGrid} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#64748b' }}>
                    {t('training.selectRangePrompt')}
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
