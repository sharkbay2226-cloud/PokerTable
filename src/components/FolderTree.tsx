import { useState } from 'react';
import { Button, Input, Typography } from 'antd';
import { FolderOutlined, FileOutlined, PlusOutlined, DeleteOutlined, FolderAddOutlined, DragOutlined, CaretRightOutlined, CaretDownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { TrainingItem } from '../types';
import { isFolder, createFolder, createRange } from '../types';

const { Text } = Typography;

interface FlatItem {
  id: string;
  depth: number;
  item: TrainingItem;
  isOpen: boolean;
}

interface Props {
  items: TrainingItem[];
  onChange: (items: TrainingItem[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function FolderTree({ items, onChange, selectedId, onSelect }: Props) {
  const { t } = useTranslation();
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'inside' | 'after' | null>(null);

  const hasChildren = (parentId: string): boolean =>
    items.some((i) => i.parentId === parentId);

  const flattenTree = (parentId: string | null, depth: number): FlatItem[] => {
    const children = items.filter((i) => i.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
    const result: FlatItem[] = [];
    for (const child of children) {
      const isF = isFolder(child);
      const isOpen = openFolders.has(child.id);
      result.push({ id: child.id, depth, item: child, isOpen });
      if (isF && isOpen) {
        result.push(...flattenTree(child.id, depth + 1));
      }
    }
    return result;
  };

  const flatList = flattenTree(null, 0);

  const toggleFolder = (id: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const finishEdit = () => {
    if (editingId && editName.trim()) {
      onChange(items.map((i) => (i.id === editingId ? { ...i, name: editName.trim() } : i)));
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const toRemove = new Set<string>();
    const collect = (parentId: string) => {
      toRemove.add(parentId);
      for (const item of items) {
        if (item.parentId === parentId) {
          toRemove.add(item.id);
          if (isFolder(item)) collect(item.id);
        }
      }
    };
    collect(id);
    onChange(items.filter((i) => !toRemove.has(i.id)));
  };

  const handleNewFolder = () => {
    const folder = createFolder('New Folder', null);
    onChange([...items, folder]);
    startEdit(folder.id, folder.name);
  };

  const handleNewRange = () => {
    const range = createRange('New Range', null);
    onChange([...items, range]);
    startEdit(range.id, range.name);
    onSelect(range.id);
  };

  const getDropDepth = (targetId: string): number => {
    const target = items.find((i) => i.id === targetId);
    if (!target) return 0;
    if (isFolder(target)) return 1;
    return 1;
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDragId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragId || dragId === targetId) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    const target = items.find((i) => i.id === targetId);

    let pos: 'before' | 'inside' | 'after';
    if (target && isFolder(target) && y > h * 0.3 && y < h * 0.7) {
      pos = 'inside';
    } else if (y < h * 0.4) {
      pos = 'before';
    } else {
      pos = 'after';
    }

    setDropTarget(targetId);
    setDropPosition(pos);
  };

  const handleDragLeave = (e: React.DragEvent, targetId: string) => {
    if (dropTarget === targetId) {
      setDropTarget(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === targetId) {
      setDragId(null);
      setDropTarget(null);
      setDropPosition(null);
      return;
    }

    const dragged = items.find((i) => i.id === draggedId);
    if (!dragged) return;
    if (!dropPosition) return;

    const isTargetChild = (parentId: string, childId: string): boolean => {
      const child = items.find((i) => i.id === childId);
      if (!child) return false;
      if (child.parentId === parentId) return true;
      if (child.parentId !== null) return isTargetChild(parentId, child.parentId);
      return false;
    };

    if (isTargetChild(draggedId, targetId)) {
      setDragId(null);
      setDropTarget(null);
      setDropPosition(null);
      return;
    }

    const newItems = items.filter((i) => i.id !== draggedId);
    let newParentId: string | null;

    if (dropPosition === 'inside') {
      newParentId = targetId;
    } else {
      const target = items.find((i) => i.id === targetId);
      if (!target) { setDragId(null); setDropTarget(null); setDropPosition(null); return; }
      newParentId = target.parentId;
    }

    const updated = { ...dragged, parentId: newParentId };
    const insertIdx = newItems.findIndex((i) => i.id === targetId);
    if (insertIdx >= 0 && dropPosition === 'after') {
      newItems.splice(insertIdx + 1, 0, updated as TrainingItem);
    } else if (insertIdx >= 0 && dropPosition === 'before') {
      newItems.splice(insertIdx, 0, updated as TrainingItem);
    } else {
      newItems.push(updated as TrainingItem);
    }

    onChange(newItems);
    setDragId(null);
    setDropTarget(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDropTarget(null);
    setDropPosition(null);
  };

  const getItemStyle = (flatItem: FlatItem): React.CSSProperties => {
    const style: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 8px',
      borderRadius: 6,
      cursor: 'pointer',
      marginLeft: flatItem.depth * 20,
      background: selectedId === flatItem.id ? '#1e3a5f' : 'transparent',
    };

    if (dragId === flatItem.id) {
      style.opacity = 0.4;
    }

    if (dropTarget === flatItem.id) {
      if (dropPosition === 'before') {
        style.borderTop = '2px solid #3b82f6';
      } else if (dropPosition === 'after') {
        style.borderBottom = '2px solid #3b82f6';
      } else if (dropPosition === 'inside') {
        style.boxShadow = 'inset 0 0 0 2px #3b82f6';
        style.borderRadius = 6;
      }
    }

    return style;
  };

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 6, marginBottom: 12 }}>
        <Button size="small" icon={<FolderAddOutlined />} onClick={handleNewFolder} style={{ flex: 1 }}>{t('training.newFolder')}</Button>
        <Button size="small" icon={<PlusOutlined />} onClick={handleNewRange} style={{ flex: 1 }}>{t('training.newRange')}</Button>
      </div>

      {flatList.length === 0 && (
        <Text style={{ color: '#64748b', fontSize: 13 }}>{t('training.noItems')}</Text>
      )}

      <div
        style={{ minHeight: 200 }}
        onDragOver={(e) => {
          if (dragId && flatList.length === 0) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }
        }}
        onDrop={(e) => {
          if (dragId && flatList.length === 0) {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('text/plain');
            const dragged = items.find((i) => i.id === draggedId);
            if (dragged) {
              onChange(items.map((i) => i.id === draggedId ? { ...dragged, parentId: null } as TrainingItem : i));
            }
            setDragId(null);
          }
        }}
      >
        {flatList.map((flatItem) => (
          <div
            key={flatItem.id}
            draggable
            onDragStart={(e) => handleDragStart(e, flatItem.id)}
            onDragOver={(e) => handleDragOver(e, flatItem.id)}
            onDragLeave={(e) => handleDragLeave(e, flatItem.id)}
            onDrop={(e) => handleDrop(e, flatItem.id)}
            onDragEnd={handleDragEnd}
            style={getItemStyle(flatItem)}
            onClick={() => {
              if (isFolder(flatItem.item)) {
                toggleFolder(flatItem.id);
              } else {
                onSelect(flatItem.id);
              }
            }}
          >
            <DragOutlined style={{ color: '#475569', fontSize: 12, cursor: 'grab' }} />
            {isFolder(flatItem.item) ? (
              <>
                {hasChildren(flatItem.id) ? (
                  flatItem.isOpen ? (
                    <CaretDownOutlined style={{ color: '#94a3b8', fontSize: 12 }} />
                  ) : (
                    <CaretRightOutlined style={{ color: '#94a3b8', fontSize: 12 }} />
                  )
                ) : (
                  <div style={{ width: 12 }} />
                )}
                <FolderOutlined style={{ color: '#eab308', fontSize: 14 }} />
              </>
            ) : (
              <div style={{ width: 12 }} />
            )}
            {editingId === flatItem.id ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={finishEdit}
                onPressEnter={finishEdit}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                style={{ height: 24, fontSize: 13, background: '#0f172a', borderColor: '#475569', color: '#e2e8f0', flex: 1 }}
              />
            ) : (
              <Text
                style={{ color: '#e2e8f0', fontSize: 13, flex: 1 }}
                onDoubleClick={() => startEdit(flatItem.id, flatItem.item.name)}
              >
                {flatItem.item.name}
              </Text>
            )}
            <DeleteOutlined
              style={{ color: '#ef4444', fontSize: 12, opacity: 0.6, cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); handleDelete(flatItem.id); }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
