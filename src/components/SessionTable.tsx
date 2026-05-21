import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Select, Space, Popconfirm, Button, Tooltip, Typography, Modal, InputNumber, Switch, Divider, DatePicker, message } from 'antd';
import { DeleteOutlined, EditOutlined, FileExcelOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { getAllSessions, getAllTournaments, getAllRooms, deleteSession, updateSession } from '../db/db';
import type { Session, Tournament, Room } from '../types';
import { convertToRub, convertToUsd, formatRub } from '../utils/currency';
import { useAppStore } from '../store/appStore';

const { Text } = Typography;

interface RowData {
  key: number;
  number: number;
  date: string;
  roomName: string;
  roomId: string;
  tournamentName: string;
  tournamentId: string;
  inPrize: boolean;
  backing: boolean;
  place: number;
  buyInRub: number;
  buyInDisplay: string;
  prizeRub: number;
  prizeDisplay: string;
  bountyRub: number;
  bountyDisplay: string;
  profitRub: number;
  profitUsd: number;
  profitDisplay: string;
  session: Session;
}

function computeRow(s: Session, tourMap: Map<string, Tournament>, roomMap: Map<string, Room>): RowData {
  const tour = tourMap.get(s.tournamentId);
  const room = tour ? roomMap.get(tour.roomId) : undefined;
  const buyInRub = tour ? convertToRub(tour.buyIn, tour.currency) : 0;
  const prizeRub = s.inPrize ? convertToRub(s.prize, s.prizeCurrency) : 0;
  const bountyRub = s.inPrize ? convertToRub(s.bountySum, s.bountyCurrency) : 0;
  const buyInUsd = tour ? convertToUsd(tour.buyIn, tour.currency) : 0;
  const prizeUsd = s.inPrize ? convertToUsd(s.prize, s.prizeCurrency) : 0;
  const bountyUsd = s.inPrize ? convertToUsd(s.bountySum, s.bountyCurrency) : 0;

  return {
    key: s.id,
    number: s.id,
    date: s.date,
    roomName: room?.name ?? '—',
    roomId: tour?.roomId ?? '',
    tournamentName: tour?.name ?? '—',
    tournamentId: s.tournamentId,
    inPrize: s.inPrize,
    backing: s.backing,
    place: s.place,
    buyInRub,
    buyInDisplay: tour ? `${tour.buyIn} ${tour.currency}` : '—',
    prizeRub,
    prizeDisplay: s.inPrize && s.prize > 0 ? `${s.prize} ${s.prizeCurrency}` : '—',
    bountyRub,
    bountyDisplay: s.inPrize && s.bountySum > 0 ? `${s.bountySum} ${s.bountyCurrency}` : '—',
    profitRub: prizeRub + bountyRub - buyInRub,
    profitUsd: prizeUsd + bountyUsd - buyInUsd,
    profitDisplay: tour?.currency === 'RUB'
      ? `${(prizeRub + bountyRub - buyInRub >= 0 ? '+' : '')}${Math.abs(prizeRub + bountyRub - buyInRub).toFixed(0)} ₽`
      : tour?.currency === 'EUR'
      ? `${(convertToUsd(s.prize, s.prizeCurrency) + convertToUsd(s.bountySum, s.bountyCurrency) - convertToUsd(tour.buyIn, tour.currency) >= 0 ? '+' : '')}${Math.abs(convertToUsd(s.prize, s.prizeCurrency) + convertToUsd(s.bountySum, s.bountyCurrency) - convertToUsd(tour.buyIn, tour.currency)).toFixed(2)} $`
      : `${(prizeUsd + bountyUsd - buyInUsd >= 0 ? '+' : '')}${Math.abs(prizeUsd + bountyUsd - buyInUsd).toFixed(2)} $`,
    session: s,
  };
}

export default function SessionTable() {
  const { t } = useTranslation();
  const { settings } = useAppStore();
  const MONTHS = [t('sessions.table.months.0'), t('sessions.table.months.1'), t('sessions.table.months.2'), t('sessions.table.months.3'), t('sessions.table.months.4'), t('sessions.table.months.5'), t('sessions.table.months.6'), t('sessions.table.months.7'), t('sessions.table.months.8'), t('sessions.table.months.9'), t('sessions.table.months.10'), t('sessions.table.months.11')];
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedYear, setSelectedYear] = useState<string | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const [selectedDay, setSelectedDay] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [filterRoomId, setFilterRoomId] = useState<string | undefined>(undefined);
  const [filterTournamentId, setFilterTournamentId] = useState<string | undefined>(undefined);

  const [editSession, setEditSession] = useState<Session | null>(null);
  const [editInPrize, setEditInPrize] = useState(false);
  const [editBacking, setEditBacking] = useState(false);
  const [editPlace, setEditPlace] = useState(0);
  const [editPrize, setEditPrize] = useState(0);
  const [editBounty, setEditBounty] = useState(0);
  const [editTournamentId, setEditTournamentId] = useState<string>('');
  const [editLoading, setEditLoading] = useState(false);

  const [inlineEdit, setInlineEdit] = useState<{ id: number; field: 'prize' | 'bounty' | 'place' } | null>(null);
  const [inlineVal, setInlineVal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const sortLocale = { triggerDesc: t('sessions.table.sortDesc'), triggerAsc: t('sessions.table.sortAsc'), cancelSort: t('sessions.table.cancelSort') };

  useEffect(() => { setCurrentPage(1); }, [dateRange, filterRoomId, filterTournamentId]);

  const load = async () => {
    const [s, t, r] = await Promise.all([getAllSessions(), getAllTournaments(), getAllRooms()]);
    setSessions(s);
    setTournaments(t);
    setRooms(r);
  };

  useEffect(() => { load(); }, []);

  const tourMap = useMemo(() => new Map(tournaments.map((t) => [t.id, t])), [tournaments]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  const filteredTournaments = useMemo(() => {
    return filterRoomId
      ? tournaments.filter((t) => t.roomId === filterRoomId)
      : tournaments;
  }, [tournaments, filterRoomId]);

  const allRows = useMemo(() => {
    let rows = sessions.map((s) => computeRow(s, tourMap, roomMap));
    if (dateRange?.[0] && dateRange?.[1]) {
      const start = dateRange[0].startOf('day');
      const end = dateRange[1].endOf('day');
      rows = rows.filter((r) => {
        const d = dayjs(r.session.date);
        return d.valueOf() >= start.valueOf() && d.valueOf() <= end.valueOf();
      });
    }
    if (filterRoomId) rows = rows.filter((r) => r.roomId === filterRoomId);
    if (filterTournamentId) rows = rows.filter((r) => r.tournamentId === filterTournamentId);
    return rows.sort((a, b) => dayjs(b.session.date).valueOf() - dayjs(a.session.date).valueOf());
  }, [sessions, tourMap, roomMap, dateRange, filterRoomId, filterTournamentId]);

  const yearOptions = useMemo(() => {
    const years = new Set(allRows.map((r) => dayjs(r.session.date).format('YYYY')));
    return Array.from(years).sort((a, b) => b.localeCompare(a)).map((y) => ({ value: y, label: y }));
  }, [allRows]);

  const monthOptions = useMemo(() => {
    if (!selectedYear) return [];
    const months = new Set<number>();
    for (const r of allRows) {
      const d = dayjs(r.session.date);
      if (d.format('YYYY') === selectedYear) months.add(d.month());
    }
    return Array.from(months).sort((a, b) => b - a).map((m) => ({ value: m, label: MONTHS[m] }));
  }, [allRows, selectedYear]);

  const dayOptions = useMemo(() => {
    if (!selectedYear || selectedMonth === undefined) return [];
    const days = new Set<string>();
    for (const r of allRows) {
      const d = dayjs(r.session.date);
      if (d.format('YYYY') === selectedYear && d.month() === selectedMonth) days.add(d.format('DD'));
    }
    return Array.from(days).sort((a, b) => b.localeCompare(a)).map((d) => ({ value: d, label: d }));
  }, [allRows, selectedYear, selectedMonth]);

  const filteredRows = useMemo(() => {
    if (!selectedYear || selectedMonth === undefined || !selectedDay) return [];
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${selectedDay}`;
    return allRows.filter((r) => r.session.date === dateStr);
  }, [allRows, selectedYear, selectedMonth, selectedDay]);

  const selectedDateStr = selectedYear && selectedMonth !== undefined && selectedDay
    ? `${selectedDay}.${String(selectedMonth + 1).padStart(2, '0')}.${selectedYear}`
    : '';

  const todayStr = useMemo(() => dayjs().format('YYYY-MM-DD'), []);
  const todayRows = useMemo(() =>
    allRows.filter((r) => r.session.date === todayStr && (r.place > 0 || r.session.inPrize)),
  [allRows, todayStr]);
  const todayProfitUsd = useMemo(() => todayRows.reduce((s, r) => s + r.profitUsd, 0), [todayRows]);
  const todayProfitRub = useMemo(() => todayRows.reduce((s, r) => s + r.profitRub, 0), [todayRows]);
  const todayProfitDisplay = useMemo(() => todayRows.length > 0
    ? `${(todayProfitUsd >= 0 ? '+' : '')}${todayProfitUsd.toFixed(2)}$`
    : '', [todayRows, todayProfitUsd]);

  const handleDelete = async (id: number) => {
    await deleteSession(id);
    await load();
  };

  const openEdit = (row: RowData) => {
    setEditSession(row.session);
    setEditInPrize(row.session.inPrize);
    setEditBacking(row.session.backing);
    setEditPlace(row.session.place);
    setEditPrize(row.session.prize);
    setEditBounty(row.session.bountySum);
    setEditTournamentId(row.session.tournamentId);
  };

  const handleEditSave = async () => {
    if (!editSession) return;
    setEditLoading(true);
    try {
      await updateSession(editSession.id, {
        inPrize: editInPrize,
        backing: editBacking,
        place: editPlace,
        prize: editPrize,
        bountySum: editBounty,
        tournamentId: editTournamentId,
      });
      setEditSession(null);
      await load();
    } finally {
      setEditLoading(false);
    }
  };

  const saveInline = async (id: number, field: 'prize' | 'bounty' | 'place', value: number) => {
    const s = sessions.find((x) => x.id === id);
    if (!s) return;
    if (field === 'place') {
      await updateSession(id, { place: value });
    } else if (field === 'prize') {
      await updateSession(id, { prize: value, inPrize: value > 0 || s.bountySum > 0 });
    } else {
      await updateSession(id, { bountySum: value, inPrize: s.prize > 0 || value > 0 });
    }
    setInlineEdit(null);
    await load();
  };

  const backers = settings.backers || [];
  const backerMap = useMemo(() => new Map(backers.map((b) => [b.id, b.name])), [backers]);

  const exportRows = useMemo(() => {
    const data = selectedDay ? filteredRows : todayRows.length > 0 ? todayRows : allRows;
    return data.length > 0 ? data : allRows;
  }, [allRows, todayRows, filteredRows, selectedDay]);

  const handleExportExcel = () => {
    try {
      const rows = exportRows.map((r) => ({
        [t('sessions.table.columns.room')]: r.roomName,
        [t('sessions.table.columns.tournament')]: r.tournamentName,
        [t('sessions.table.columns.buyIn')]: r.buyInDisplay,
        [t('sessions.table.columns.place')]: r.place > 0 ? r.place : '—',
        [t('sessions.table.columns.prize')]: r.prizeDisplay,
        [t('sessions.table.columns.bounty')]: r.bountyDisplay,
        [t('sessions.table.columns.backing')]: r.backing ? t('sessionForm.backing.yes') : t('sessionForm.backing.no'),
        'Profit': r.profitDisplay,
        'Date': r.date,
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Sessions');
      XLSX.writeFile(wb, `poker-diary-sessions-${new Date().toISOString().slice(0, 10)}.xlsx`);
      message.success(t('faq.messages.excelExported'));
    } catch {
      message.error(t('faq.messages.excelError'));
    }
  };

  const handleExportJson = () => {
    try {
      const rows = exportRows.map((r) => ({
        date: r.date,
        room: r.roomName,
        tournament: r.tournamentName,
        buyIn: r.buyInDisplay,
        place: r.place,
        inPrize: r.inPrize,
        backing: r.backing,
        backer: r.session.backerId ? (backerMap.get(r.session.backerId) || r.session.backerId) : null,
        prize: r.session.inPrize ? r.session.prize : 0,
        prizeCurrency: r.session.prizeCurrency,
        bounty: r.session.inPrize ? r.session.bountySum : 0,
        bountyCurrency: r.session.bountyCurrency,
        profitRub: r.profitRub,
        profitUsd: r.profitUsd,
      }));
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `poker-diary-sessions-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(t('faq.messages.exported'));
    } catch {
      message.error(t('faq.messages.excelError'));
    }
  };

  const makeColumns = () => [
    { title: '#', dataIndex: 'number', key: 'number', width: 50, sorter: (a: RowData, b: RowData) => a.number - b.number },
    { title: t('sessions.table.columns.room'), dataIndex: 'roomName', key: 'roomName', width: 100, sorter: (a: RowData, b: RowData) => a.roomName.localeCompare(b.roomName) },
    { title: t('sessions.table.columns.tournament'), dataIndex: 'tournamentName', key: 'tournamentName', width: 180, sorter: (a: RowData, b: RowData) => a.tournamentName.localeCompare(b.tournamentName) },
    { title: t('sessions.table.columns.buyIn'), dataIndex: 'buyInDisplay', key: 'buyInDisplay', width: 80, sorter: (a: RowData, b: RowData) => a.buyInRub - b.buyInRub },
    {
      title: t('sessions.table.columns.place'), key: 'place', width: 80, sorter: (a: RowData, b: RowData) => a.place - b.place,
      render: (_: unknown, record: RowData) => {
        if (inlineEdit?.id === record.session.id && inlineEdit?.field === 'place') {
          return (
            <InputNumber
              size="small"
              value={inlineVal}
              onChange={(v) => setInlineVal(v ?? 0)}
              onBlur={() => saveInline(record.session.id, 'place', inlineVal)}
              onPressEnter={() => saveInline(record.session.id, 'place', inlineVal)}
              autoFocus
              style={{ width: 70 }}
              min={0}
            />
          );
        }
        return (
          <span
            onClick={() => { setInlineEdit({ id: record.session.id, field: 'place' }); setInlineVal(record.session.place); }}
            style={{ cursor: 'pointer', borderBottom: '1px dashed #64748b', padding: '0 4px' }}
          >
            {record.place > 0 ? record.place : '—'}
          </span>
        );
      },
    },
    {
      title: t('sessions.table.columns.inPrize'), key: 'inPrize', width: 80, sorter: (a: RowData, b: RowData) => Number(a.inPrize) - Number(b.inPrize),
      render: (_: unknown, record: RowData) => (
        <Switch
          size="small"
          checked={record.inPrize}
          style={{ backgroundColor: record.inPrize ? '#52c41a' : undefined }}
          onChange={async (checked) => {
            await updateSession(record.session.id, {
              inPrize: checked,
              place: checked ? record.session.place : 0,
              prize: checked ? record.session.prize : 0,
              bountySum: checked ? record.session.bountySum : 0,
            });
            await load();
          }}
        />
      ),
    },
    {
      title: t('sessions.table.columns.backing'), key: 'backing', width: 80, sorter: (a: RowData, b: RowData) => Number(a.backing) - Number(b.backing),
      render: (_: unknown, record: RowData) => (
        <Switch
          size="small"
          checked={record.backing}
          style={{ backgroundColor: record.backing ? '#f59e0b' : undefined }}
          onChange={async (checked) => {
            await updateSession(record.session.id, { backing: checked });
            await load();
          }}
        />
      ),
    },
    {
      title: t('sessions.table.columns.prize'), key: 'prize', width: 90, sorter: (a: RowData, b: RowData) => a.prizeRub - b.prizeRub,
      render: (_: unknown, record: RowData) => {
        if (inlineEdit?.id === record.session.id && inlineEdit?.field === 'prize') {
          return (
            <InputNumber
              size="small"
              value={inlineVal}
              onChange={(v) => setInlineVal(v ?? 0)}
              onBlur={() => saveInline(record.session.id, 'prize', inlineVal)}
              onPressEnter={() => saveInline(record.session.id, 'prize', inlineVal)}
              autoFocus
              style={{ width: 80 }}
              min={0}
            />
          );
        }
        return (
          <span
            onClick={() => { setInlineEdit({ id: record.session.id, field: 'prize' }); setInlineVal(record.session.prize); }}
            style={{ cursor: 'pointer', borderBottom: '1px dashed #64748b', padding: '0 4px' }}
          >
            {record.prizeDisplay}
          </span>
        );
      },
    },
    {
      title: t('sessions.table.columns.bounty'), key: 'bounty', width: 80, sorter: (a: RowData, b: RowData) => a.bountyRub - b.bountyRub,
      render: (_: unknown, record: RowData) => {
        if (inlineEdit?.id === record.session.id && inlineEdit?.field === 'bounty') {
          return (
            <InputNumber
              size="small"
              value={inlineVal}
              onChange={(v) => setInlineVal(v ?? 0)}
              onBlur={() => saveInline(record.session.id, 'bounty', inlineVal)}
              onPressEnter={() => saveInline(record.session.id, 'bounty', inlineVal)}
              autoFocus
              style={{ width: 80 }}
              min={0}
            />
          );
        }
        return (
          <span
            onClick={() => { setInlineEdit({ id: record.session.id, field: 'bounty' }); setInlineVal(record.session.bountySum); }}
            style={{ cursor: 'pointer', borderBottom: '1px dashed #64748b', padding: '0 4px' }}
          >
            {record.bountyDisplay}
          </span>
        );
      },
    },
    {
      title: 'Profit', key: 'profitUsd', width: 130,
      sorter: (a: RowData, b: RowData) => a.profitUsd - b.profitUsd,
      render: (_: unknown, record: RowData) => (
        <span style={{ color: record.profitDisplay.startsWith('+') ? '#52c41a' : '#ff4d4f', fontWeight: 600, fontSize: 13 }}>
          {record.profitDisplay}
        </span>
      ),
    },
    {
      title: '', key: 'actions', width: 70,
      render: (_: unknown, record: RowData) => (
        <Space>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title={t('sessions.table.deleteConfirm')} onConfirm={() => handleDelete(record.session.id)}>
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Filters */}
      <div className="filter-bar" style={{
        marginBottom: 16, padding: '12px 16px', borderRadius: 8,
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
      }}>
        <Select placeholder={t('sessions.table.filters.room')} allowClear style={{ width: 150 }} value={filterRoomId} onChange={(v) => { setFilterRoomId(v); setFilterTournamentId(undefined); }}>
          {rooms.map((r) => (
            <Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>
          ))}
        </Select>
        <Select placeholder={t('sessions.table.filters.tournament')} allowClear style={{ width: 200 }} value={filterTournamentId}
          onChange={setFilterTournamentId} showSearch optionFilterProp="label">
          {filteredTournaments.map((t) => (
            <Select.Option key={t.id} value={t.id} label={t.name}>{t.name}</Select.Option>
          ))}
        </Select>
      </div>

      {/* Calendar selector */}
      <div className="filter-bar" style={{
        marginBottom: 16, padding: '12px 16px', borderRadius: 8,
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
      }}>
        <Text className="filter-label" style={{ fontSize: 14 }}>{t('sessions.table.filters.day')}</Text>
        <DatePicker
          format="DD.MM.YYYY"
          style={{ width: 160 }}
          value={selectedYear && selectedMonth !== undefined && selectedDay ? dayjs(`${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${selectedDay}`) : null}
          onChange={(d) => {
            if (d) {
              setSelectedYear(d.format('YYYY'));
              setSelectedMonth(d.month());
              setSelectedDay(d.format('DD'));
            } else {
              setSelectedYear(undefined);
              setSelectedMonth(undefined);
              setSelectedDay(undefined);
            }
          }}
          allowClear
        />
        <Select
          placeholder={t('sessions.table.filters.year')}
          style={{ width: 120 }}
          value={selectedYear}
          onChange={(v) => { setSelectedYear(v); setSelectedMonth(undefined); setSelectedDay(undefined); }}
          options={yearOptions}
        />
        <Select
          placeholder={t('sessions.table.filters.month')}
          style={{ width: 160 }}
          value={selectedMonth}
          onChange={(v) => { setSelectedMonth(v); setSelectedDay(undefined); }}
          options={monthOptions}
          disabled={!selectedYear}
        />
        <Select
          placeholder={t('sessions.table.filters.dayPlaceholder')}
          style={{ width: 100 }}
          value={selectedDay}
          onChange={setSelectedDay}
          options={dayOptions}
          disabled={!selectedYear || selectedMonth === undefined}
        />
        {selectedDateStr && (
          <Text style={{ color: '#3b82f6', fontWeight: 600, fontSize: 14 }}>{selectedDateStr}</Text>
        )}
        {selectedDay && (
          <Button size="small" onClick={() => { setSelectedYear(undefined); setSelectedMonth(undefined); setSelectedDay(undefined); }}>
            {t('sessions.table.filters.reset')}
          </Button>
        )}
      </div>

      {/* Date range filter */}
      <div className="filter-bar" style={{
        marginBottom: 16, padding: '12px 16px', borderRadius: 8,
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
      }}>
        <Text className="filter-label" style={{ fontSize: 14 }}>{t('sessions.table.filters.range')}</Text>
        <DatePicker.RangePicker
          format="DD.MM.YYYY"
          value={dateRange}
          onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
          allowClear
          style={{ width: 280 }}
        />
        {dateRange && (
          <Button size="small" onClick={() => setDateRange(null)}>{t('sessions.table.filters.reset')}</Button>
        )}
      </div>

      {allRows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
          <Text type="secondary" style={{ fontSize: 16 }}>
            {t('sessions.table.empty')}
          </Text>
        </div>
      ) : (
        <>
          {todayRows.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                background: 'linear-gradient(90deg, #3b82f620, #3b82f608)',
                padding: '8px 16px', borderRadius: 8, marginBottom: 8,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <Text strong style={{ color: '#3b82f6', fontSize: 16 }}>{t('sessions.table.today')} ({todayStr})</Text>
                <Space size={8}>
                  <Text type="secondary">{todayRows.length}</Text>
                  <Text style={{ color: todayProfitUsd >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600, fontSize: 14 }}>
                    {(todayProfitUsd >= 0 ? '+' : '') + todayProfitUsd.toFixed(2) + '$'} | {formatRub(Math.abs(todayProfitRub))}
                  </Text>
                </Space>
              </div>
              <Table dataSource={todayRows} columns={makeColumns()} rowKey="key" pagination={false} size="small" locale={sortLocale} />
            </div>
          )}

          {filteredRows.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                padding: '8px 16px', borderRadius: 8, marginBottom: 8,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid #334155',
              }}>
                <Text strong style={{ fontSize: 15 }}>{t('sessions.table.sessionsFor')} {selectedDateStr}</Text>
                <Space size={8}>
                  <Text type="secondary">{filteredRows.length}</Text>
                  <Text style={{ color: filteredRows.reduce((s, r) => s + r.profitUsd, 0) >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600, fontSize: 14 }}>
                    {(filteredRows.reduce((s, r) => s + r.profitUsd, 0) >= 0 ? '+' : '') + filteredRows.reduce((s, r) => s + r.profitUsd, 0).toFixed(2) + '$'}
                  </Text>
                </Space>
              </div>
              <Table dataSource={filteredRows} columns={makeColumns()} rowKey="key" pagination={false} size="small" locale={sortLocale} />
            </div>
          )}
          {!selectedDay && todayRows.length === 0 && allRows.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                padding: '8px 16px', borderRadius: 8, marginBottom: 8,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid #334155',
              }}>
                <Text strong style={{ fontSize: 15 }}>{t('sessions.table.allSessions')}</Text>
                <Space size={8}>
                  <Text type="secondary">{allRows.length}</Text>
                  <Text style={{ color: allRows.reduce((s, r) => s + r.profitUsd, 0) >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600, fontSize: 14 }}>
                    {(allRows.reduce((s, r) => s + r.profitUsd, 0) >= 0 ? '+' : '') + allRows.reduce((s, r) => s + r.profitUsd, 0).toFixed(2) + '$'}
                  </Text>
                </Space>
              </div>
              <Table dataSource={allRows} columns={makeColumns()} rowKey="key" pagination={{ current: currentPage, pageSize, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], showTotal: (total) => `${t('sessions.table.total')} ${total}`, onChange: (p, ps) => { setCurrentPage(p); setPageSize(ps); } }} size="small" locale={sortLocale} />
            </div>
          )}

          <div className="filter-bar" style={{
            marginTop: 16, padding: '8px 16px', borderRadius: 8,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Space>
              <Text strong>{t('sessions.table.summary')} ({allRows.length})</Text>
              <Tooltip title={t('sessions.table.export.excel')}>
                <Button type="text" size="small" icon={<FileExcelOutlined />} onClick={handleExportExcel} style={{ color: '#52c41a' }} />
              </Tooltip>
              <Tooltip title={t('sessions.table.export.json')}>
                <Button type="text" size="small" icon={<DownloadOutlined />} onClick={handleExportJson} />
              </Tooltip>
            </Space>
            <Text style={{ color: allRows.reduce((s, r) => s + r.profitUsd, 0) >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600, fontSize: 15 }}>
              {(allRows.reduce((s, r) => s + r.profitUsd, 0) >= 0 ? '+' : '') + allRows.reduce((s, r) => s + r.profitUsd, 0).toFixed(2) + '$'} | {formatRub(Math.abs(allRows.reduce((s, r) => s + r.profitRub, 0)))}
            </Text>
          </div>
        </>
      )}

      <Modal
        title={t('sessions.table.edit.title')}
        open={!!editSession}
        onCancel={() => setEditSession(null)}
        onOk={handleEditSave}
        confirmLoading={editLoading}
        okText={t('sessions.table.edit.save')}
        cancelText={t('sessions.table.edit.cancel')}
        destroyOnHidden
      >
        {editSession && (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <div>
              <Text type="secondary">{t('sessions.table.edit.tournament')}</Text>
              <Select
                value={editTournamentId}
                onChange={(v) => setEditTournamentId(v)}
                style={{ width: '100%' }}
                showSearch
                optionFilterProp="label"
                options={tournaments.map((t) => ({ value: t.id, label: t.name }))}
              />
            </div>
            <div>
              <Text type="secondary">{t('sessions.table.edit.placeLabel')}</Text>
              <InputNumber min={0} value={editPlace} onChange={(v) => setEditPlace(v ?? 0)} style={{ width: '100%' }} placeholder={t('sessions.table.edit.placeInput')} />
            </div>
            <div>
              <Text type="secondary">{t('sessions.table.edit.inPrizeLabel')}</Text>
              <div style={{ marginTop: 4 }}>
                <Switch checked={editInPrize} onChange={setEditInPrize} style={{ backgroundColor: editInPrize ? '#52c41a' : undefined }} />
              </div>
            </div>
            <div>
              <Text type="secondary">{t('sessions.table.edit.backingLabel')}</Text>
              <div style={{ marginTop: 4 }}>
                <Switch checked={editBacking} onChange={setEditBacking} style={{ backgroundColor: editBacking ? '#f59e0b' : undefined }} />
              </div>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div>
              <Text type="secondary">{t('sessions.table.edit.prizeLabel')}</Text>
              <InputNumber min={0} value={editPrize} onChange={(v) => setEditPrize(v ?? 0)} style={{ width: '100%' }} placeholder={t('sessions.table.edit.prizeInput')} />
            </div>
            <div>
              <Text type="secondary">{t('sessions.table.edit.bountyLabel')}</Text>
              <InputNumber min={0} value={editBounty} onChange={(v) => setEditBounty(v ?? 0)} style={{ width: '100%' }} placeholder={t('sessions.table.edit.bountyInput')} />
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
}
