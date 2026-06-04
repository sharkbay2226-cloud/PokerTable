import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Select, DatePicker, Button, Card, Space, Typography, Switch } from 'antd';
import dayjs from 'dayjs';
import { getAllTournaments, getAllRooms, addSession } from '../db/db';
import type { Tournament, Room, Backer } from '../types';
import { convertToRub, formatRub } from '../utils/currency';
import { useAppStore } from '../store/appStore';

const { Text } = Typography;

interface Props {
  onSuccess?: () => void;
}

export default function SessionForm({ onSuccess }: Props) {
  const { t } = useTranslation();
  const { settings } = useAppStore();
  const backers = settings.backers || [];
  const [form] = Form.useForm();
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(undefined);
  const [selectedTour, setSelectedTour] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(false);
  const [backing, setBacking] = useState(true);
  const [selectedBackerId, setSelectedBackerId] = useState<string>(backers[0]?.id || '');
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);

  useEffect(() => {
    Promise.all([getAllTournaments(), getAllRooms()]).then(([t, r]) => {
      setAllTournaments(t);
      setRooms(r);
    });
  }, []);

  const filteredTournaments = useMemo(() => {
    let list = allTournaments;
    if (selectedRoomId) {
      list = list.filter((t) => t.roomId === selectedRoomId);
    }
    if (selectedColor) {
      list = list.filter((t) => t.color === selectedColor);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [allTournaments, selectedRoomId, selectedColor]);

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms]);

  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    form.setFieldValue('tournamentId', undefined);
    setSelectedTour(null);
    setSelectedColor(undefined);
  };

  const handleTournamentChange = (tournamentId: string) => {
    const tour = allTournaments.find((t) => t.id === tournamentId) ?? null;
    setSelectedTour(tour);
  };

  const handleSubmit = async (values: { tournamentId: string; date: dayjs.Dayjs }) => {
    setLoading(true);
    try {
      const storedId = localStorage.getItem('poker-diary-current-session-id');
      await addSession({
        tournamentId: values.tournamentId,
        date: values.date.format('YYYY-MM-DD'),
        inPrize: false,
        backing,
        backerId: backing ? selectedBackerId : undefined,
        place: 0,
        prize: 0,
        prizeCurrency: selectedTour?.currency || 'USD',
        bountySum: 0,
        bountyCurrency: selectedTour?.currency || 'USD',
        sessionId: storedId ? Number(storedId) : undefined,
        createdAt: new Date().toISOString(),
      });
      form.resetFields();
      setSelectedRoomId(undefined);
      setSelectedTour(null);
      setBacking(false);
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedRoomId(undefined);
    setSelectedTour(null);
    setBacking(false);
    setSelectedBackerId(backers[0]?.id || '');
    onSuccess?.();
  };

  const buyIn = selectedTour ? selectedTour.buyIn : 0;
  const profitUsd = -buyIn;
  const buyInRub = selectedTour ? convertToRub(selectedTour.buyIn, selectedTour.currency) : 0;
  const profitRub = -buyInRub;

  return (
    <Card
      title={<span style={{ color: '#3b82f6' }}>{t('sessionForm.title')}</span>}
      extra={<Button type="text" onClick={handleCancel} danger>{t('sessionForm.cancel')}</Button>}
      style={{ marginBottom: 24 }}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="date" label={t('sessionForm.fields.date')} initialValue={dayjs()} rules={[{ required: true, message: t('sessionForm.fields.dateRequired') }]}>
          <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
        </Form.Item>

        <Form.Item name="roomId" label={t('sessionForm.fields.room')} rules={[{ required: true, message: t('sessionForm.fields.roomRequired') }]}>
          <Select
            placeholder={t('sessionForm.fields.roomPlaceholder')}
            onChange={handleRoomChange}
            showSearch
            optionFilterProp="label"
          >
            {sortedRooms.map((r) => (
              <Select.Option key={r.id} value={r.id} label={r.name}>{r.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="tournamentId" label={t('sessionForm.fields.tournament')} rules={[{ required: true, message: t('sessionForm.fields.tournamentRequired') }]}>
          <Select
            placeholder={selectedRoomId ? t('sessionForm.fields.tournamentPlaceholder') : t('sessionForm.fields.tournamentWait')}
            onChange={handleTournamentChange}
            showSearch
            optionFilterProp="label"
            disabled={!selectedRoomId}
            notFoundContent={selectedRoomId ? <Text type="secondary">{t('sessionForm.fields.tournamentNone')}</Text> : null}
          >
            {filteredTournaments.map((t) => (
              <Select.Option key={t.id} value={t.id} label={`${t.name} (${t.buyIn} ${t.currency})`}>
                <Space>
                  {t.color && <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, display: 'inline-block' }} />}
                  <strong>{t.name}</strong>
                  {t.type && <span style={{ fontSize: 11, color: '#d4a843' }}>{t.type}</span>}
                  <Text type="secondary">Buy-in: {t.buyIn} {t.currency}</Text>
                </Space>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {selectedTour && (
          <Card size="small" style={{ marginBottom: 12, background: '#0f172a' }}>
            <Space direction="vertical" size={2}>
              <Text>{t('sessionForm.info.room')} <strong>{rooms.find((r) => r.id === selectedTour.roomId)?.name}</strong></Text>
              <Text>{t('sessionForm.info.tournament')} <strong>{selectedTour.name}</strong></Text>
              {selectedTour.type && <Text>Тип: <strong style={{ color: '#d4a843' }}>{selectedTour.type}</strong></Text>}
              <Text>{t('sessionForm.info.buyIn')} <strong style={{ color: '#ff4d4f' }}>{selectedTour.buyIn} {selectedTour.currency}</strong></Text>
              <Text>{t('sessionForm.info.buyInRub')} <strong style={{ color: '#ff4d4f' }}>{formatRub(buyInRub)}</strong></Text>
            </Space>
          </Card>
        )}

        <Space size={16} wrap>
          <Form.Item label={t('sessionForm.backing.label')} style={{ marginBottom: 0 }}>
            <Switch checkedChildren={t('sessionForm.backing.yes')} unCheckedChildren={t('sessionForm.backing.no')} checked={backing} onChange={(v) => { setBacking(v); if (v && !selectedBackerId) setSelectedBackerId(backers[0]?.id || ''); }} />
          </Form.Item>
          <Form.Item label={t('sessionForm.colorFilter')} style={{ marginBottom: 0 }}>
            <Select
              allowClear
              placeholder={t('sessionForm.colorFilterPlaceholder')}
              style={{ width: 140 }}
              value={selectedColor}
              onChange={(v) => { setSelectedColor(v); form.setFieldValue('tournamentId', undefined); setSelectedTour(null); }}
            >
              <Select.Option value="#ef4444">
                <Space size={4}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />Hard</Space>
              </Select.Option>
              <Select.Option value="#eab308">
                <Space size={4}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#eab308', display: 'inline-block' }} />Medium</Space>
              </Select.Option>
              <Select.Option value="#22c55e">
                <Space size={4}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />High</Space>
              </Select.Option>
              <Select.Option value="#3b82f6">
                <Space size={4}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />Top</Space>
              </Select.Option>
            </Select>
          </Form.Item>
        </Space>

        {backing && backers.length > 1 && (
          <Form.Item label={t('sessionForm.backing.backerSelect')}>
            <Select value={selectedBackerId} onChange={setSelectedBackerId} style={{ width: '100%' }}>
              {backers.map((b) => (
                <Select.Option key={b.id} value={b.id}>{b.name} ({b.percent}%)</Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {backing && backers.length === 1 && (
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            {t('sessionForm.info.backer')} {backers[0].name} ({backers[0].percent}%)
          </Text>
        )}

        {selectedTour && (
          <Card size="small" style={{ marginTop: 12, background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
            <Text strong style={{ fontSize: 16, color: profitRub >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' }}>
              {t('sessionForm.info.total')} ${profitUsd.toFixed(2)} | {profitRub >= 0 ? '+' : ''}{formatRub(profitRub)}
            </Text>
          </Card>
        )}

        <Form.Item style={{ marginTop: 16 }}>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              {t('sessionForm.save')}
            </Button>
            <Button onClick={handleCancel} size="large">{t('sessionForm.cancel')}</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
