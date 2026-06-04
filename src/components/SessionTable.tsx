import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Select, Space, Popconfirm, Button, Tooltip, Typography, Modal, InputNumber, Switch, Divider, DatePicker, Collapse, message } from 'antd';
import { DeleteOutlined, EditOutlined, FileExcelOutlined, DownloadOutlined, CheckCircleOutlined, CopyOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { getAllSessions, getAllTournaments, getAllRooms, getAllGameSessions, deleteSession, updateSession, addSession } from '../db/db';
import type { Session, Tournament, Room, GameSession } from '../types';
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
  tournamentType?: string;
  color?: string;
  inPrize: boolean;
  backing: boolean;
  place: number;
  buyInRub: number;
  buyInUsd: number;
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
  const prizeRub = s.prize > 0 ? convertToRub(s.prize, s.prizeCurrency) : 0;
  const bountyRub = s.bountySum > 0 ? convertToRub(s.bountySum, s.bountyCurrency) : 0;
  const buyInUsd = tour ? convertToUsd(tour.buyIn, tour.currency) : 0;
  const prizeUsd = s.prize > 0 ? convertToUsd(s.prize, s.prizeCurrency) : 0;
  const bountyUsd = s.bountySum > 0 ? convertToUsd(s.bountySum, s.bountyCurrency) : 0;

  return {
    key: s.id,
    number: s.id,
    date: s.date,
    roomName: room?.name ?? '—',
    roomId: tour?.roomId ?? '',
    tournamentName: tour?.name ?? '—',
    tournamentId: s.tournamentId,
    tournamentType: tour?.type,
    color: tour?.color,
    inPrize: s.inPrize,
    backing: s.backing,
    place: s.place,
    buyInRub,
    buyInUsd,
    buyInDisplay: tour ? `${tour.buyIn} ${tour.currency}` : '—',
    prizeRub,
    prizeDisplay: s.prize > 0 ? `${s.prize} ${s.prizeCurrency}` : '—',
    bountyRub,
    bountyDisplay: s.bountySum > 0 ? `${s.bountySum} ${s.bountyCurrency}` : '—',
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

interface Props {
  currentSession?: GameSession | null;
}

export default function SessionTable({ currentSession }: Props) {
  const { t } = useTranslation();
  const { settings } = useAppStore();
  const MONTHS = [t('sessions.table.months.0'), t('sessions.table.months.1'), t('sessions.table.months.2'), t('sessions.table.months.3'), t('sessions.table.months.4'), t('sessions.table.months.5'), t('sessions.table.months.6'), t('sessions.table.months.7'), t('sessions.table.months.8'), t('sessions.table.months.9'), t('sessions.table.months.10'), t('sessions.table.months.11')];
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [gameSessions, setGameSessions] = useState<GameSession[]>([]);
  const [selectedYear, setSelectedYear] = useState<string | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const [selectedDay, setSelectedDay] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [filterRoomId, setFilterRoomId] = useState<string | undefined>(undefined);
  const [filterTournamentId, setFilterTournamentId] = useState<string | undefined>(undefined);
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [filterLevel, setFilterLevel] = useState<string | undefined>(undefined);

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

  useEffect(() => { setCurrentPage(1); }, [dateRange, filterRoomId, filterTournamentId, filterType, filterLevel]);

  const load = async () => {
    const [s, t, r, gs] = await Promise.all([getAllSessions(), getAllTournaments(), getAllRooms(), getAllGameSessions()]);
    setSessions(s);
    setTournaments(t);
    setRooms(r);
    setGameSessions(gs);
  };

  useEffect(() => { load(); }, []);

  const tourMap = useMemo(() => new Map(tournaments.map((t) => [t.id, t])), [tournaments]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  const filteredTournaments = useMemo(() => {
    let list = tournaments;
    if (filterRoomId) list = list.filter((t) => t.roomId === filterRoomId);
    if (filterType) list = list.filter((t) => t.type === filterType);
    if (filterLevel) list = list.filter((t) => t.color === filterLevel);
    return list;
  }, [tournaments, filterRoomId, filterType, filterLevel]);

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
    if (filterType) rows = rows.filter((r) => r.tournamentType === filterType);
    if (filterLevel) rows = rows.filter((r) => r.color === filterLevel);
    return rows.sort((a, b) => dayjs(b.session.date).valueOf() - dayjs(a.session.date).valueOf());
  }, [sessions, tourMap, roomMap, dateRange, filterRoomId, filterTournamentId, filterType, filterLevel]);

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
  const archivedSessionIds = useMemo(() => new Set(gameSessions.filter((gs) => gs.archived).map((gs) => gs.id)), [gameSessions]);
  const hasArchivedSessionsWithRows = useMemo(() => {
    return gameSessions.filter((gs) => gs.archived).some((gs) => allRows.some((r) => r.session.sessionId === gs.id));
  }, [gameSessions, allRows]);
  const hasNonArchivedRows = useMemo(() => {
    return allRows.some((r) => !r.session.sessionId || !archivedSessionIds.has(r.session.sessionId));
  }, [allRows, archivedSessionIds]);
  const sessionRows = useMemo(() => {
    if (currentSession) return allRows.filter((r) => r.session.sessionId === currentSession.id);
    return allRows.filter((r) => r.session.date === todayStr && !(r.session.sessionId && archivedSessionIds.has(r.session.sessionId)));
  }, [allRows, currentSession, todayStr, archivedSessionIds]);
  const todayProfitUsd = useMemo(() => sessionRows.reduce((s, r) => s + r.profitUsd, 0), [sessionRows]);
  const todayProfitRub = useMemo(() => sessionRows.reduce((s, r) => s + r.profitRub, 0), [sessionRows]);
  const todayBuyInRub = useMemo(() => sessionRows.reduce((s, r) => s + r.buyInRub, 0), [sessionRows]);
  const todayBuyInUsd = useMemo(() => sessionRows.reduce((s, r) => s + r.buyInUsd, 0), [sessionRows]);
  const todayActiveRows = useMemo(() => sessionRows.filter((r) => r.session.place === 0), [sessionRows]);
  const todayPlayedRows = useMemo(() => sessionRows.filter((r) => r.session.place > 0), [sessionRows]);
  const todayProfitDisplay = useMemo(() => sessionRows.length > 0
    ? `${(todayProfitUsd >= 0 ? '+' : '')}${todayProfitUsd.toFixed(2)}$`
    : '', [sessionRows, todayProfitUsd]);

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
      await updateSession(id, { prize: value });
    } else {
      await updateSession(id, { bountySum: value });
    }
    setInlineEdit(null);
    await load();
  };

  const handleFinish = async (s: Session) => {
    if (s.place === 0) return;
    const inPrize = s.prize > 0 || s.bountySum > 0;
    await updateSession(s.id, { inPrize });
    message.success(t('sessions.page.ended', { count: 1 }));
    await load();
  };

  const handlePlayAgain = async (s: Session) => {
    await addSession({
      tournamentId: s.tournamentId,
      date: dayjs().format('YYYY-MM-DD'),
      inPrize: false,
      backing: s.backing,
      backerId: s.backerId,
      place: 0,
      prize: 0,
      prizeCurrency: s.prizeCurrency,
      bountySum: 0,
      bountyCurrency: s.bountyCurrency,
      createdAt: new Date().toISOString(),
    });
    message.success(t('sessions.page.reEntrySuccess'));
    await load();
  };

  const backers = settings.backers || [];
  const backerMap = useMemo(() => new Map(backers.map((b) => [b.id, b.name])), [backers]);

  const exportRows = useMemo(() => {
    const data = selectedDay ? filteredRows : sessionRows.length > 0 ? sessionRows : allRows;
    return data.length > 0 ? data : allRows;
  }, [allRows, sessionRows, filteredRows, selectedDay]);

  const handleExportExcel = () => {
    try {
      const rows = exportRows.map((r) => ({
        [t('sessions.table.columns.room')]: r.roomName,
        [t('sessions.table.columns.tournament')]: r.tournamentName,
        'Type': r.tournamentType || '—',
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
        type: r.tournamentType || null,
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
    {
      title: t('sessions.table.columns.tournament'), key: 'tournament', width: 220,
      sorter: (a: RowData, b: RowData) => a.tournamentName.localeCompare(b.tournamentName),
      render: (_: unknown, record: RowData) => (
        <Space size={4} wrap>
          {record.color && <div style={{ width: 10, height: 10, borderRadius: '50%', background: record.color, display: 'inline-block' }} />}
          <span>{record.tournamentName}</span>
        </Space>
      ),
    },
    {
      title: 'Тип', dataIndex: 'tournamentType', key: 'type', width: 100,
      sorter: (a: RowData, b: RowData) => (a.tournamentType || '').localeCompare(b.tournamentType || ''),
      render: (_: unknown, record: RowData) => (
        record.tournamentType
          ? <span style={{ fontSize: 11, color: '#d4a843', border: '1px solid #d4a84340', borderRadius: 4, padding: '0 6px' }}>{record.tournamentType}</span>
          : <span style={{ fontSize: 11, color: '#64748b' }}>—</span>
      ),
    },
    { title: t('sessions.table.columns.buyIn'), dataIndex: 'buyInDisplay', key: 'buyInDisplay', width: 80, sorter: (a: RowData, b: RowData) => a.buyInRub - b.buyInRub },
    {
      title: t('sessions.table.columns.place'), key: 'place', width: 80, align: 'center' as const, sorter: (a: RowData, b: RowData) => a.place - b.place,
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
              style={{ width: 70, textAlign: 'center' }}
              min={0}
            />
          );
        }
        return (
          <span
            onClick={() => { setInlineEdit({ id: record.session.id, field: 'place' }); setInlineVal(record.session.place); }}
            style={{
              cursor: 'pointer', padding: '0 4px',
              color: record.inPrize && record.place > 9 ? '#f97316' : record.place >= 4 && record.place <= 9 ? '#22c55e' : undefined,
              fontWeight: record.place >= 1 ? 600 : undefined,
            }}
          >
            {record.place > 0
              ? record.place >= 1 && record.place <= 3
                ? <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: '#0D0F14', fontWeight: 700, fontSize: 14 }}>{record.place}</span>
                : record.place
              : '—'}
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
          style={{ backgroundColor: record.inPrize ? 'var(--color-profit)' : undefined }}
          onChange={async (checked) => {
            await updateSession(record.session.id, { inPrize: checked });
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
        <span style={{ color: record.profitDisplay.startsWith('+') ? 'var(--color-profit)' : 'var(--color-loss)', fontWeight: 600, fontSize: 13 }}>
          {record.profitDisplay}
        </span>
      ),
    },
    {
      title: '', key: 'actions', width: 160,
      render: (_: unknown, record: RowData) => (
        <Space size={2}>
          <Tooltip title={record.session.place === 0 ? t('sessions.actions.finishDisabled') : t('sessions.actions.completed')}>
            <Button
              type="text"
              size="small"
              disabled={record.session.place === 0}
              icon={<CheckCircleOutlined style={{ color: record.session.place === 0 ? undefined : 'var(--color-profit)' }} />}
              onClick={() => handleFinish(record.session)}
            />
          </Tooltip>
          <Tooltip title={t('sessions.actions.playAgain')}>
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => handlePlayAgain(record.session)} />
          </Tooltip>
          <Tooltip title={t('sessions.table.edit.title')}>
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm title={t('sessions.table.deleteConfirm')} onConfirm={() => handleDelete(record.session.id)}>
            <Tooltip title={t('sessions.table.deleteConfirm')}>
              <Button type="text" danger size="small" icon={<DeleteOutlined />} />
            </Tooltip>
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
        <Select placeholder="Тип" allowClear style={{ width: 150 }} value={filterType} onChange={setFilterType}>
          {Array.from(new Set(tournaments.map((t) => t.type).filter(Boolean))).sort().map((type) => (
            <Select.Option key={type} value={type}>{type}</Select.Option>
          ))}
        </Select>
        <Select placeholder="Уровень" allowClear style={{ width: 130 }} value={filterLevel} onChange={setFilterLevel}>
          <Select.Option value="#ef4444"><Space size={4}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />Hard</Space></Select.Option>
          <Select.Option value="#eab308"><Space size={4}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#eab308', display: 'inline-block' }} />Medium</Space></Select.Option>
          <Select.Option value="#22c55e"><Space size={4}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />High</Space></Select.Option>
          <Select.Option value="#3b82f6"><Space size={4}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />Top</Space></Select.Option>
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
          {sessionRows.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              {currentSession && (
                <div style={{ padding: '4px 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text strong style={{ fontSize: 15 }}>{t('sessions.table.sessionLabel')} #{currentSession.number}</Text>
                </div>
              )}
              {todayActiveRows.length > 0 && (
                <div style={{ marginBottom: todayPlayedRows.length > 0 ? 16 : 0 }}>
                  <Collapse
                    ghost
                    defaultActiveKey={['active']}
                    items={[{
                      key: 'active',
                      label: (
                        <Space>
                          <Text strong style={{ fontSize: 15 }}>{t('sessions.table.inPlay')}</Text>
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            {t('sessions.table.total')} {sessionRows.length}
                          </Text>
                          <Text type="warning" style={{ fontSize: 13 }}>
                            {t('sessions.page.activeCount', { count: todayActiveRows.length })}
                          </Text>
                          <Text style={{ color: 'var(--color-profit)', fontSize: 13 }}>
                            {t('sessions.page.completedCount', { count: todayPlayedRows.length })}
                          </Text>
                          <div style={{ width: 1, height: 16, background: '#334155' }} />
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            {t('sessions.page.totalBuyIn')} {todayBuyInUsd.toFixed(2)}$
                          </Text>
                          <div style={{ width: 1, height: 16, background: '#334155' }} />
                          <Text style={{ color: todayProfitUsd >= 0 ? 'var(--color-profit)' : 'var(--color-loss)', fontWeight: 600, fontSize: 14 }}>
                            {t('sessions.page.profitLabel')} {(todayProfitUsd >= 0 ? '+' : '') + todayProfitUsd.toFixed(2) + '$'}
                          </Text>
                        </Space>
                      ),
                      children: <Table dataSource={todayActiveRows} columns={makeColumns()} rowKey="key" pagination={false} size="small" locale={sortLocale} />,
                    }]}
                  />
                </div>
              )}
              {todayPlayedRows.length > 0 && (
                <Collapse
                  ghost
                  defaultActiveKey={[]}
                  items={[{
                    key: 'played',
                    label: (
                      <Space>
                        <Text strong style={{ fontSize: 15 }}>{t('sessions.table.playedToday')}</Text>
                        <Text type="secondary">{todayPlayedRows.length}</Text>
                        <Text style={{ color: todayPlayedRows.reduce((s, r) => s + r.profitUsd, 0) >= 0 ? 'var(--color-profit)' : 'var(--color-loss)', fontWeight: 600, fontSize: 14 }}>
                          {(todayPlayedRows.reduce((s, r) => s + r.profitUsd, 0) >= 0 ? '+' : '') + todayPlayedRows.reduce((s, r) => s + r.profitUsd, 0).toFixed(2) + '$'}
                        </Text>
                      </Space>
                    ),
                    children: <Table dataSource={todayPlayedRows} columns={makeColumns()} rowKey="key" pagination={false} size="small" locale={sortLocale} />,
                  }]}
                />
              )}
            </div>
          )}

          {!selectedDay && gameSessions.filter((gs) => gs.archived).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              {gameSessions.filter((gs) => gs.archived).sort((a, b) => b.number - a.number).map((gs) => {
                const gsRows = allRows.filter((r) => r.session.sessionId === gs.id);
                if (gsRows.length === 0) return null;
                const gsProfit = gsRows.reduce((s, r) => s + r.profitUsd, 0);
                const gsBuyIn = gsRows.reduce((s, r) => s + r.buyInUsd, 0);
                const dateRangeStr = gs.endDate
                  ? `${dayjs(gs.startDate).format('DD.MM')} - ${dayjs(gs.endDate).format('DD.MM')}`
                  : dayjs(gs.startDate).format('DD.MM.YYYY');
                return (
                  <div key={gs.id} style={{ marginBottom: 12 }}>
                    <div style={{ padding: '8px 16px', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
                      <Space>
                        <Text strong style={{ fontSize: 15 }}>{t('sessions.table.sessionLabel')} #{gs.number}</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>{dateRangeStr}</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>{gsRows.length} {t('sessions.table.total').toLowerCase()}</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>{t('sessions.page.totalBuyIn')} {gsBuyIn.toFixed(2)}$</Text>
                        <Text style={{ color: gsProfit >= 0 ? 'var(--color-profit)' : 'var(--color-loss)', fontWeight: 600, fontSize: 14 }}>
                          {t('sessions.page.profitLabel')} {(gsProfit >= 0 ? '+' : '') + gsProfit.toFixed(2) + '$'}
                        </Text>
                      </Space>
                      <Popconfirm
                        title={t('sessions.table.deleteSessionConfirm')}
                        onConfirm={async () => {
                          for (const r of gsRows) {
                            await deleteSession(r.session.id);
                          }
                          await load();
                        }}
                      >
                        <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </div>
                    <Table
                      dataSource={gsRows.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())}
                      columns={makeColumns()}
                      rowKey="key"
                      pagination={false}
                      size="small"
                      locale={sortLocale}
                    />
                  </div>
                );
              })}
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
                  <Text style={{ color: filteredRows.reduce((s, r) => s + r.profitUsd, 0) >= 0 ? 'var(--color-profit)' : 'var(--color-loss)', fontWeight: 600, fontSize: 14 }}>
                    {(filteredRows.reduce((s, r) => s + r.profitUsd, 0) >= 0 ? '+' : '') + filteredRows.reduce((s, r) => s + r.profitUsd, 0).toFixed(2) + '$'}
                  </Text>
                </Space>
              </div>
              <Table dataSource={filteredRows} columns={makeColumns()} rowKey="key" pagination={false} size="small" locale={sortLocale} />
            </div>
          )}
          {!selectedDay && sessionRows.length === 0 && hasNonArchivedRows && (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                padding: '8px 16px', borderRadius: 8, marginBottom: 8,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid #334155',
              }}>
                <Text strong style={{ fontSize: 15 }}>{t('sessions.table.allSessions')}</Text>
                <Space size={8}>
                  <Text type="secondary">{allRows.length}</Text>
                  <Text style={{ color: allRows.reduce((s, r) => s + r.profitUsd, 0) >= 0 ? 'var(--color-profit)' : 'var(--color-loss)', fontWeight: 600, fontSize: 14 }}>
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
                <Button type="text" size="small" icon={<FileExcelOutlined />} onClick={handleExportExcel} style={{ color: 'var(--color-profit)' }} />
              </Tooltip>
              <Tooltip title={t('sessions.table.export.json')}>
                <Button type="text" size="small" icon={<DownloadOutlined />} onClick={handleExportJson} />
              </Tooltip>
            </Space>
            <Text style={{ color: allRows.reduce((s, r) => s + r.profitUsd, 0) >= 0 ? 'var(--color-profit)' : 'var(--color-loss)', fontWeight: 600, fontSize: 15 }}>
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
                <Switch checked={editInPrize} onChange={setEditInPrize} style={{ backgroundColor: editInPrize ? 'var(--color-profit)' : undefined }} />
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
