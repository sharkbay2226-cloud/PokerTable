import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Input, InputNumber, Table, Statistic, Space, Typography, Button, Modal, message, Collapse, Popconfirm, Select, DatePicker } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, TeamOutlined, PercentageOutlined, DollarOutlined, WalletOutlined, ArrowDownOutlined, ArrowUpOutlined, HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAllRooms, getAllSessions, getAllTournaments, getAllBankrollEntries, addBankrollEntry, deleteBankrollEntry, updateBankrollEntry } from '../db/db';
import type { Room, Tournament, Session, Currency, BankrollEntry, Backer } from '../types';
import { convertToUsd, formatUsd, formatAmount } from '../utils/currency';
import { useAppStore } from '../store/appStore';

const { Title, Text } = Typography;

export default function BackingPage() {
  const { t } = useTranslation();
  const { settings, setSettings } = useAppStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [entries, setEntries] = useState<BankrollEntry[]>([]);
  const [payModal, setPayModal] = useState<{ roomId: string; roomName: string } | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payBackerId, setPayBackerId] = useState('');
  const [payDate, setPayDate] = useState<dayjs.Dayjs>(dayjs());
  const [paySaving, setPaySaving] = useState(false);
  const [recvModal, setRecvModal] = useState<{ roomId: string; roomName: string } | null>(null);
  const [recvAmount, setRecvAmount] = useState(0);
  const [recvBackerId, setRecvBackerId] = useState('');
  const [recvDate, setRecvDate] = useState<dayjs.Dayjs>(dayjs());
  const [recvSaving, setRecvSaving] = useState(false);
  const [payoutModal, setPayoutModal] = useState(false);
  const [payoutRoomId, setPayoutRoomId] = useState<string>('');
  const [payoutAmount, setPayoutAmount] = useState(0);
  const [payoutCurrency, setPayoutCurrency] = useState<Currency>('USD');
  const [payoutDate, setPayoutDate] = useState<dayjs.Dayjs>(dayjs());
  const [payoutBackerId, setPayoutBackerId] = useState('');
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [editEntry, setEditEntry] = useState<BankrollEntry | null>(null);
  const [editAmount, setEditAmount] = useState(0);
  const [editSaving, setEditSaving] = useState(false);
  const [historyRoomFilter, setHistoryRoomFilter] = useState<string | undefined>(undefined);
  const [historyDateRange, setHistoryDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const backers = settings.backers || [];
  const defaultBackerName = backers[0]?.name || t('backing.page.title');
  const getBacker = (backerId?: string): Backer | undefined => {
    if (!backerId) return backers[0];
    return backers.find((b) => b.id === backerId);
  };
  const [backerModal, setBackerModal] = useState(false);
  const [editingBacker, setEditingBacker] = useState<Backer | null>(null);
  const [backerFormName, setBackerFormName] = useState('');
  const [backerFormPercent, setBackerFormPercent] = useState(50);

  const getRoomCurrency = (roomId: string): Currency => settings.roomDisplayCurrency?.[roomId] || 'USD';

  const load = async () => {
    const [r, s, t, e] = await Promise.all([getAllRooms(), getAllSessions(), getAllTournaments(), getAllBankrollEntries()]);
    setRooms(r);
    setSessions(s);
    setTournaments(t);
    setEntries(e);
  };

  useEffect(() => { load(); }, []);

  const tourMap = useMemo(() => new Map(tournaments.map((t) => [t.id, t])), [tournaments]);

  const backingRoomIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of entries) {
      if (e.comment?.startsWith('Выплата бэкеру') || e.comment?.startsWith('Получение от бэкера') || e.comment?.startsWith('Оплата бэкером')) {
        ids.add(e.roomId);
      }
    }
    return ids;
  }, [entries]);

  const roomStats = useMemo(() => {
    const roomMap = new Map(rooms.map((r) => [r.id, r]));
    const bkrs = settings.backers || [];

    // collect all room ids with either sessions or backing entries
    const activeRoomIds = new Set<string>();
    for (const s of sessions) {
      const tour = tourMap.get(s.tournamentId);
      if (tour) activeRoomIds.add(tour.roomId);
    }
    for (const rid of backingRoomIds) activeRoomIds.add(rid);

    return Array.from(activeRoomIds).map((roomId) => {
      const room = roomMap.get(roomId) || { id: roomId, name: roomId, currency: 'USD' } as Room;

      const roomSessions = sessions.filter((s) => {
        const tour = tourMap.get(s.tournamentId);
        return tour?.roomId === roomId && s.backing;
      });

      let buyInUsd = 0;
      let prizeUsd = 0;
      let bountyUsd = 0;
      const backerShares: Record<string, number> = {};

      for (const s of roomSessions) {
        const tour = tourMap.get(s.tournamentId);
        if (!tour) continue;
        buyInUsd += convertToUsd(tour.buyIn, tour.currency);
        if (s.inPrize) {
          prizeUsd += convertToUsd(s.prize, s.prizeCurrency);
          bountyUsd += convertToUsd(s.bountySum, s.bountyCurrency);
        }
        const sessionProfit = (s.inPrize ? convertToUsd(s.prize, s.prizeCurrency) + convertToUsd(s.bountySum, s.bountyCurrency) : 0) - convertToUsd(tour.buyIn, tour.currency);
        const backer = s.backerId ? bkrs.find((b) => b.id === s.backerId) : bkrs[0];
        if (backer) {
          backerShares[backer.id] = (backerShares[backer.id] || 0) + sessionProfit * backer.percent / 100;
        }
      }

      const profitUsd = prizeUsd + bountyUsd - buyInUsd;
      const totalBackerShareUsd = Object.values(backerShares).reduce((s, v) => s + v, 0);
      const paidUsd = entries
        .filter((e) => e.roomId === roomId && e.comment?.startsWith('Выплата бэкеру'))
        .reduce((s, e) => s + Math.abs(e.amount), 0);
      const receivedUsd = entries
        .filter((e) => e.roomId === roomId && e.comment?.startsWith('Получение от бэкера'))
        .reduce((s, e) => s + Math.abs(e.amount), 0);
      const backerPaidUsd = entries
        .filter((e) => e.roomId === roomId && e.comment?.startsWith('Оплата бэкером'))
        .reduce((s, e) => s + Math.abs(e.amount), 0);
      const debtUsd = totalBackerShareUsd + receivedUsd;
      const remainingUsd = debtUsd > 0 ? Math.max(0, debtUsd - paidUsd - backerPaidUsd) : 0;

      return { room, buyInUsd, prizeUsd, bountyUsd, profitUsd, backerShareUsd: totalBackerShareUsd, backerShares, receivedUsd, paidUsd, backerPaidUsd, debtUsd, remainingUsd };
    });
  }, [rooms, sessions, tourMap, entries, settings.backers, backingRoomIds]);

  const stats = useMemo(() => {
    const bkrs = settings.backers || [];
    const totalBuyInUsd = roomStats.reduce((s, r) => s + r.buyInUsd, 0);
    const totalPrizeUsd = roomStats.reduce((s, r) => s + r.prizeUsd, 0);
    const totalBountyUsd = roomStats.reduce((s, r) => s + r.bountyUsd, 0);
    const totalProfitUsd = roomStats.reduce((s, r) => s + r.profitUsd, 0);

    // aggregate backer shares across all rooms
    const aggregatedBackerShares: Record<string, number> = {};
    for (const r of roomStats) {
      for (const [bid, val] of Object.entries(r.backerShares)) {
        aggregatedBackerShares[bid] = (aggregatedBackerShares[bid] || 0) + val;
      }
    }
    const totalBackerShareUsd = Object.values(aggregatedBackerShares).reduce((s, v) => s + v, 0);

    const totalProfitOverall = totalPrizeUsd + totalBountyUsd - totalBuyInUsd;
    const playerShareUsd = totalProfitOverall - totalBackerShareUsd;

    const totalPaidUsd = entries
      .filter((e) => e.comment?.startsWith('Выплата бэкеру'))
      .reduce((s, e) => s + Math.abs(e.amount), 0);
    const totalReceivedUsd = entries
      .filter((e) => e.comment?.startsWith('Получение от бэкера'))
      .reduce((s, e) => s + Math.abs(e.amount), 0);
    const totalBackerPaidUsd = entries
      .filter((e) => e.comment?.startsWith('Оплата бэкером'))
      .reduce((s, e) => s + Math.abs(e.amount), 0);
    const totalDebtUsd = totalBackerShareUsd + totalReceivedUsd;
    const totalRemainingUsd = totalDebtUsd > 0 ? Math.max(0, totalDebtUsd - totalPaidUsd - totalBackerPaidUsd) : 0;

    return { totalBuyInUsd, totalPrizeUsd, totalBountyUsd, totalProfitUsd, backerShareUsd: totalBackerShareUsd, aggregatedBackerShares, playerShareUsd, totalPaidUsd, totalReceivedUsd, totalBackerPaidUsd, totalDebtUsd, totalRemainingUsd };
  }, [roomStats, settings.backers, entries]);

  const handleReceive = async () => {
    if (!recvModal || recvAmount <= 0) return;
    setRecvSaving(true);
    try {
      const backer = backers.find((b) => b.id === recvBackerId) || backers[0];
      const currency = getRoomCurrency(recvModal.roomId);
      await addBankrollEntry({
        roomId: recvModal.roomId,
        amount: recvAmount,
        currency,
        comment: `Получение от бэкера: ${backer?.name || defaultBackerName}`,
        date: recvDate.format('YYYY-MM-DD'),
      });
      message.success(t('backing.messages.received', { amount: formatAmount(recvAmount, currency), room: recvModal.roomName }));
      setRecvModal(null);
      setRecvAmount(0);
      await load();
    } catch {
      message.error(t('backing.messages.receiveError'));
    } finally {
      setRecvSaving(false);
    }
  };

  const handlePayout = async () => {
    if (payoutAmount <= 0) return;
    setPayoutSaving(true);
    try {
      const backer = backers.find((b) => b.id === payoutBackerId) || backers[0];
      const firstRoom = rooms[0];
      if (!firstRoom) { message.warning(t('backing.messages.noRooms')); return; }
      await addBankrollEntry({
        roomId: firstRoom.id,
        amount: payoutAmount,
        currency: payoutCurrency,
        comment: `Оплата бэкером: ${backer?.name || defaultBackerName}`,
        date: payoutDate.format('YYYY-MM-DD'),
      });
      message.success(t('backing.messages.payoutSuccess', { amount: formatAmount(payoutAmount, payoutCurrency) }));
      setPayoutModal(false);
      setPayoutAmount(0);
      await load();
    } catch {
      message.error(t('backing.messages.payoutError'));
    } finally {
      setPayoutSaving(false);
    }
  };

  const handlePay = async () => {
    if (!payModal || payAmount <= 0) return;
    setPaySaving(true);
    try {
      const backer = backers.find((b) => b.id === payBackerId) || backers[0];
      const currency = getRoomCurrency(payModal.roomId);
      await addBankrollEntry({
        roomId: payModal.roomId,
        amount: -payAmount,
        currency,
        comment: `Выплата бэкеру: ${backer?.name || defaultBackerName}`,
        date: payDate.format('YYYY-MM-DD'),
      });
      message.success(t('backing.messages.paid', { amount: formatAmount(payAmount, currency), room: payModal.roomName }));
      setPayModal(null);
      setPayAmount(0);
      await load();
    } catch {
      message.error(t('backing.messages.payError'));
    } finally {
      setPaySaving(false);
    }
  };

  const backingEntries = useMemo(() => {
    let list = entries.filter((e) => e.comment?.startsWith('Выплата бэкеру') || e.comment?.startsWith('Получение от бэкера') || e.comment?.startsWith('Оплата бэкером'));
    if (historyRoomFilter) list = list.filter((e) => e.roomId === historyRoomFilter);
    if (historyDateRange?.[0] && historyDateRange?.[1]) {
      const start = historyDateRange[0].startOf('day').valueOf();
      const end = historyDateRange[1].endOf('day').valueOf();
      list = list.filter((e) => {
        const d = dayjs(e.date).valueOf();
        return d >= start && d <= end;
      });
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, historyRoomFilter, historyDateRange]);

  const handleDeleteEntry = async (id: number) => {
    try {
      await deleteBankrollEntry(id);
      message.success(t('backing.messages.entryDeleted'));
      await load();
    } catch {
      message.error(t('backing.messages.deleteError'));
    }
  };

  const handleEditEntry = async () => {
    if (!editEntry || editAmount <= 0) return;
    setEditSaving(true);
    try {
      const isPay = editEntry.comment?.startsWith('Выплата');
      const isBackerPay = editEntry.comment?.startsWith('Оплата');
      await updateBankrollEntry(editEntry.id, {
        amount: isPay ? -editAmount : editAmount,
        comment: isPay
          ? `Выплата бэкеру: ${defaultBackerName}`
          : isBackerPay
            ? `Оплата бэкером: ${defaultBackerName}`
            : `Получение от бэкера: ${defaultBackerName}`,
      });
      message.success(t('backing.messages.entryUpdated'));
      setEditEntry(null);
      await load();
    } catch {
      message.error(t('backing.messages.updateError'));
    } finally {
      setEditSaving(false);
    }
  };

  const roomColumns = [
    { title: t('backing.columns.room'), dataIndex: ['room', 'name'], key: 'room', width: 100 },
    { title: t('backing.columns.buyIns'), key: 'buyIn', width: 80, render: (_: unknown, r: typeof roomStats[0]) => formatUsd(r.buyInUsd) },
    { title: t('backing.columns.profit'), key: 'profit', width: 80, render: (_: unknown, r: typeof roomStats[0]) => (
      <span style={{ color: r.profitUsd >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>
        {formatUsd(r.profitUsd)}
      </span>
    )},
    {
      title: t('backing.columns.backerShare'), key: 'backerShare', width: 90,
      render: (_: unknown, r: typeof roomStats[0]) => (
        <span style={{ color: '#f59e0b', fontWeight: 600 }}>{formatUsd(r.backerShareUsd)}</span>
      ),
    },
    {
      title: t('backing.columns.received'), key: 'received', width: 80,
      render: (_: unknown, r: typeof roomStats[0]) => (
        <span style={{ color: '#94a3b8' }}>{r.receivedUsd > 0 ? formatUsd(r.receivedUsd) : '—'}</span>
      ),
    },
    {
      title: t('backing.columns.paid'), key: 'paid', width: 80,
      render: (_: unknown, r: typeof roomStats[0]) => (
        <span style={{ color: '#94a3b8' }}>{r.paidUsd > 0 ? formatUsd(r.paidUsd) : '—'}</span>
      ),
    },
    {
      title: '', key: 'action', width: 150,
      render: (_: unknown, r: typeof roomStats[0]) => (
        <Space size={4}>
          <Button size="small" className="backing-btn"
            style={{
              background: '#065f46', borderColor: '#059669', color: '#34d399',
              fontSize: 12, height: 26, borderRadius: 6,
            }}
            icon={<ArrowDownOutlined />}
            onClick={() => { setRecvModal({ roomId: r.room.id, roomName: r.room.name }); setRecvAmount(0); setRecvBackerId(backers[0]?.id || ''); }}>
            {t('backing.actions.receive')}
          </Button>
          {r.remainingUsd > 0 && (
            <Button size="small" className="backing-btn"
              style={{
                background: '#1e3a5f', borderColor: '#3b82f6', color: '#93c5fd',
                fontSize: 12, height: 26, borderRadius: 6,
              }}
              icon={<WalletOutlined />}
              onClick={() => { setPayModal({ roomId: r.room.id, roomName: r.room.name }); setPayAmount(r.remainingUsd); setPayBackerId(backers[0]?.id || ''); setPayDate(dayjs()); }}>
              {t('backing.actions.pay')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <style>{`
        .backing-btn { transition: transform 0.2s ease, box-shadow 0.2s ease !important; }
        .backing-btn:hover { transform: scale(1.06); box-shadow: 0 4px 14px rgba(59,130,246,0.35) !important; }
      `}</style>
      <Title level={3} style={{ marginBottom: 24 }}>
        <TeamOutlined /> {t('backing.page.title')}
      </Title>

      {/* Backers card */}
      <Card style={{ background: '#1e293b', border: '1px solid #3b82f620', borderRadius: 8, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Title level={5} style={{ color: '#e2e8f0', margin: 0 }}><TeamOutlined /> {t('backing.sections.backers')}</Title>
          <Space>
            <Button size="small" icon={<WalletOutlined />} className="backing-btn"
              style={{ background: '#1e3a5f', borderColor: '#3b82f6', color: '#93c5fd', borderRadius: 6 }}
              onClick={() => { setPayoutModal(true); setPayoutAmount(0); setPayoutCurrency('USD'); setPayoutDate(dayjs()); setPayoutBackerId(backers[0]?.id || ''); }}>
              {t('backing.actions.payout')}
            </Button>
            <Button size="small" icon={<PlusOutlined />} className="backing-btn"
              style={{ background: '#065f46', borderColor: '#059669', color: '#34d399', borderRadius: 6 }}
              onClick={() => { setEditingBacker(null); setBackerFormName(''); setBackerFormPercent(50); setBackerModal(true); }}>
              {t('backing.actions.addBacker')}
            </Button>
          </Space>
        </div>
        {backers.length === 0 ? (
          <Text type="secondary">{t('backing.page.noBackers')}</Text>
        ) : (
          <Row gutter={[12, 12]}>
            {backers.map((b) => (
              <Col key={b.id}>
                <Card size="small" style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TeamOutlined style={{ color: '#3b82f6' }} />
                    <Text strong style={{ flex: 1 }}>{b.name}</Text>
                    <Text style={{ color: '#f59e0b', fontWeight: 700 }}>{b.percent}%</Text>
                    <Button type="text" size="small" icon={<EditOutlined />} className="backing-btn"
                      onClick={() => { setEditingBacker(b); setBackerFormName(b.name); setBackerFormPercent(b.percent); setBackerModal(true); }} />
                    <Popconfirm title={t('backing.page.deleteConfirm')} onConfirm={() => {
                      const updated = backers.filter((x) => x.id !== b.id);
                      setSettings({ backers: updated });
                    }}>
                      <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* Summary cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card style={{ background: '#1e293b', border: '1px solid #3b82f620', borderRadius: 8, textAlign: 'center' }}>
            <Statistic
              title={<Text type="secondary">{t('backing.stats.totalBuyIns')}</Text>}
              value={stats.totalBuyInUsd}
              precision={2}
              suffix="$"
              valueStyle={{ color: '#e2e8f0', fontSize: 22 }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ background: '#1e293b', border: '1px solid #3b82f620', borderRadius: 8, textAlign: 'center' }}>
            <Statistic
              title={<Text type="secondary">{t('backing.stats.totalProfit')}</Text>}
              value={stats.totalProfitUsd}
              precision={2}
              suffix="$"
              valueStyle={{ color: stats.totalProfitUsd >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ background: '#1e293b', border: '1px solid #3b82f620', borderRadius: 8, textAlign: 'center' }}>
            <Statistic
              title={<Text type="secondary">ROI</Text>}
              value={stats.totalBuyInUsd > 0 ? (stats.totalProfitUsd / stats.totalBuyInUsd) * 100 : 0}
              precision={2}
              suffix="%"
              valueStyle={{ color: stats.totalProfitUsd >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 22 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Split */}
      <Card style={{ background: '#1e293b', border: '1px solid #f59e0b20', borderRadius: 8, marginBottom: 24 }}>
        <Title level={5} style={{ color: '#f59e0b', marginBottom: 16 }}>
          <PercentageOutlined /> {t('backing.sections.distribution')}
        </Title>
        <Row gutter={[16, 16]}>
          {backers.map((b) => {
            const share = stats.aggregatedBackerShares[b.id] || 0;
            return (
              <Col key={b.id} span={backers.length <= 4 ? 24 / backers.length : 6}>
                <Card size="small" style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{b.name}</Text>
                  <div style={{ fontSize: 22, fontWeight: 700, color: share >= 0 ? '#52c41a' : '#ff4d4f' }}>
                    {formatUsd(share)}
                  </div>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>{t('backing.distribution.percentOfProfit', { percent: b.percent })}</Text>
                </Card>
              </Col>
            );
          })}
          <Col span={6}>
            <Card size="small" style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{t('backing.stats.received')}</Text>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#34d399' }}>
                {formatUsd(stats.totalReceivedUsd)}
              </div>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>{t('backing.stats.fromBackers')}</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{t('backing.stats.paid')}</Text>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>
                {formatUsd(stats.totalPaidUsd)}
              </div>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>{t('backing.stats.alreadyPaid')}</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{t('backing.stats.selfPaid')}</Text>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#a855f7' }}>
                {formatUsd(stats.totalBackerPaidUsd)}
              </div>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>{t('backing.stats.paidByBacker')}</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{t('backing.stats.toPay')}</Text>
              <div style={{ fontSize: 22, fontWeight: 700, color: stats.totalRemainingUsd > 0 ? '#3b82f6' : '#64748b' }}>
                {stats.totalRemainingUsd > 0 ? formatUsd(stats.totalRemainingUsd) : '0.00 $'}
              </div>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>{t('backing.stats.remainingAfterPayout')}</Text>
            </Card>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Card size="small" style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{t('backing.stats.player')}</Text>
              <div style={{ fontSize: 22, fontWeight: 700, color: stats.playerShareUsd >= 0 ? '#52c41a' : '#ff4d4f' }}>
                {formatUsd(stats.playerShareUsd)}
              </div>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>{t('backing.stats.remainingProfit')}</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{t('backing.stats.totalDebt')}</Text>
              <div style={{ fontSize: 22, fontWeight: 700, color: stats.totalDebtUsd > 0 ? '#f59e0b' : '#64748b' }}>
                {formatUsd(stats.totalDebtUsd)}
              </div>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>{t('backing.stats.debtBreakdown')}</Text>
            </Card>
          </Col>
        </Row>
        {stats.backerShareUsd < 0 && (
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <Text type="secondary">{t('backing.info.negativeProfit')}</Text>
          </div>
        )}
      </Card>

      {/* By room breakdown */}
      <Card style={{ background: '#1e293b', border: '1px solid #3b82f620', borderRadius: 8, marginBottom: 24 }}>
        <Title level={5} style={{ color: '#e2e8f0', marginBottom: 16 }}>{t('backing.sections.byRoom')}</Title>
        <Table
          dataSource={roomStats.filter((r) => r.buyInUsd > 0 || r.receivedUsd > 0 || r.paidUsd > 0)}
          columns={roomColumns}
          rowKey={(r) => r.room.id}
          pagination={false}
          size="small"
        />
      </Card>

      {/* History */}
      <Card style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}>
        <Collapse
          ghost
          expandIconPosition="end"
          items={[{
            key: 'history',
            label: (
              <Space>
                <HistoryOutlined style={{ color: '#94a3b8' }} />
                <Text style={{ color: '#e2e8f0', fontWeight: 600 }}>{t('backing.sections.history')}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{t('backing.history.entriesCount', { count: backingEntries.length })}</Text>
              </Space>
            ),
            children: (
              <>
                <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Select
                    placeholder={t('backing.history.roomFilter')}
                    allowClear
                    style={{ width: 150 }}
                    value={historyRoomFilter}
                    onChange={setHistoryRoomFilter}
                    options={rooms.map((r) => ({ value: r.id, label: r.name }))}
                  />
                  <DatePicker.RangePicker
                    format="DD.MM.YYYY"
                    value={historyDateRange}
                    onChange={(dates) => setHistoryDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
                    allowClear
                    style={{ width: 260 }}
                  />
                </div>
                {backingEntries.length > 0 ? (
              <Table
                dataSource={backingEntries}
                columns={[
                  { title: t('backing.columns.date'), dataIndex: 'date', key: 'date', width: 100, render: (d: string) => dayjs(d).format('DD.MM.YYYY') },
                  { title: t('backing.columns.room'), dataIndex: 'roomId', key: 'roomId', width: 100, render: (rid: string) => rooms.find((r) => r.id === rid)?.name || rid },
                  { title: t('backing.columns.type'), key: 'type', width: 120, render: (_: unknown, e: typeof backingEntries[0]) => {
                    if (e.comment?.startsWith('Оплата бэкером')) return <span style={{ color: '#a855f7' }}>{t('backing.history.paidByBacker')}</span>;
                    return (
                      <span style={{ color: e.comment?.startsWith('Выплата') ? '#f59e0b' : '#34d399' }}>
                        {e.comment?.startsWith('Выплата') ? t('backing.history.typePayment') : t('backing.history.typeReceipt')}
                      </span>
                    );
                  }},
                  {
                    title: t('backing.columns.amount'), dataIndex: 'amount', key: 'amount', width: 100,
                    render: (a: number, e: typeof backingEntries[0]) => {
                      const currency = e.currency || 'USD';
                      const isBackerPay = e.comment?.startsWith('Оплата бэкером');
                      const color = isBackerPay ? '#a855f7' : (a >= 0 ? '#34d399' : '#f59e0b');
                      const sign = isBackerPay ? '' : (a >= 0 ? '+' : '');
                      return (
                        <span style={{ color, fontWeight: 600 }}>
                          {sign}{formatAmount(Math.abs(a), currency)}
                        </span>
                      );
                    },
                  },
                  { title: t('backing.columns.comment'), dataIndex: 'comment', key: 'comment', render: (c: string) => <Text type="secondary">{c}</Text> },
                  {
                    title: '', key: 'actions', width: 60,
                    render: (_: unknown, e: typeof backingEntries[0]) => (
                      <Space>
                        <Button type="text" size="small" icon={<EditOutlined />}
                          onClick={() => { setEditEntry(e); setEditAmount(Math.abs(e.amount)); }} />
                        <Popconfirm title={t('backing.history.deleteConfirm')} onConfirm={() => handleDeleteEntry(e.id)}>
                          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    ),
                  },
                ]}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ) : (
              <Text type="secondary">{t('backing.history.noOps')}</Text>
            )}
              </>
            ),
          }]}
        />
      </Card>

      {/* Receive modal */}
      <Modal
        title={t('backing.actions.receiveTitle', { room: recvModal?.roomName ?? '' })}
        open={!!recvModal}
        onOk={handleReceive}
        onCancel={() => { setRecvModal(null); setRecvAmount(0); }}
        confirmLoading={recvSaving}
        okText={t('backing.actions.receive')}
        cancelText={t('backing.actions.cancel')}
        destroyOnClose
      >
        {recvModal && (() => {
          const currency = getRoomCurrency(recvModal.roomId);
          return (
            <Space direction="vertical" style={{ width: '100%' }}>
              {backers.length > 1 && (
                <div>
                  <Text type="secondary">{t('backing.fields.backer')}</Text>
                  <Select value={recvBackerId} onChange={setRecvBackerId} style={{ width: '100%' }}>
                    {backers.map((b) => (
                      <Select.Option key={b.id} value={b.id}>{b.name} ({b.percent}%)</Select.Option>
                    ))}
                  </Select>
                </div>
              )}
              <div>
                <Text type="secondary">{t('backing.fields.amount', { currency })}</Text>
                <InputNumber
                  value={recvAmount}
                  onChange={(v) => setRecvAmount(v ?? 0)}
                  min={0}
                  style={{ width: '100%' }}
                  prefix={currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽'}
                  size="large"
                />
              </div>
              <div>
                <Text type="secondary">{t('backing.fields.date')}</Text>
                <DatePicker value={recvDate} onChange={(d) => d && setRecvDate(d)} format="DD.MM.YYYY" style={{ width: '100%' }} size="large" />
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('backing.actions.receiveInfo', { room: recvModal.roomName })}
              </Text>
            </Space>
          );
        })()}
      </Modal>

      {/* Pay modal */}
      <Modal
        title={t('backing.actions.payTitle', { room: payModal?.roomName ?? '' })}
        open={!!payModal}
        onOk={handlePay}
        onCancel={() => { setPayModal(null); setPayAmount(0); }}
        confirmLoading={paySaving}
        okText={t('backing.actions.pay')}
        cancelText={t('backing.actions.cancel')}
        destroyOnClose
      >
        {payModal && (() => {
          const currency = getRoomCurrency(payModal.roomId);
          return (
            <Space direction="vertical" style={{ width: '100%' }}>
              {backers.length > 1 && (
                <div>
                  <Text type="secondary">{t('backing.fields.backer')}</Text>
                  <Select value={payBackerId} onChange={setPayBackerId} style={{ width: '100%' }}>
                    {backers.map((b) => (
                      <Select.Option key={b.id} value={b.id}>{b.name} ({b.percent}%)</Select.Option>
                    ))}
                  </Select>
                </div>
              )}
              <div>
                <Text type="secondary">{t('backing.fields.amount', { currency })}</Text>
                <InputNumber
                  value={payAmount}
                  onChange={(v) => setPayAmount(v ?? 0)}
                  min={0}
                  style={{ width: '100%' }}
                  prefix={currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽'}
                  size="large"
                />
              </div>
              <div>
                <Text type="secondary">{t('backing.fields.date')}</Text>
                <DatePicker value={payDate} onChange={(d) => d && setPayDate(d)} format="DD.MM.YYYY" style={{ width: '100%' }} size="large" />
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('backing.actions.payInfo', { room: payModal.roomName })}
              </Text>
            </Space>
          );
        })()}
      </Modal>

      {/* Backer modal */}
      <Modal
        title={editingBacker ? t('backing.backerModal.editTitle') : t('backing.backerModal.addTitle')}
        open={backerModal}
        onOk={() => {
          if (!backerFormName.trim()) { message.warning(t('backing.backerModal.nameRequired')); return; }
          if (backerFormPercent <= 0 || backerFormPercent > 100) { message.warning(t('backing.backerModal.percentInvalid')); return; }
          if (editingBacker) {
            setSettings({ backers: backers.map((b) => b.id === editingBacker.id ? { ...b, name: backerFormName.trim(), percent: backerFormPercent } : b) });
          } else {
            setSettings({ backers: [...backers, { id: crypto.randomUUID(), name: backerFormName.trim(), percent: backerFormPercent }] });
          }
          setBackerModal(false);
        }}
        onCancel={() => setBackerModal(false)}
        okText={editingBacker ? t('backing.backerModal.save') : t('backing.backerModal.add')}
        cancelText={t('backing.actions.cancel')}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text type="secondary">{t('backing.backerModal.nameLabel')}</Text>
            <Input value={backerFormName} onChange={(e) => setBackerFormName(e.target.value)} placeholder={t('backing.backerModal.namePlaceholder')} />
          </div>
          <div>
            <Text type="secondary">{t('backing.backerModal.percentLabel')}</Text>
            <InputNumber value={backerFormPercent} onChange={(v) => setBackerFormPercent(v ?? 50)} min={1} max={100} style={{ width: '100%' }} addonAfter="%" />
          </div>
        </Space>
      </Modal>

      {/* Payout modal */}
      <Modal
        title={t('backing.actions.selfPayout')}
        open={payoutModal}
        onOk={handlePayout}
        onCancel={() => { setPayoutModal(false); setPayoutAmount(0); }}
        confirmLoading={payoutSaving}
        okText={t('backing.actions.pay')}
        cancelText={t('backing.actions.cancel')}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {backers.length > 1 && (
            <div>
              <Text type="secondary">{t('backing.fields.backer')}</Text>
              <Select value={payoutBackerId} onChange={setPayoutBackerId} style={{ width: '100%' }}>
                {backers.map((b) => (
                  <Select.Option key={b.id} value={b.id}>{b.name} ({b.percent}%)</Select.Option>
                ))}
              </Select>
            </div>
          )}
          <div>
            <Text type="secondary">{t('backing.fields.currency')}</Text>
            <Select
              value={payoutCurrency}
              onChange={(v: Currency) => setPayoutCurrency(v)}
              style={{ width: '100%' }}
              options={[
                { value: 'USD', label: t('backing.fields.currencyUsd') },
                { value: 'EUR', label: t('backing.fields.currencyEur') },
                { value: 'RUB', label: t('backing.fields.currencyRub') },
              ]}
            />
          </div>
          <div>
            <Text type="secondary">{t('backing.fields.amount', { currency: payoutCurrency })}</Text>
            <InputNumber
              value={payoutAmount}
              onChange={(v) => setPayoutAmount(v ?? 0)}
              min={0}
              style={{ width: '100%' }}
              prefix={payoutCurrency === 'USD' ? '$' : payoutCurrency === 'EUR' ? '€' : '₽'}
              size="large"
            />
          </div>
          <div>
            <Text type="secondary">{t('backing.fields.date')}</Text>
            <DatePicker
              value={payoutDate}
              onChange={(d) => d && setPayoutDate(d)}
              format="DD.MM.YYYY"
              style={{ width: '100%' }}
              size="large"
            />
          </div>
        </Space>
      </Modal>

      {/* Edit modal */}
      <Modal
        title={t('backing.actions.editEntry')}
        open={!!editEntry}
        onOk={handleEditEntry}
        onCancel={() => setEditEntry(null)}
        confirmLoading={editSaving}
        okText={t('backing.actions.save')}
        cancelText={t('backing.actions.cancel')}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary">
            {editEntry?.comment?.startsWith('Выплата') ? t('backing.actions.editPayAmount') : t('backing.actions.editReceiveAmount')}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('backing.fields.room')}: {editEntry ? rooms.find((r) => r.id === editEntry.roomId)?.name || editEntry.roomId : ''}
          </Text>
          <InputNumber
            value={editAmount}
            onChange={(v) => setEditAmount(v ?? 0)}
            min={0}
            style={{ width: '100%' }}
            prefix="$"
            size="large"
          />
        </Space>
      </Modal>
    </div>
  );
}
