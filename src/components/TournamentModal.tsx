import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Button, List, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAllTournaments, addTournament, updateTournament, deleteTournament, getAllRooms } from '../db/db';
import type { Tournament, Room, Currency } from '../types';
import { TOURNAMENT_TYPES } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function TournamentModal({ open, onClose }: Props) {
  const [tournaments, setTournaments] = useState<(Tournament & { roomName?: string })[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [customType, setCustomType] = useState('');

  const load = async () => {
    const [tours, roomList] = await Promise.all([getAllTournaments(), getAllRooms()]);
    setRooms(roomList);
    const enriched = tours.map((t) => ({
      ...t,
      roomName: roomList.find((r) => r.id === t.roomId)?.name ?? '—',
    }));
    setTournaments(enriched);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const handleSubmit = async (values: { name: string; roomId: string; buyIn: number; currency: Currency; type?: string }) => {
    setLoading(true);
    try {
      const type = values.type === '__custom__' ? customType : values.type;
      if (editingId) {
        await updateTournament(editingId, { ...values, type });
      } else {
        await addTournament({ ...values, type });
      }
      form.resetFields();
      setEditingId(null);
      setCustomType('');
      await load();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (t: Tournament) => {
    setEditingId(t.id);
    form.setFieldsValue({ name: t.name, roomId: t.roomId, buyIn: t.buyIn, currency: t.currency, type: t.type && TOURNAMENT_TYPES.includes(t.type) ? t.type : '__custom__' });
    if (t.type && !TOURNAMENT_TYPES.includes(t.type)) {
      setCustomType(t.type);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteTournament(id);
    await load();
  };

  const handleCancel = () => {
    form.resetFields();
    setEditingId(null);
    setCustomType('');
    onClose();
  };

  return (
    <Modal title="Управление турнирами" open={open} onCancel={handleCancel} footer={null} width={650}>
      <Form form={form} layout="inline" onFinish={handleSubmit} style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Form.Item name="name" rules={[{ required: true, message: 'Введите название' }]}>
          <Input placeholder="Название турнира" style={{ width: 180 }} />
        </Form.Item>
        <Form.Item name="roomId" rules={[{ required: true, message: 'Выберите рум' }]}>
          <Select placeholder="Рум" style={{ width: 150 }}>
            {rooms.map((r) => (
              <Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="buyIn" rules={[{ required: true, message: 'Введите бай-ин' }]}>
          <InputNumber min={0} placeholder="Бай-ин" style={{ width: 100 }} />
        </Form.Item>
        <Form.Item name="currency" rules={[{ required: true, message: 'Выберите валюту' }]}>
          <Select placeholder="Валюта" style={{ width: 100 }}>
            <Select.Option value="RUB">RUB</Select.Option>
            <Select.Option value="USD">USD</Select.Option>
            <Select.Option value="EUR">EUR</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="type">
          <Select
            placeholder="Тип"
            style={{ width: 150 }}
            onChange={(v) => { if (v !== '__custom__') setCustomType(''); }}
            allowClear
          >
            {TOURNAMENT_TYPES.map((t) => (
              <Select.Option key={t} value={t}>{t}</Select.Option>
            ))}
            <Select.Option value="__custom__">✏️ Свой тип...</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} icon={<PlusOutlined />}>
            {editingId ? 'Сохранить' : 'Добавить'}
          </Button>
        </Form.Item>
        {editingId && (
          <Form.Item>
            <Button onClick={() => { setEditingId(null); form.resetFields(); setCustomType(''); }}>Отмена</Button>
          </Form.Item>
        )}
      </Form>
      {form.getFieldValue('type') === '__custom__' && (
        <div style={{ marginBottom: 16, padding: '0 8px' }}>
          <Input
            placeholder="Введите свой тип турнира"
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            style={{ maxWidth: 300 }}
          />
        </div>
      )}
      <List
        dataSource={tournaments}
        renderItem={(t) => (
          <List.Item
            actions={[
              <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => handleEdit(t)} />,
              <Popconfirm key="del" title="Удалить турнир?" onConfirm={() => handleDelete(t.id)}>
                <Button type="link" danger icon={<DeleteOutlined />} />
              </Popconfirm>,
            ]}
          >
            <Space>
              <strong>{t.name}</strong>
              <span>{t.roomName}</span>
              <span>Buy-in: {t.buyIn} {t.currency}</span>
              {t.type && <span style={{ color: '#d4a843' }}>{t.type}</span>}
            </Space>
          </List.Item>
        )}
      />
    </Modal>
  );
}
