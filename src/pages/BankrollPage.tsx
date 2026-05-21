import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Statistic, Table, Modal, Input, InputNumber, Button, Space, Typography, Tag, Empty, Popconfirm, message, Tooltip, Select } from 'antd';
import { PlusOutlined, MinusOutlined, WalletOutlined, DeleteOutlined, TrophyOutlined, DollarOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAllRooms, getAllSessions, getAllTournaments, getAllBankrollEntries, addBankrollEntry, deleteBankrollEntry } from '../db/db';
import type { Room, BankrollEntry, Currency } from '../types';
import { convertToRub, convertToUsd, formatRub, formatUsd, formatEur } from '../utils/currency';
import { useAppStore } from '../store/appStore';

const { Title, Text } = Typography;

export default function BankrollPage() {
  const { t } = useTranslation();
  const { settings, setSettings } = useAppStore();
  const [usdRate, setUsdRate] = useState(settings.usdToRub);
  const [eurRate, setEurRate] = useState(settings.eurToRub);
  const [editingRateField, setEditingRateField] = useState<'usd' | 'eur' | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [entries, setEntries] = useState<BankrollEntry[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRoomId, setModalRoomId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'add' | 'subtract'>('add');
  const [amount, setAmount] = useState(0);
  const [modalCurrency, setModalCurrency] = useState<Currency>('USD');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [roomFilter, setRoomFilter] = useState<string[]>([]);

  const load = async () => {
    const [r, s, t, e] = await Promise.all([getAllRooms(), getAllSessions(), getAllTournaments(), getAllBankrollEntries()]);
    setRooms(r);
    setSessions(s);
    setTournaments(t);
    setEntries(e);
  };

  useEffect(() => { load(); }, []);

  const saveRate = (field: 'usd' | 'eur', val: number) => {
    if (val <= 0) return;
    if (field === 'usd') {
      setUsdRate(val);
      setSettings({ usdToRub: val });
    } else {
      setEurRate(val);
      setSettings({ eurToRub: val });
    }
    setEditingRateField(null);
  };

  const fetchRates = async () => {
    setLoadingRate(true);
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await res.json();
      if (data.rates?.RUB && data.rates?.EUR) {
        const usdRub = data.rates.RUB;
        const eurRub = usdRub / data.rates.EUR;
        setUsdRate(usdRub);
        setEurRate(eurRub);
        setSettings({ usdToRub: usdRub, eurToRub: eurRub });
        message.success(t('bankroll.rates.updated', { usd: usdRub.toFixed(2), eur: eurRub.toFixed(2) }));
      } else {
        message.error(t('bankroll.rates.fetchFailed'));
      }
    } catch {
      message.error(t('bankroll.rates.requestError'));
    } finally {
      setLoadingRate(false);
    }
  };

  const tourMap = useMemo(() => new Map(tournaments.map((t) => [t.id, t])), [tournaments]);

  const defaultRoomCurrency = useMemo(() => {
    const map: Record<string, Currency> = {};
    for (const r of rooms) {
      const currs = tournaments.filter((t) => t.roomId === r.id).map((t) => t.currency);
      const counts: Record<string, number> = {};
      for (const c of currs) { counts[c] = (counts[c] || 0) + 1; }
      const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      map[r.id] = (best?.[0] as Currency) || 'USD';
    }
    return map;
  }, [rooms, tournaments]);

  const getRoomCurrency = (roomId: string): Currency =>
    settings.roomDisplayCurrency?.[roomId] || defaultRoomCurrency[roomId] || 'USD';

  // Per‑room stats
  const roomStats = useMemo(() => {
    const { usdToRub, eurToRub } = settings;
    const filtered = roomFilter.length > 0 ? rooms.filter((r) => roomFilter.includes(r.id)) : rooms;
    return filtered.map((room) => {
      const roomSessions = sessions.filter((s) => {
        const tour = tourMap.get(s.tournamentId);
        return tour?.roomId === room.id;
      });
      const tournamentsPlayed = roomSessions.length;
      const profitUsd = roomSessions.reduce((sum: number, s: any) => {
        const tour = tourMap.get(s.tournamentId);
        const buyIn = tour ? convertToUsd(tour.buyIn, tour.currency) : 0;
        const prize = s.inPrize ? convertToUsd(s.prize, s.prizeCurrency) : 0;
        const bounty = s.inPrize ? convertToUsd(s.bountySum, s.bountyCurrency) : 0;
        return sum + prize + bounty - buyIn;
      }, 0);

      const roomEntries = entries.filter((e) => e.roomId === room.id);
      const manualBalance = roomEntries
        .filter((e) => !e.comment?.startsWith(t('bankroll.stats.backerPaid')))
        .reduce((sum, e) => sum + e.amount, 0);
      const totalBalance = profitUsd + manualBalance;

      const profitRub = profitUsd * usdToRub;
      const profitEur = profitUsd * usdToRub / eurToRub;
      const balanceRub = totalBalance * usdToRub;
      const balanceEur = totalBalance * usdToRub / eurToRub;

      return {
        ...room,
        tournamentsPlayed,
        profitUsd, profitRub, profitEur,
        manualBalance,
        totalBalance, balanceRub, balanceEur,
        entries: roomEntries.sort((a, b) => b.createdAt - a.createdAt),
      };
    });
  }, [rooms, sessions, tourMap, entries, settings, roomFilter]);

  const totalProfitUsd = useMemo(() => roomStats.reduce((s, r) => s + r.profitUsd, 0), [roomStats]);
  const totalProfitRub = useMemo(() => roomStats.reduce((s, r) => s + r.profitRub, 0), [roomStats]);
  const totalProfitEur = useMemo(() => roomStats.reduce((s, r) => s + r.profitEur, 0), [roomStats]);
  const totalManual = useMemo(() => roomStats.reduce((s, r) => s + r.manualBalance, 0), [roomStats]);
  const totalBalance = useMemo(() => roomStats.reduce((s, r) => s + r.totalBalance, 0), [roomStats]);
  const totalBalanceRub = useMemo(() => roomStats.reduce((s, r) => s + r.balanceRub, 0), [roomStats]);
  const totalBalanceEur = useMemo(() => roomStats.reduce((s, r) => s + r.balanceEur, 0), [roomStats]);

  const openModal = (roomId: string, type: 'add' | 'subtract') => {
    setModalRoomId(roomId);
    setModalType(type);
    setAmount(0);
    setModalCurrency('USD');
    setComment('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!modalRoomId || amount <= 0) return;
    setSaving(true);
    try {
      const usdAmount = modalCurrency === 'USD' ? amount
        : modalCurrency === 'EUR' ? amount * (settings.usdToRub / settings.eurToRub)
        : amount / settings.usdToRub;
      await addBankrollEntry({
        roomId: modalRoomId,
        amount: modalType === 'add' ? usdAmount : -usdAmount,
        currency: modalCurrency,
        comment,
        date: dayjs().format('YYYY-MM-DD'),
      });
      setModalOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>{t('bankroll.page.title')}</Title>

      {/* Курсы валют */}
      <Card size="small" style={{ marginBottom: 16, background: '#1e293b', border: '1px solid #334155' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space size={24}>
              <span>
                <Text type="secondary">{t('bankroll.rates.usdLabel')}</Text>
                {editingRateField === 'usd' ? (
                  <InputNumber
                    size="small" value={usdRate} min={1}
                    onChange={(v) => setUsdRate(v ?? 90)}
                    onBlur={() => saveRate('usd', usdRate)}
                    onPressEnter={() => saveRate('usd', usdRate)}
                    autoFocus style={{ width: 100 }}
                  />
                ) : (
                  <Text strong style={{ fontSize: 16, color: '#3b82f6', cursor: 'pointer' }}
                    onClick={() => setEditingRateField('usd')}
                  >{usdRate.toFixed(2)} ₽</Text>
                )}
              </span>
              <span>
                <Text type="secondary">{t('bankroll.rates.eurLabel')}</Text>
                {editingRateField === 'eur' ? (
                  <InputNumber
                    size="small" value={eurRate} min={1}
                    onChange={(v) => setEurRate(v ?? 100)}
                    onBlur={() => saveRate('eur', eurRate)}
                    onPressEnter={() => saveRate('eur', eurRate)}
                    autoFocus style={{ width: 100 }}
                  />
                ) : (
                  <Text strong style={{ fontSize: 16, color: '#3b82f6', cursor: 'pointer' }}
                    onClick={() => setEditingRateField('eur')}
                  >{eurRate.toFixed(2)} ₽</Text>
                )}
              </span>
            </Space>
          </Col>
          <Col>
            <Tooltip title={t('bankroll.rates.refresh')}>
              <Button size="small" icon={<ReloadOutlined />} loading={loadingRate} onClick={fetchRates} />
            </Tooltip>
          </Col>
        </Row>
      </Card>

      {/* Фильтр по румам */}
      <div style={{ marginBottom: 16 }}>
        <Select
          mode="multiple"
          value={roomFilter}
          onChange={setRoomFilter}
          placeholder={t('bankroll.page.allRooms')}
          style={{ width: '100%', maxWidth: 400 }}
          allowClear
          options={rooms.map((r) => ({ value: r.id, label: r.name }))}
        />
      </div>

      {/* Summary cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card hoverable style={{ background: 'linear-gradient(135deg, #3b82f620, #3b82f608)', border: '1px solid #3b82f640', height: '100%' }}>
            <Statistic title={t('bankroll.stats.total')} value={totalBalance} precision={2} valueStyle={{ color: totalBalance >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 22 }} suffix="$" prefix={<WalletOutlined />} />
            <div style={{ marginTop: 4, fontSize: 13, opacity: 0.7 }}>
              <span style={{ color: totalBalanceRub >= 0 ? '#52c41a' : '#ff4d4f' }}>{totalBalanceRub.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽</span>
              &nbsp;·&nbsp;
              <span style={{ color: totalBalanceEur >= 0 ? '#52c41a' : '#ff4d4f' }}>{totalBalanceEur.toFixed(2)} €</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable style={{ background: 'linear-gradient(135deg, #3b82f620, #3b82f608)', border: '1px solid #3b82f640', height: '100%' }}>
            <Statistic title={t('bankroll.stats.profit')} value={totalProfitUsd} precision={2} valueStyle={{ color: totalProfitUsd >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 22 }} suffix="$" prefix={<TrophyOutlined />} />
            <div style={{ marginTop: 4, fontSize: 13, opacity: 0.7 }}>
              <span style={{ color: totalProfitRub >= 0 ? '#52c41a' : '#ff4d4f' }}>{totalProfitRub.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽</span>
              &nbsp;·&nbsp;
              <span style={{ color: totalProfitEur >= 0 ? '#52c41a' : '#ff4d4f' }}>{totalProfitEur.toFixed(2)} €</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable style={{ background: 'linear-gradient(135deg, #3b82f620, #3b82f608)', border: '1px solid #3b82f640', height: '100%' }}>
            <Statistic title={t('bankroll.stats.manual')} value={totalManual} precision={2} valueStyle={{ color: totalManual >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 22 }} suffix="$" prefix={<DollarOutlined />} />
            <div style={{ marginTop: 4, fontSize: 13, opacity: 0.7 }}>
              <span style={{ color: totalManual >= 0 ? '#52c41a' : '#ff4d4f' }}>{(totalManual * settings.usdToRub).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽</span>
              &nbsp;·&nbsp;
              <span style={{ color: totalManual >= 0 ? '#52c41a' : '#ff4d4f' }}>{(totalManual * settings.usdToRub / settings.eurToRub).toFixed(2)} €</span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Room cards */}
      <Row gutter={[16, 16]}>
        {roomStats.map((room) => (
          <Col key={room.id} xs={24} sm={12} lg={8} xl={6}>
            <Card
              style={{ background: '#1e293b', border: '1px solid #3b82f620', borderRadius: 8, height: '100%' }}
              title={
                <Space>
                  <WalletOutlined style={{ color: '#3b82f6' }} />
                  <Text strong style={{ fontSize: 16 }}>{room.name}</Text>
                  <TrophyOutlined style={{ color: '#3b82f6', fontSize: 16, marginLeft: 12 }} />
                  <Text style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{room.tournamentsPlayed}</Text>
                </Space>
              }
              extra={
                <Space>
                  <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openModal(room.id, 'add')} />
                  <Button size="small" danger icon={<MinusOutlined />} onClick={() => openModal(room.id, 'subtract')} />
                </Space>
              }
            >
              <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginBottom: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>{t('bankroll.stats.profitLabel')}</Text>
                  {(['USD', 'EUR', 'RUB'] as Currency[]).map((cur) => {
                    const active = getRoomCurrency(room.id) === cur;
                    const val = cur === 'USD' ? room.profitUsd : cur === 'EUR' ? room.profitEur : room.profitRub;
                    const sign = val >= 0 ? '+' : '';
                    const color = val >= 0 ? '#52c41a' : '#ff4d4f';
                    const formatted = cur === 'RUB'
                      ? `${sign}${Math.abs(val).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`
                      : `${sign}${Math.abs(val).toFixed(2)} ${cur === 'EUR' ? '€' : '$'}`;
                    return active ? (
                      <div key={cur} style={{ fontSize: 16, fontWeight: 700, color }}>{formatted}</div>
                    ) : (
                      <div key={cur} style={{ fontSize: 11, opacity: 0.35, color }}>{formatted}</div>
                    );
                  })}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>{t('bankroll.stats.balance')}</Text>
                  {(['USD', 'EUR', 'RUB'] as Currency[]).map((cur) => {
                    const active = getRoomCurrency(room.id) === cur;
                    const val = cur === 'USD' ? room.totalBalance : cur === 'EUR' ? room.balanceEur : room.balanceRub;
                    const sign = val >= 0 ? '+' : '';
                    const color = val >= 0 ? '#52c41a' : '#ff4d4f';
                    const formatted = cur === 'RUB'
                      ? `${sign}${Math.abs(val).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`
                      : `${sign}${Math.abs(val).toFixed(2)} ${cur === 'EUR' ? '€' : '$'}`;
                    return active ? (
                      <div key={cur} style={{ fontSize: 16, fontWeight: 700, color }}>{formatted}</div>
                    ) : (
                      <div key={cur} style={{ fontSize: 11, opacity: 0.35, color }}>{formatted}</div>
                    );
                  })}
                </div>
              </div>

              {room.entries.length === 0 && room.tournamentsPlayed === 0 && (
                <Empty description={t('bankroll.page.noData')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 12 }}>
                {(['USD', 'EUR', 'RUB'] as Currency[]).map((cur) => {
                    const active = getRoomCurrency(room.id) === cur;
                  return (
                    <Button
                      key={cur}
                      size="small"
                      type={active ? 'primary' : 'text'}
                      style={active ? { fontWeight: 700, fontSize: 14, background: '#3b82f6', borderColor: '#3b82f6', color: '#e2e8f0' } : { fontSize: 11, opacity: 0.5 }}
                      onClick={() => setSettings({ roomDisplayCurrency: { ...settings.roomDisplayCurrency, [room.id]: cur } })}
                    >
                      {cur}
                    </Button>
                  );
                })}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Add/Subtract modal */}
      <Modal
        title={modalType === 'add' ? t('bankroll.card.deposit') : t('bankroll.card.withdraw')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText={modalType === 'add' ? t('bankroll.card.depositOk') : t('bankroll.card.withdrawOk')}
        cancelText={t('bankroll.card.cancel')}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <div>
            <Text type="secondary">{t('bankroll.card.room')}: <strong>{rooms.find((r) => r.id === modalRoomId)?.name}</strong></Text>
          </div>
          <div>
            <Text type="secondary">{t('bankroll.card.currency')}</Text>
              <Select
                value={modalCurrency}
                onChange={(v: Currency) => setModalCurrency(v)}
                style={{ width: '100%' }}
                options={[
                  { value: 'USD', label: t('bankroll.card.usd') },
                  { value: 'EUR', label: t('bankroll.card.eur') },
                  { value: 'RUB', label: t('bankroll.card.rub') },
                ]}
              />
          </div>
          <div>
            <Text type="secondary">{t('bankroll.card.amount')} ({modalCurrency})</Text>
            <InputNumber min={0} value={amount} onChange={(v) => setAmount(v ?? 0)} style={{ width: '100%' }} placeholder="0.00" />
          </div>
          <div>
            <Text type="secondary">{t('bankroll.card.comment')}</Text>
            <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('bankroll.card.commentPlaceholder')} />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
