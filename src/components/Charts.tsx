import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Statistic, Collapse, Space, Select, Button } from 'antd';
import { TrophyOutlined, DollarOutlined, RiseOutlined, FallOutlined, TeamOutlined, BankOutlined, PieChartOutlined, BarChartOutlined, LineChartOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, ResponsiveContainer, Legend } from 'recharts';
import { getAllSessions, getAllTournaments, getAllRooms, getAllBankrollEntries } from '../db/db';
import type { Session, Tournament, Room, Currency, BankrollEntry } from '../types';
import { convertToRub, formatRub } from '../utils/currency';
import { useAppStore } from '../store/appStore';

const { Panel } = Collapse;

const CARD_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#22c55e'] as const;

const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#22c55e', '#f97316', '#ec4899', '#ef4444'];

export default function Charts() {
  const { t } = useTranslation();
  const { settings } = useAppStore();
  const [chartCurrency, setChartCurrency] = useState<Currency>('USD');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomFilter, setRoomFilter] = useState<string[]>([]);
  const [tournamentNameFilter, setTournamentNameFilter] = useState<string>('all');
  const [expenseTournamentFilter, setExpenseTournamentFilter] = useState<string[]>([]);
  const [showWorst, setShowWorst] = useState(false);
  const [bankrollEntries, setBankrollEntries] = useState<BankrollEntry[]>([]);

  useEffect(() => {
    Promise.all([getAllSessions(), getAllTournaments(), getAllRooms(), getAllBankrollEntries()]).then(([s, t, r, b]) => {
      setSessions(s);
      setTournaments(t);
      setRooms(r);
      setBankrollEntries(b);
    });
  }, []);

  const tourMap = useMemo(() => new Map(tournaments.map((t) => [t.id, t])), [tournaments]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  const enriched = useMemo(() => {
    return sessions
      .map((s) => {
        const tour = tourMap.get(s.tournamentId);
        const room = tour ? roomMap.get(tour.roomId) : undefined;
        const buyInRub = tour ? convertToRub(tour.buyIn, tour.currency) : 0;
        const prizeRub = convertToRub(s.prize, s.prizeCurrency);
        const bountyRub = convertToRub(s.bountySum, s.bountyCurrency);
        const profitRub = prizeRub + bountyRub - buyInRub;

        return {
          ...s,
          tour,
          roomName: room?.name ?? '—',
          roomId: room?.id ?? '',
          date: s.date,
          buyInRub,
          prizeRub,
          bountyRub,
          profitRub,
        };
      })
      .filter((r) => roomFilter.length === 0 || roomFilter.includes(r.roomId));
  }, [sessions, tourMap, roomMap, roomFilter]);

  const totalProfit = useMemo(() => {
    const rub = enriched.reduce((s, r) => s + r.profitRub, 0);
    if (chartCurrency === 'USD') return rub / settings.usdToRub;
    if (chartCurrency === 'EUR') return rub / settings.eurToRub;
    return rub;
  }, [enriched, chartCurrency, settings.usdToRub, settings.eurToRub]);

  const totalPrizeRub = useMemo(() => enriched.reduce((s, r) => s + r.prizeRub, 0), [enriched]);
  const totalBountyRub = useMemo(() => enriched.reduce((s, r) => s + r.bountyRub, 0), [enriched]);
  const totalBuyInRub = useMemo(() => enriched.reduce((s, r) => s + r.buyInRub, 0), [enriched]);
  const totalWonRub = useMemo(() => enriched.reduce((s, r) => s + r.prizeRub + r.bountyRub, 0), [enriched]);
  const totalWon = useMemo(() => {
    const rub = totalWonRub;
    if (chartCurrency === 'USD') return rub / settings.usdToRub;
    if (chartCurrency === 'EUR') return rub / settings.eurToRub;
    return rub;
  }, [totalWonRub, chartCurrency, settings.usdToRub, settings.eurToRub]);
  const roi = totalBuyInRub > 0 ? ((totalPrizeRub + totalBountyRub - totalBuyInRub) / totalBuyInRub) * 100 : 0;
  const avgBuyIn = useMemo(() => {
    const rub = enriched.length > 0 ? totalBuyInRub / enriched.length : 0;
    if (chartCurrency === 'USD') return rub / settings.usdToRub;
    if (chartCurrency === 'EUR') return rub / settings.eurToRub;
    return rub;
  }, [enriched, totalBuyInRub, chartCurrency, settings.usdToRub, settings.eurToRub]);

  const expenseStats = useMemo(() => {
    let filtered = enriched;
    if (expenseTournamentFilter.length > 0) {
      filtered = filtered.filter((r) => r.tour && expenseTournamentFilter.includes(r.tour.name));
    }
    const totalSessions = filtered.length;
    const totalBuyInRub = filtered.reduce((s, r) => s + r.buyInRub, 0);
    let totalBuyIn = totalBuyInRub;
    if (chartCurrency === 'USD') totalBuyIn = totalBuyIn / settings.usdToRub;
    else if (chartCurrency === 'EUR') totalBuyIn = totalBuyIn / settings.eurToRub;

    const perTournament = new Map<string, { count: number; buyInRub: number }>();
    for (const r of filtered) {
      const name = r.tour?.name ?? '—';
      const existing = perTournament.get(name) ?? { count: 0, buyInRub: 0 };
      existing.count += 1;
      existing.buyInRub += r.buyInRub;
      perTournament.set(name, existing);
    }
    const breakdown = Array.from(perTournament.entries())
      .map(([name, data]) => {
        let buyIn = data.buyInRub;
        if (chartCurrency === 'USD') buyIn = buyIn / settings.usdToRub;
        else if (chartCurrency === 'EUR') buyIn = buyIn / settings.eurToRub;
        return { name, count: data.count, buyIn: Math.round(buyIn * 100) / 100 };
      })
      .sort((a, b) => b.buyIn - a.buyIn);

    return { totalSessions, totalBuyIn, breakdown };
  }, [enriched, expenseTournamentFilter, chartCurrency, settings.usdToRub, settings.eurToRub]);

  const worstTournaments = useMemo(() => {
    const map = new Map<string, { buyIn: number; currency: Currency; prizeRub: number; bountyRub: number; count: number }>();
    for (const r of enriched) {
      const name = r.tour?.name ?? '—';
      const existing = map.get(name) ?? { buyIn: r.tour?.buyIn ?? 0, currency: r.tour?.currency ?? 'USD', prizeRub: 0, bountyRub: 0, count: 0 };
      existing.prizeRub += r.prizeRub;
      existing.bountyRub += r.bountyRub;
      existing.count += 1;
      map.set(name, existing);
    }
    return Array.from(map.entries())
      .map(([name, data]) => {
        const buyInRub = convertToRub(data.buyIn, data.currency);
        const profitRub = data.prizeRub + data.bountyRub - buyInRub * data.count;
        let buyInVal = data.buyIn;
        let profit = profitRub;
        if (chartCurrency === 'USD') {
          buyInVal = buyInRub / settings.usdToRub;
          profit = profitRub / settings.usdToRub;
        } else if (chartCurrency === 'EUR') {
          buyInVal = buyInRub / settings.eurToRub;
          profit = profitRub / settings.eurToRub;
        }
        return {
          name,
          count: data.count,
          buyIn: Math.round(buyInVal * 100) / 100,
          profit: Math.round(profit * 100) / 100,
        };
      })
      .sort((a, b) => a.profit - b.profit)
      .slice(0, 10);
  }, [enriched, chartCurrency, settings.usdToRub, settings.eurToRub]);

  const roomProfitRub = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of enriched) {
      map.set(r.roomName, (map.get(r.roomName) ?? 0) + r.profitRub);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [enriched]);

  const roomProfit = useMemo(() => {
    return roomProfitRub.map((r) => {
      let v = r.value;
      if (chartCurrency === 'USD') v = v / settings.usdToRub;
      else if (chartCurrency === 'EUR') v = v / settings.eurToRub;
      return { ...r, value: v };
    });
  }, [roomProfitRub, chartCurrency, settings.usdToRub, settings.eurToRub]);

  const bestRoom = roomProfit.length > 0 ? roomProfit[0].name : '—';

  const tournamentProfit = useMemo(() => {
    const map = new Map<string, { profit: number; count: number }>();
    for (const r of enriched) {
      if (tournamentNameFilter !== 'all' && r.tour?.name !== tournamentNameFilter) continue;
      const name = r.tour?.name ?? '—';
      const existing = map.get(name) ?? { profit: 0, count: 0 };
      existing.profit += r.profitRub;
      existing.count += 1;
      map.set(name, existing);
    }
    return Array.from(map.entries())
      .map(([name, data]) => {
        let profit = Math.round(data.profit);
        if (chartCurrency === 'USD') profit = profit / settings.usdToRub;
        else if (chartCurrency === 'EUR') profit = profit / settings.eurToRub;
        return { name, profit: Math.round(profit * 100) / 100, count: data.count };
      })
      .sort((a, b) => b.profit - a.profit)
      .map((d, i) => ({ ...d, id: i + 1 }));
  }, [enriched, chartCurrency, settings.usdToRub, settings.eurToRub, tournamentNameFilter]);

  const tournamentProfitByCount = useMemo(() => {
    const map = new Map<number, { profit: number; names: string[] }>();
    for (const t of tournamentProfit) {
      const existing = map.get(t.count) ?? { profit: 0, names: [] };
      existing.profit += t.profit;
      existing.names.push(t.name);
      map.set(t.count, existing);
    }
    return Array.from(map.entries())
      .map(([count, data]) => ({
        count,
        profit: Math.round(data.profit * 100) / 100,
        names: data.names,
        label: `${count} (${data.names.length})`,
      }))
      .sort((a, b) => a.count - b.count);
  }, [tournamentProfit]);

  const availableTournaments = useMemo(() => {
    const names = new Set(enriched.map((r) => r.tour?.name ?? '—'));
    return Array.from(names).sort();
  }, [enriched]);

  const bankroll = useMemo(() => {
    const sessionPoints = enriched.map((r) => ({
      date: r.date,
      valueRub: r.profitRub,
      name: r.tour?.name ?? '—',
    }));
    const bankrollPoints = bankrollEntries
      .filter((e) => roomFilter.length === 0 || roomFilter.includes(e.roomId))
      .map((e) => ({
        date: e.date,
        valueRub: e.amount * settings.usdToRub,
        name: (e.amount >= 0 ? 'Пополнение' : 'Снятие'),
      }));
    const combined = [...sessionPoints, ...bankrollPoints]
      .sort((a, b) => a.date.localeCompare(b.date));
    let cum = 0;
    return combined.map((p, i) => {
      cum += p.valueRub;
      let val = Math.round(cum);
      if (chartCurrency === 'USD') val = val / settings.usdToRub;
      else if (chartCurrency === 'EUR') val = val / settings.eurToRub;
      return {
        id: i + 1,
        name: p.name,
        bankroll: Math.round(val * 100) / 100,
      };
    });
  }, [enriched, bankrollEntries, chartCurrency, settings.usdToRub, settings.eurToRub, roomFilter]);

  const formatChartValue = (v: number) => {
    if (chartCurrency === 'RUB') return formatRub(v);
    if (chartCurrency === 'USD') return `${v.toFixed(2)} $`;
    return `${v.toFixed(2)} €`;
  };

  const topWins = useMemo(() => {
    return enriched
      .filter((r) => r.inPrize)
      .sort((a, b) => (b.prizeRub + b.bountyRub) - (a.prizeRub + a.bountyRub))
      .slice(0, 3)
      .map((r) => {
        let win = r.prizeRub + r.bountyRub;
        if (chartCurrency === 'USD') win = win / settings.usdToRub;
        else if (chartCurrency === 'EUR') win = win / settings.eurToRub;
        return {
          ...r,
          displayProfit: win,
        };
      });
  }, [enriched, chartCurrency, settings.usdToRub, settings.eurToRub]);

  const formatAxis = (v: number) => {
    if (chartCurrency !== 'RUB') return `${v.toFixed(0)}`;
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}${t('reports.axes.million')}`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}${t('reports.axes.thousand')}`;
    return `${v}`;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      const total = roomProfit.reduce((s, r) => s + r.value, 0);
      const pct = ((payload[0].value / total) * 100).toFixed(1);
      return (
        <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '8px 12px', borderRadius: 8 }}>
          <p style={{ color: payload[0].color, margin: 0, fontWeight: 600 }}>{payload[0].name}</p>
          <p style={{ color: '#e2e8f0', margin: 0 }}>{formatChartValue(payload[0].value)} ({pct}%)</p>
        </div>
      );
    }
    return null;
  };

  const cardStyle: React.CSSProperties = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  };

  return (
    <div>
      <style>{`
        .stat-card {
          transition: all 0.3s ease !important;
        }
        .stat-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important;
        }
        .chart-card {
          transition: opacity 0.4s ease, transform 0.4s ease;
        }
      `}</style>

      {/* Фильтры */}
      <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
        <Col>
          <Select
            mode="multiple"
            value={roomFilter}
            onChange={(v) => { setRoomFilter(v); setTournamentNameFilter('all'); }}
            placeholder={t('reports.filters.allRooms')}
            style={{ width: 300 }}
            allowClear
            options={rooms.map((r) => ({ value: r.id, label: r.name }))}
          />
        </Col>
        <Col>
          <Select
            value={chartCurrency}
            onChange={setChartCurrency}
            size="small"
            style={{ width: 120 }}
            options={[
              { value: 'RUB', label: t('reports.currencies.rub') },
              { value: 'USD', label: t('reports.currencies.usd') },
              { value: 'EUR', label: t('reports.currencies.eur') },
            ]}
          />
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8} style={{ height: 120 }}>
          <Card className="stat-card" hoverable style={{ ...cardStyle, background: 'linear-gradient(135deg, #3b82f620, #3b82f608)', border: '1px solid #3b82f640' }}>
            <Statistic title={t('reports.stats.totalProfit')} value={totalProfit} precision={chartCurrency === 'RUB' ? 0 : 2}
              valueStyle={{ color: totalProfit >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 24 }}
              prefix={<DollarOutlined />} suffix={chartCurrency === 'RUB' ? '₽' : chartCurrency === 'USD' ? '$' : '€'} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} style={{ height: 120 }}>
          <Card className="stat-card" hoverable style={{ ...cardStyle, background: 'linear-gradient(135deg, #3b82f620, #3b82f608)', border: '1px solid #3b82f640' }}>
            <Statistic title="ROI" value={roi} precision={1}
              valueStyle={{ color: roi >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 24 }}
              prefix={roi >= 0 ? <RiseOutlined /> : <FallOutlined />} suffix="%" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} style={{ height: 120 }}>
          <Card className="stat-card" hoverable style={{ ...cardStyle, background: 'linear-gradient(135deg, #3b82f620, #3b82f608)', border: '1px solid #3b82f640' }}>
            <Statistic title={t('reports.stats.totalWon')} value={totalWon} precision={chartCurrency === 'RUB' ? 0 : 2}
              valueStyle={{ color: totalWon >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 24 }}
              prefix={<DollarOutlined />} suffix={chartCurrency === 'RUB' ? '₽' : chartCurrency === 'USD' ? '$' : '€'} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} style={{ height: 120 }}>
          <Card className="stat-card" hoverable style={{ ...cardStyle, background: 'linear-gradient(135deg, #3b82f620, #3b82f608)', border: '1px solid #3b82f640' }}>
            <Statistic title={t('reports.stats.sessionsPlayed')} value={enriched.length} valueStyle={{ fontSize: 24 }} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} style={{ height: 120 }}>
          <Card className="stat-card" hoverable style={{ ...cardStyle, background: 'linear-gradient(135deg, #3b82f620, #3b82f608)', border: '1px solid #3b82f640' }}>
            <Statistic title={t('reports.stats.avgBuyIn')} value={avgBuyIn} precision={chartCurrency === 'RUB' ? 0 : 2}
              valueStyle={{ fontSize: 24 }} prefix={<BankOutlined />}
              suffix={chartCurrency === 'RUB' ? '₽' : chartCurrency === 'USD' ? '$' : '€'} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} style={{ height: 120 }}>
          <Card className="stat-card" hoverable style={{ ...cardStyle, background: 'linear-gradient(135deg, #3b82f620, #3b82f608)', border: '1px solid #3b82f640' }}>
            <Statistic title={t('reports.stats.bestRoom')} value={bestRoom} valueStyle={{ fontSize: 24 }} prefix={<TrophyOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Top 3 wins */}
      {topWins.length > 0 && (
        <Card size="small" className="top-wins-section" style={{ marginBottom: 24, background: '#1e293b', border: '1px solid #3b82f630' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TrophyOutlined style={{ color: '#3b82f6', fontSize: 16 }} />
            <span style={{ color: '#3b82f6', fontSize: 14, fontWeight: 700 }}>{t('reports.charts.top3Wins')}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {topWins.map((w, i) => (
              <div key={w.id} className="top-win-card" style={{ flex: '1 1 180px', background: '#1e293b', borderRadius: 8, padding: '8px 12px', border: '1px solid #334155' }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>#{i + 1}</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#52c41a' }}>{formatChartValue(w.displayProfit)}</div>
                <div className="top-win-name" style={{ fontSize: 12, color: '#e2e8f0', marginTop: 2 }}>{w.tour?.name ?? '—'}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{w.date}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Collapse
        ghost
        expandIconPosition="end"
        style={{ marginTop: 16 }}
      >
        <Panel
          header={
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              <PieChartOutlined style={{ marginRight: 8, color: '#3b82f6' }} />
              {t('reports.charts.profitByRoom')}
            </span>
          }
          key="profitByRoom"
        >
          <Card className="chart-card" style={{ background: '#1e293b', border: '1px solid #3b82f620', borderRadius: 12 }}>
            <ResponsiveContainer width="100%" height={420}>
              <PieChart>
                <Pie
                  data={roomProfit}
                  cx="50%"
                  cy="50%"
                  outerRadius={140}
                  innerRadius={60}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {roomProfit.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={40}
                  formatter={(value) => <span style={{ color: '#e2e8f0', fontSize: 13 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Panel>

        <Panel
          header={
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              <BarChartOutlined style={{ marginRight: 8, color: '#3b82f6' }} />
              {t('reports.charts.profitByTournament')}
            </span>
          }
          key="profitByTournament"
        >
          <div style={{ marginTop: 8, marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Select
              value={tournamentNameFilter}
              onChange={setTournamentNameFilter}
              size="small"
              style={{ width: 360 }}
              options={[
                { value: 'all', label: t('reports.charts.allTournaments') },
                ...availableTournaments.map((t) => ({ value: t, label: t })),
              ]}
            />
          </div>
          <Card className="chart-card" style={{ background: '#1e293b', border: '1px solid #3b82f620', borderRadius: 12 }}>
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={tournamentProfitByCount} margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="count" stroke="#94a3b8" fontSize={13} tickMargin={6} label={{ value: t('reports.axes.gamesCount'), position: 'insideBottom', offset: -4, fill: '#e2e8f0', fontSize: 12, fontWeight: 600 }} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={formatAxis} label={{ value: chartCurrency === 'RUB' ? t('reports.axes.profitRub') : chartCurrency === 'USD' ? t('reports.axes.profitUsd') : t('reports.axes.profitEur'), angle: -90, position: 'insideLeft', offset: 10, fill: '#e2e8f0', fontSize: 12, fontWeight: 600 }} />
                <Tooltip content={({ active, payload }: any) => {
                  if (active && payload?.length) {
                    const d = payload[0].payload;
                    return (
                      <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '8px 12px', borderRadius: 8 }}>
                        <p style={{ color: '#e2e8f0', margin: 0, fontWeight: 600 }}>{t('reports.tooltips.gamesPlayed')} {d.count}</p>
                        <p style={{ color: '#94a3b8', margin: 0, fontSize: 11 }}>{t('reports.tooltips.tournaments')} {d.names.length}</p>
                        <p style={{ color: '#94a3b8', margin: 0, fontSize: 11, wordBreak: 'break-word' }}>{d.names.join(', ')}</p>
                        <p style={{ color: payload[0].color, margin: '4px 0 0' }}>{t('reports.tooltips.profit')} {formatChartValue(payload[0].value)}</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Bar dataKey="profit" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} name={t('reports.expenses.profit')} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Panel>

        <Panel
          header={
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              <LineChartOutlined style={{ marginRight: 8, color: '#f59e0b' }} />
              {t('reports.charts.bankroll')}
            </span>
          }
          key="bankroll"
        >
          <Card className="chart-card" style={{ background: '#1e293b', border: '1px solid #3b82f620', borderRadius: 12 }}>
            <ResponsiveContainer width="100%" height={420}>
              <LineChart data={bankroll} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="id" stroke="#94a3b8" fontSize={11} tickMargin={6} label={{ value: t('reports.axes.tournaments'), position: 'insideBottom', offset: -4, fill: '#e2e8f0', fontSize: 12, fontWeight: 600 }} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={formatAxis} label={{ value: t('reports.axes.bankroll'), angle: -90, position: 'insideLeft', offset: 10, fill: '#e2e8f0', fontSize: 12, fontWeight: 600 }} />
                <Tooltip content={({ active, payload, label }: any) => {
                  if (active && payload?.length) {
                    const d = bankroll[Number(label) - 1];
                    return (
                      <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '8px 12px', borderRadius: 8 }}>
                        <p style={{ color: '#e2e8f0', margin: 0, fontWeight: 600 }}>{d?.name}</p>
                        <p style={{ color: payload[0].color, margin: 0 }}>{t('reports.axes.bankroll')}: {formatChartValue(payload[0].value)}</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Line
                  type="monotone"
                  dataKey="bankroll"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3b82f6', stroke: '#3b82f6', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Panel>

        <Panel
          header={
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              <DollarOutlined style={{ marginRight: 8, color: '#f59e0b' }} />
              {t('reports.charts.expenses')}
            </span>
          }
          key="expenses"
        >
          <div style={{ marginTop: 8, marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Select
              mode="multiple"
              value={expenseTournamentFilter}
              onChange={setExpenseTournamentFilter}
              size="small"
              style={{ width: 360 }}
              placeholder={t('reports.expenses.allTournaments')}
              allowClear
              options={availableTournaments.map((t) => ({ value: t, label: t }))}
            />
          </div>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card className="stat-card" size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: 12 }}>{t('reports.expenses.sessionsPlayed')}</span>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{expenseStats.totalSessions}</div>
              </Card>
            </Col>
            <Col span={12}>
              <Card className="stat-card" size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: 12 }}>{t('reports.expenses.buyInCost')}</span>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{formatChartValue(expenseStats.totalBuyIn)}</div>
              </Card>
            </Col>
          </Row>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="small" onClick={() => setShowWorst(!showWorst)}>
              {showWorst ? t('reports.expenses.hideWorst') : t('reports.expenses.showWorst')} {t('reports.expenses.worstTitle')}
            </Button>
          </div>
          {showWorst && (
            <div style={{ marginTop: 12 }}>
              {worstTournaments.map((w, i) => (
                <Card key={w.name} size="small" style={{ marginBottom: 6, background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <span style={{ color: '#64748b', fontSize: 11 }}>#{i + 1}</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{w.name}</span>
                      <span style={{ color: '#64748b', fontSize: 11 }}>({w.count} {t('reports.expenses.games')})</span>
                    </Space>
                    <Space size={16}>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: 10, display: 'block' }}>{t('reports.expenses.buyIn')}</span>
                        <span style={{ fontSize: 13, color: '#e2e8f0' }}>{formatChartValue(w.buyIn)}</span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: 10, display: 'block' }}>{t('reports.expenses.profit')}</span>
                        <span style={{ color: w.profit >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 700, fontSize: 15 }}>{formatChartValue(w.profit)}</span>
                      </div>
                    </Space>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {expenseStats.breakdown.length > 0 && expenseTournamentFilter.length > 0 && (
            <div style={{ marginTop: 16 }}>
              {expenseStats.breakdown.map((b) => (
                <Card key={b.name} size="small" style={{ marginBottom: 8, background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{b.name}</span>
                    </div>
                    <Space size={16}>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: 11, display: 'block' }}>{t('reports.expenses.played')}</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>{b.count}</span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: 11, display: 'block' }}>{t('reports.expenses.cost')}</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b' }}>{formatChartValue(b.buyIn)}</span>
                      </div>
                    </Space>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Panel>
      </Collapse>
    </div>
  );
}
