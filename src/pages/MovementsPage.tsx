import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Select, Typography, Space, Tag, Empty, DatePicker, Pagination } from 'antd';
import { SwapOutlined, TrophyOutlined, CloseCircleOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAllRooms, getAllSessions, getAllTournaments, getAllBankrollEntries } from '../db/db';
import type { Room, BankrollEntry, Currency } from '../types';
import { convertToUsd } from '../utils/currency';
import { useAppStore } from '../store/appStore';

const PAGE_SIZE = 20;

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface Movement {
  id: string;
  date: string;
  type: 'win' | 'loss' | 'deposit' | 'withdrawal';
  amount: number;
  currency?: Currency;
  roomName: string;
  description: string;
  usdAmount: number;
}

export default function MovementsPage() {
  const { t } = useTranslation();
  const { settings } = useAppStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [entries, setEntries] = useState<BankrollEntry[]>([]);
  const [roomFilter, setRoomFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    Promise.all([getAllRooms(), getAllSessions(), getAllTournaments(), getAllBankrollEntries()]).then(([r, s, t, e]) => {
      setRooms(r);
      setSessions(s);
      setTournaments(t);
      setEntries(e);
    });
  }, []);

  useEffect(() => { setCurrentPage(1); }, [roomFilter, typeFilter, dateRange, sortOrder]);

  const tourMap = useMemo(() => new Map(tournaments.map((t: any) => [t.id, t])), [tournaments]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  const movements = useMemo(() => {
    const list: Movement[] = [];

    // Session wins/losses
    for (const s of sessions) {
      const tour = tourMap.get(s.tournamentId);
      const room = tour ? roomMap.get(tour.roomId) : undefined;
      const buyInUsd = tour ? convertToUsd(tour.buyIn, tour.currency) : 0;
      const prizeUsd = s.inPrize ? convertToUsd(s.prize, s.prizeCurrency) : 0;
      const bountyUsd = s.inPrize ? convertToUsd(s.bountySum, s.bountyCurrency) : 0;
      const profitUsd = prizeUsd + bountyUsd - buyInUsd;

      if (profitUsd > 0) {
        list.push({
          id: `session-win-${s.id}`,
          date: s.date,
          type: 'win',
          amount: profitUsd,
          currency: 'USD',
          roomName: room?.name ?? '—',
          description: `${tour?.name ?? '—'} (приз ${prizeUsd.toFixed(2)}$ + баунти ${bountyUsd.toFixed(2)}$ - бай-ин ${buyInUsd.toFixed(2)}$)`,
          usdAmount: profitUsd,
        });
      } else if (profitUsd < 0) {
        list.push({
          id: `session-loss-${s.id}`,
          date: s.date,
          type: 'loss',
          amount: Math.abs(profitUsd),
          currency: 'USD',
          roomName: room?.name ?? '—',
          description: `${tour?.name ?? '—'} (приз ${prizeUsd.toFixed(2)}$ + баунти ${bountyUsd.toFixed(2)}$ - бай-ин ${buyInUsd.toFixed(2)}$)`,
          usdAmount: Math.abs(profitUsd),
        });
      } else if (profitUsd === 0 && s.inPrize) {
        list.push({
          id: `session-zero-${s.id}`,
          date: s.date,
          type: 'win',
          amount: 0,
          currency: 'USD',
          roomName: room?.name ?? '—',
          description: `${tour?.name ?? '—'} (0$ прибыли)`,
          usdAmount: 0,
        });
      }
    }

    // Bankroll entries
    for (const e of entries) {
      const room = roomMap.get(e.roomId);
      const cur = e.currency || 'USD';
      list.push({
        id: `bankroll-${e.id}`,
        date: e.date,
        type: e.amount >= 0 ? 'deposit' : 'withdrawal',
        amount: Math.abs(e.amount),
        currency: cur,
        roomName: room?.name ?? '—',
        description: e.comment || (e.amount >= 0 ? t('movements.types.deposit') : t('movements.types.withdrawal')),
        usdAmount: Math.abs(e.amount),
      });
    }

    // Filter
    let filtered = list;
    if (roomFilter.length > 0) {
      filtered = filtered.filter((m) => roomFilter.includes(m.roomName));
    }
    if (typeFilter.length > 0) {
      filtered = filtered.filter((m) => typeFilter.includes(m.type));
    }
    if (dateRange?.[0] && dateRange?.[1]) {
      const start = dateRange[0].format('YYYY-MM-DD');
      const end = dateRange[1].format('YYYY-MM-DD');
      filtered = filtered.filter((m) => m.date >= start && m.date <= end);
    }

    // Sort
    filtered.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return filtered;
  }, [sessions, entries, tourMap, roomMap, roomFilter, typeFilter, dateRange, sortOrder]);

  const typeColors: Record<string, string> = {
    win: '#52c41a',
    loss: '#ff4d4f',
    deposit: '#3b82f6',
    withdrawal: '#f59e0b',
  };
  const typeLabels: Record<string, string> = {
    win: t('movements.types.win'),
    loss: t('movements.types.loss'),
    deposit: t('movements.types.deposit'),
    withdrawal: t('movements.types.withdrawal'),
  };
  const typeIcons: Record<string, React.ReactNode> = {
    win: <TrophyOutlined />,
    loss: <CloseCircleOutlined />,
    deposit: <PlusOutlined />,
    withdrawal: <MinusOutlined />,
  };

  const availableRooms = useMemo(() => {
    const names = new Set<string>();
    for (const r of rooms) names.add(r.name);
    return Array.from(names).sort();
  }, [rooms]);

  const convertAmount = (usd: number) => `${usd.toFixed(2)} $`;

  const totalWin = useMemo(() => movements.filter((m) => m.type === 'win').reduce((s, m) => s + m.usdAmount, 0), [movements]);
  const totalLoss = useMemo(() => movements.filter((m) => m.type === 'loss').reduce((s, m) => s + m.usdAmount, 0), [movements]);
  const totalDeposit = useMemo(() => movements.filter((m) => m.type === 'deposit').reduce((s, m) => s + m.usdAmount, 0), [movements]);
  const totalWithdrawal = useMemo(() => movements.filter((m) => m.type === 'withdrawal').reduce((s, m) => s + m.usdAmount, 0), [movements]);

  const displayedMovements = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return movements.slice(start, start + PAGE_SIZE);
  }, [movements, currentPage]);

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}><SwapOutlined style={{ marginRight: 8 }} />{t('movements.page.title')}</Title>

      {/* Filters */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
        <Col xs={24} sm={12} md={6}>
          <RangePicker
            value={dateRange as any}
            onChange={(v) => setDateRange(v as any)}
            style={{ width: '100%' }}
            size="small"
            placeholder={[t('movements.filters.from'), t('movements.filters.to')]}
          />
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Select
            mode="multiple"
            value={roomFilter}
            onChange={setRoomFilter}
            placeholder={t('movements.filters.room')}
            style={{ width: '100%' }}
            size="small"
            allowClear
            options={availableRooms.map((n) => ({ value: n, label: n }))}
          />
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Select
            mode="multiple"
            value={typeFilter}
            onChange={setTypeFilter}
            placeholder={t('movements.filters.type')}
            style={{ width: '100%' }}
            size="small"
            allowClear
            options={[
              { value: 'win', label: t('movements.types.win') },
              { value: 'loss', label: t('movements.types.loss') },
              { value: 'deposit', label: t('movements.types.deposit') },
              { value: 'withdrawal', label: t('movements.types.withdrawal') },
            ]}
          />
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Select
            value={sortOrder}
            onChange={setSortOrder}
            style={{ width: '100%' }}
            size="small"
            options={[
              { value: 'desc', label: t('movements.filters.newest') },
              { value: 'asc', label: t('movements.filters.oldest') },
            ]}
          />
        </Col>
      </Row>

      {/* Summary */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6} md={3}>
          <Card size="small" style={{ background: '#1e293b', border: '1px solid #52c41a40' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>{t('movements.summary.wins')}</Text>
            <div style={{ color: '#52c41a', fontWeight: 700, fontSize: 16 }}>{totalWin.toFixed(2)}$</div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card size="small" style={{ background: '#1e293b', border: '1px solid #ff4d4f40' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>{t('movements.summary.losses')}</Text>
            <div style={{ color: '#ff4d4f', fontWeight: 700, fontSize: 16 }}>{totalLoss.toFixed(2)}$</div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card size="small" style={{ background: '#1e293b', border: '1px solid #3b82f640' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>{t('movements.summary.deposits')}</Text>
            <div style={{ color: '#3b82f6', fontWeight: 700, fontSize: 16 }}>{totalDeposit.toFixed(2)}$</div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card size="small" style={{ background: '#1e293b', border: '1px solid #f59e0b40' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>{t('movements.summary.withdrawals')}</Text>
            <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 16 }}>{totalWithdrawal.toFixed(2)}$</div>
          </Card>
        </Col>
      </Row>

      {/* Movement list */}
      {movements.length === 0 ? (
        <Empty description={t('movements.page.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {displayedMovements.map((m) => (
            <Card key={m.id} size="small" hoverable style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <Space size={8} wrap>
                  <Tag color={typeColors[m.type]} style={{ margin: 0, borderRadius: 4, fontWeight: 600 }}>
                    <Space size={4}>
                      {typeIcons[m.type]}
                      {typeLabels[m.type]}
                    </Space>
                  </Tag>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>{m.date}</Text>
                  <Text style={{ color: '#3b82f6', fontSize: 12 }}>{m.roomName}</Text>
                </Space>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <Text strong style={{ fontSize: 15, color: m.type === 'win' || m.type === 'deposit' ? '#52c41a' : '#ff4d4f' }}>
                    {m.type === 'win' || m.type === 'deposit' ? '+' : '-'}{convertAmount(m.amount)}
                  </Text>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{m.description}</div>
                </div>
              </div>
            </Card>
          ))}
          {movements.length > PAGE_SIZE && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <Pagination
                current={currentPage}
                total={movements.length}
                pageSize={PAGE_SIZE}
                onChange={setCurrentPage}
                showSizeChanger={false}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
