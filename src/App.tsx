import { useState, useRef, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, ConfigProvider, theme, Typography, Tour, Button, Tooltip, Space, Modal } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import enUS from 'antd/locale/en_US';
import { QuestionCircleOutlined, DatabaseOutlined, BarChartOutlined, TrophyOutlined, WalletOutlined, SwapOutlined, TeamOutlined, SunOutlined, MoonOutlined, GlobalOutlined, ExperimentOutlined, FlagOutlined, MenuOutlined, CheckOutlined, SafetyCertificateOutlined, CalculatorOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { useAppStore, DEFAULT_MENU_ORDER } from './store/appStore';
import i18n from './i18n/i18n';
import { mockLicenseAPI } from './mock/mockLicenseAPI';
const APP_VERSION = '0.2.2';
import LicenseGate from './components/LicenseGate';
import CustomCursor from './components/CustomCursor';
import SessionsPage from './pages/SessionsPage';
import ReportsPage from './pages/ReportsPage';
import TournamentsPage from './pages/TournamentsPage';
import BankrollPage from './pages/BankrollPage';
import MovementsPage from './pages/MovementsPage';
import FaqPage from './pages/FaqPage';
import BackingPage from './pages/BackingPage';
import TrainingPage from './pages/TrainingPage';
import GoalsPage from './pages/GoalsPage';
import EquityCalculatorPage from './pages/EquityCalculatorPage';
import { getAllSessions, getAllGameSessions, getAllTournaments, getAllGoals } from './db/db';
import { convertToUsd } from './utils/currency';


const { Sider, Content, Header } = Layout;
const { Title, Text } = Typography;

const ONBOARDING_KEY = 'poker-diary-onboarding-done';
const LANG_SELECTED_KEY = 'poker-diary-lang-selected';

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const { settings, setSettings } = useAppStore();
  const isDark = settings.themeMode !== 'light';
  const isEn = settings.locale === 'en';
  const [langModalOpen, setLangModalOpen] = useState(!localStorage.getItem(LANG_SELECTED_KEY));
  const [tourOpen, setTourOpen] = useState(!localStorage.getItem(ONBOARDING_KEY) && !!localStorage.getItem(LANG_SELECTED_KEY));
  const [sessionCount, setSessionCount] = useState(0);
  const [gameSessionCount, setGameSessionCount] = useState(0);
  const [profitUsd, setProfitUsd] = useState(0);
  const [activeGoalsCount, setActiveGoalsCount] = useState(0);
  const [completedGoalsCount, setCompletedGoalsCount] = useState(0);
  const [reorderMode, setReorderMode] = useState(false);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<{ status: string; plan?: string; daysLeft?: number } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const loadStats = async () => {
    const [sessions, gameSessions, tournaments, goals] = await Promise.all([
      getAllSessions(),
      getAllGameSessions(),
      getAllTournaments(),
      getAllGoals(),
    ]);
    setGameSessionCount(gameSessions.length);
    setSessionCount(sessions.length);
    setActiveGoalsCount(goals.filter((g: any) => !g.completed).length);
    setCompletedGoalsCount(goals.filter((g: any) => g.completed).length);
    const tourMap = new Map(tournaments.map((t) => [t.id, t]));
    const total = sessions.reduce((sum: number, s: any) => {
      const tour = tourMap.get(s.tournamentId);
      const buyIn = tour ? convertToUsd(tour.buyIn, tour.currency) : 0;
      const prize = s.place > 0 ? convertToUsd(s.prize, s.prizeCurrency) : 0;
      const bounty = s.place > 0 ? convertToUsd(s.bountySum, s.bountyCurrency) : 0;
      return sum + prize + bounty - buyIn;
    }, 0);
    setProfitUsd(total);
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const siderRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    i18n.changeLanguage(isEn ? 'en' : 'ru');
  }, [isEn]);

  const toggleTheme = () => {
    setSettings({ themeMode: isDark ? 'light' : 'dark' });
  };

  const toggleLang = () => {
    setSettings({ locale: isEn ? 'ru' : 'en' });
  };

  const openLicenseModal = async () => {
    const api = window.licenseAPI || (import.meta.env.DEV ? (window as any).licenseAPI : null) || mockLicenseAPI;
    try {
      const status = await api.getStatus();
      setLicenseInfo(status);
    } catch {
      setLicenseInfo(null);
    }
    setLicenseModalOpen(true);
  };

  const closeTour = () => {
    setTourOpen(false);
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
  };

  const pageTarget = () => contentRef.current?.querySelector('h3') || contentRef.current;

  const tourSteps: Record<string, unknown>[] = [
    {
      title: isEn ? '♠ Welcome to Poker Diary!' : '♠ Добро пожаловать в Poker Diary!',
      description: isEn
        ? 'Track your poker sessions, manage bankroll, and analyze results. This tour will guide you through all sections.'
        : 'Это приложение поможет вам вести учёт покерных сессий, отслеживать банкролл и анализировать результаты. Эта экскурсия проведёт вас по всем разделам.',
      target: () => headerRef.current,
    },
    {
      title: isEn ? '📌 Sidebar Navigation' : '📌 Боковое меню',
      description: isEn
        ? 'Use the sidebar to navigate between sections. Each item opens a different page. Click any item to jump to that section.'
        : 'Используйте боковое меню для перехода между разделами. Каждый пункт открывает свою страницу. Нажмите на любой пункт, чтобы перейти в раздел.',
      target: () => siderRef.current?.querySelector('.ant-menu') || siderRef.current,
    },
    {
      title: isEn ? '📋 Sessions' : '📋 Игровые сессии',
      description: isEn
        ? 'Create, edit and finish poker tournaments. Filter by date, room or tournament. View today\'s active sessions and use the calendar for history. Click "Start Tournament" to begin a new session. Edit results inline in the table.'
        : 'Создавайте, редактируйте и завершайте турниры. Фильтруйте по дате, руму или турниру. Смотрите активные сессии сегодня и используйте календарь для истории. Нажмите «Начать турнир» для новой сессии. Редактируйте результаты прямо в таблице.',
      target: pageTarget,
    },
    {
      title: isEn ? '💰 Bankroll' : '💰 Банкролл',
      description: isEn
        ? 'Track your bankroll per room. Each card shows: balance, tournament profit, and manual operations. Deposit (+) or withdraw (-) funds in any currency. Refresh exchange rates from the internet or set them manually.'
        : 'Отслеживайте банкролл по каждому руму. Карточка показывает: баланс, профит с турниров и ручные операции. Пополняйте (+) или снимайте (-) средства в любой валюте. Обновляйте курсы из интернета или задавайте вручную.',
      target: pageTarget,
    },
    {
      title: isEn ? '🔄 Movements' : '🔄 Движение средств',
      description: isEn
        ? 'All financial operations in one timeline: wins, losses, deposits, withdrawals. Filter by room, operation type, date range. Sort newest or oldest first. Pagination — 20 records per page.'
        : 'Все финансовые операции в хронологическом порядке: выигрыши, проигрыши, пополнения, снятия. Фильтрация по руму, типу операции, диапазону дат. Сортировка — сначала новые или старые. Пагинация — 20 записей на страницу.',
      target: pageTarget,
    },
    {
      title: isEn ? '🏆 Tournaments' : '🏆 Турниры',
      description: isEn
        ? 'Manage rooms and poker platforms (PokerStars, GG Poker, CoinPoker, etc.). Add tournaments to each room with buy-in amount and currency. Edit or delete rooms and tournaments.'
        : 'Управляйте румами и покерными платформами (PokerStars, GG Poker, CoinPoker и т.д.). Добавляйте турниры к каждому руму с бай-ином и валютой. Редактируйте и удаляйте румы и турниры.',
      target: pageTarget,
    },
    {
      title: isEn ? '📊 Reports' : '📊 Отчёты',
      description: isEn
        ? 'Comprehensive analytics: profit by room (pie chart), profit by tournament (bar chart), bankroll growth (cumulative line chart), expense breakdown with top-10 worst tournaments. Filter by room and display currency. Toggle charts open/closed.'
        : 'Полная аналитика: профит по румам (круговая диаграмма), профит по турнирам (столбцы), рост банкролла (нарастающий итог), расходы с ТОП-10 худших турниров. Фильтрация по руму и валюте. Сворачивайте и разворачивайте графики.',
      target: pageTarget,
    },
    {
      title: isEn ? '👥 Backing' : '👥 Бэкер',
      description: isEn
        ? 'Manage backers who fund your tournaments. Add backers with profit percentages. Track received payments, payouts, and "paid by backer" operations. Debt is calculated automatically.'
        : 'Управляйте бэкерами (инвесторами), финансирующими ваши турниры. Добавляйте бэкеров с процентом от профита. Отслеживайте получения, выплаты и оплаты бэкером. Долг рассчитывается автоматически.',
      target: pageTarget,
    },
    {
      title: isEn ? '❓ FAQ & Backup' : '❓ FAQ и бэкап',
      description: isEn
        ? 'Answers to common questions about rooms, tournaments, sessions, bankroll, currencies, and backing. Download backup as JSON or Excel. Restore from a .json file or clear all sessions.'
        : 'Ответы на частые вопросы о румах, турнирах, сессиях, банкролле, валютах и бэкинге. Скачайте бэкап в JSON или Excel. Восстановите данные из .json или очистите все сессии.',
      target: pageTarget,
    },
    {
      title: isEn ? '🎯 Goals' : '🎯 Цели',
      description: isEn
        ? 'Set poker goals: number of tournaments and profit target. Track your progress with a visual bar. Create multiple goals, complete them, and view your achievements.'
        : 'Ставьте покерные цели: количество турниров и целевой профит. Отслеживайте прогресс визуальной шкалой. Создавайте несколько целей, завершайте их и смотрите статистику достижений.',
      target: pageTarget,
    },
    {
      title: isEn ? '🧠 Matrix Trainer' : '🧠 Тренажёр',
      description: isEn
        ? 'Practice poker range matrices. Use the Editor to create and paint hands, then the Trainer to test yourself in Classic (verify actions) or Drawing (draw the correct range) mode.'
        : 'Тренируйте покерные диапазоны. В Редакторе создавайте и раскрашивайте руки, в Тренажёре проверяйте себя в режиме Классика (проверка действий) или Рисование (нарисуйте правильный диапазон).',
      target: pageTarget,
    },
  ];

  const allMenuItems: { key: string; icon: React.ReactNode; label: string }[] = [
    { key: '/bankroll', icon: <WalletOutlined />, label: t('menu.bankroll') },
    { key: '/movements', icon: <SwapOutlined />, label: t('menu.movements') },
    { key: '/', icon: <DatabaseOutlined />, label: t('menu.sessions') },
    { key: '/tournaments', icon: <TrophyOutlined />, label: t('menu.tournaments') },
    { key: '/reports', icon: <BarChartOutlined />, label: t('menu.reports') },
    { key: '/backing', icon: <TeamOutlined />, label: t('menu.backing') },
    { key: '/goals', icon: <FlagOutlined />, label: t('menu.goals') },
    { key: '/training', icon: <ExperimentOutlined />, label: t('menu.training') },
    { key: '/faq', icon: <QuestionCircleOutlined />, label: t('menu.faq') },
    { key: '/equity', icon: <CalculatorOutlined />, label: t('menu.equity') },
  ];

  const itemMap = new Map(allMenuItems.map((m) => [m.key, m]));
  const storedOrder = settings.menuOrder ?? DEFAULT_MENU_ORDER;
  const orderedKeys = storedOrder.filter((k) => itemMap.has(k));
  allMenuItems.forEach((m) => { if (!orderedKeys.includes(m.key)) orderedKeys.push(m.key); });
  const menuItems = orderedKeys.map((k) => itemMap.get(k)!).filter(Boolean);

  const lo = {
    headerColor: isDark ? '#e8eaed' : '#1a1a1a',
    accent: '#d4a843',
  };

  function SortableMenuItem({ item }: { item: { key: string; icon: React.ReactNode; label: string } }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });
    const selected = location.pathname === item.key;
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      cursor: reorderMode ? 'grab' : 'pointer',
      padding: collapsed ? '0 16px' : '0 24px',
      height: 40,
      lineHeight: '40px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      borderRadius: 8,
      margin: collapsed ? '4px 8px' : '4px 8px',
      color: selected ? (isDark ? '#d4a843' : '#2779a7') : (isDark ? '#e2e8f0' : '#1a1a1a'),
      background: selected ? (isDark ? 'rgba(212, 168, 67, 0.12)' : 'rgba(39, 121, 167, 0.10)') : 'transparent',
      border: reorderMode ? '1px dashed #d4a843' : '1px solid transparent',
      fontSize: 14,
      userSelect: 'none',
    };
    return (
      <div
        ref={setNodeRef}
        style={style}
        onClick={() => { if (!reorderMode) { navigate(item.key); } }}
        {...(reorderMode ? { ...attributes, ...listeners } : {})}
      >
        {item.icon}
        {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>}
      </div>
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const keys = [...orderedKeys];
    const oldIndex = keys.indexOf(active.id as string);
    const newIndex = keys.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    keys.splice(oldIndex, 1);
    keys.splice(newIndex, 0, active.id as string);
    setSettings({ menuOrder: keys });
  }

  return (
    <div className={isDark ? 'theme-dark' : 'theme-light'} style={{ minHeight: '100vh' }}>
      <ConfigProvider
        locale={settings.locale === 'en' ? enUS : ruRU}
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: isDark ? {
            colorPrimary: '#d4a843',
            borderRadius: 8,
            colorBgContainer: '#1A1C23',
            colorBgElevated: '#1A1C23',
            colorBorder: '#2A2D35',
            colorText: '#e2e8f0',
            colorTextSecondary: '#94a3b8',
            colorBgLayout: '#0D0F14',
          } : {
            colorPrimary: '#2779a7',
            borderRadius: 8,
            colorBgContainer: '#ffffff',
            colorBgElevated: '#ffffff',
            colorBorder: '#e2e8f0',
          },
          }}
        >
          <Modal
            open={langModalOpen}
            closable={false}
            maskClosable={false}
            footer={null}
            width={400}
            centered
          >
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Title level={3} style={{ margin: 0, color: '#d4a843', fontFamily: "'Inter', sans-serif" }}>♠ Poker Diary</Title>
              <div style={{ marginTop: 8, color: '#94a3b8', fontSize: 14 }}>
                {settings.locale === 'en' ? 'Select your language' : 'Выберите язык'}
              </div>
              <Space size={16} style={{ marginTop: 32 }}>
                <Button
                  size="large"
                  type="primary"
                  style={{ minWidth: 120, height: 48, fontSize: 16 }}
                  onClick={() => {
                    setSettings({ locale: 'ru' });
                    try { localStorage.setItem(LANG_SELECTED_KEY, '1'); } catch {}
                    setLangModalOpen(false);
                    setTourOpen(true);
                  }}
                >
                  🇷🇺 Русский
                </Button>
                <Button
                  size="large"
                  style={{ minWidth: 120, height: 48, fontSize: 16 }}
                  onClick={() => {
                    setSettings({ locale: 'en' });
                    try { localStorage.setItem(LANG_SELECTED_KEY, '1'); } catch {}
                    setLangModalOpen(false);
                    setTourOpen(true);
                  }}
                >
                  🇬🇧 English
                </Button>
              </Space>
            </div>
          </Modal>
          <Modal
            open={licenseModalOpen}
            onCancel={() => setLicenseModalOpen(false)}
            footer={null}
            width={400}
            centered
            title={<span style={{ color: 'var(--color-accent)' }}><SafetyCertificateOutlined style={{ marginRight: 8 }} />{isEn ? 'License' : 'Лицензия'}</span>}
          >
            <div style={{ padding: '12px 0' }}>
              {licenseInfo ? (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>{isEn ? 'Status' : 'Статус'}:</span>
                    <span style={{ color: licenseInfo.status === 'licensed' ? 'var(--color-profit)' : licenseInfo.status === 'trial' ? '#f59e0b' : 'var(--color-loss)', fontWeight: 600 }}>
                      {licenseInfo.status === 'licensed' ? (isEn ? 'Active' : 'Активна') : licenseInfo.status === 'trial' ? (isEn ? 'Trial' : 'Пробный период') : licenseInfo.status === 'grace' ? (isEn ? 'Grace period' : 'Льготный период') : licenseInfo.status === 'expired' ? (isEn ? 'Expired' : 'Истекла') : licenseInfo.status}
                    </span>
                  </div>
                  {licenseInfo.plan && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>{isEn ? 'Plan' : 'План'}:</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                        {licenseInfo.plan === 'lifetime' ? (isEn ? 'Lifetime' : 'Навсегда') : licenseInfo.plan === 'yearly' ? (isEn ? 'Yearly' : 'Годовая') : licenseInfo.plan}
                      </span>
                    </div>
                  )}
                  {licenseInfo.daysLeft !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>{isEn ? 'Days left' : 'Осталось дней'}:</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{licenseInfo.daysLeft}</span>
                    </div>
                  )}
                </Space>
              ) : (
                <Text type="secondary">{isEn ? 'Unable to load license info' : 'Не удалось загрузить информацию о лицензии'}</Text>
              )}
            </div>
          </Modal>
          <Layout style={{ height: '100vh', overflow: 'hidden', backgroundColor: '#0D0F14' }} ref={siderRef}>
            <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            trigger={null}
            width={220}
            style={{
              position: 'sticky',
              top: 0,
              height: '100vh',
              borderInlineEnd: 'none',
            }}
          >
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{
                height: 56,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: collapsed ? 0 : 24,
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: 'transparent',
              }}>
                <Title level={4} style={{ color: '#d4a843', margin: 0, fontSize: collapsed ? 14 : 18, whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>
                  {collapsed ? '' : '♠ Poker Diary'}
                </Title>
              </div>
              {reorderMode ? (
                <div style={{ flex: 1, paddingTop: collapsed ? 0 : 20, overflow: 'auto' }}>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={menuItems.map((m) => m.key)} strategy={verticalListSortingStrategy}>
                      {menuItems.map((item) => <SortableMenuItem key={item.key} item={item} />)}
                    </SortableContext>
                  </DndContext>
                </div>
              ) : (
                <Menu
                  theme={isDark ? 'dark' : 'light'}
                  mode="inline"
                  selectedKeys={[location.pathname]}
                  items={menuItems}
                  onClick={({ key }) => navigate(key)}
                  style={{
                    background: 'transparent',
                    borderInlineEnd: 'none',
                    flex: 1,
                    paddingTop: collapsed ? 0 : 20,
                  }}
                />
              )}
              <Tooltip title={reorderMode ? t('menu.saveOrder') || 'Сохранить порядок' : t('menu.reorder') || 'Изменить порядок'}>
                <Button
                  type="text"
                  size="small"
                  icon={reorderMode ? <CheckOutlined /> : <MenuOutlined />}
                  onClick={() => setReorderMode(!reorderMode)}
                  style={{
                    color: reorderMode ? 'var(--color-profit)' : '#64748b',
                    fontSize: 20,
                    width: '100%',
                    textAlign: 'center' as const,
                    paddingLeft: 0,
                    height: 36,
                  }}
                />
              </Tooltip>
              <div className="sider-collapse-track">
                <Tooltip title={collapsed ? t('menu.expand') || 'Развернуть' : t('menu.collapse') || 'Свернуть'}>
                  <div
                    onClick={() => setCollapsed(!collapsed)}
                    className={`sider-collapse-btn ${collapsed ? 'collapsed' : ''}`}
                  />
                </Tooltip>
              </div>
              <div style={{ height: 32 }} />
              <div style={{
                padding: collapsed ? '8px 0' : '12px 16px',
                paddingBottom: 0,
                textAlign: 'center',
                fontSize: 12,
                color: isDark ? '#5f6368' : '#94a3b8',
              }}>
                {collapsed ? (
                  <span title="E.Lab" style={{ fontSize: 12 }}>E.Lab</span>
                ) : (
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <span>E.Lab © 2026</span>
                    <a
                      href="https://t.me/PokerDiary_Bot"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'inherit', textDecoration: 'none' }}
                      onClick={(e) => { e.stopPropagation(); }}
                    >
                      @PokerDiary_Bot
                    </a>
                    <Space size={4}>
                      <span style={{ fontSize: 10 }}>v{APP_VERSION}</span>
                    </Space>
                  </Space>
                )}
              </div>
            </div>
          </Sider>
          <Layout style={{ backgroundColor: '#0D0F14' }}>
            <Header ref={headerRef} style={{
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              zIndex: 100,
              height: 56,
              lineHeight: '56px',
              backgroundColor: '#0D0F14',
              borderBottom: 'none',
            }}>
              <Title level={4} style={{ color: lo.headerColor, margin: 0 }}>
                {t('header.title')}
              </Title>
              <Space size={16} style={{ fontSize: 13 }}>
                <span>
                  <Text type="secondary" style={{ fontSize: 12 }}>{t('header.sessionsPlayed')}: </Text>
                  <Text strong style={{ color: 'var(--color-accent)' }}>{gameSessionCount}</Text>
                </span>
                <span>
                  <Text type="secondary" style={{ fontSize: 12 }}>{t('header.tournamentsPlayed')}: </Text>
                  <Text strong style={{ color: '#3b82f6' }}>{sessionCount}</Text>
                </span>
                <span>
                  <Text type="secondary" style={{ fontSize: 12 }}>{t('header.profit')}: </Text>
                  <Text strong style={{ color: profitUsd >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' }}>
                    {(profitUsd >= 0 ? '+' : '')}{profitUsd.toFixed(2)}$
                  </Text>
                </span>
                <span>
                  <Text type="secondary" style={{ fontSize: 12 }}>{t('header.activeGoals')}: </Text>
                  <Text strong style={{ color: 'var(--color-accent)' }}>{activeGoalsCount}</Text>
                </span>
                <span>
                  <Text type="secondary" style={{ fontSize: 12 }}>{t('header.completedGoals')}: </Text>
                  <Text strong style={{ color: 'var(--color-profit)' }}>{completedGoalsCount}</Text>
                </span>
              </Space>
              <Space size={4}>
                <Tooltip title={isEn ? 'License' : 'Лицензия'}>
                  <Button
                    type="text"
                    icon={<SafetyCertificateOutlined />}
                    onClick={openLicenseModal}
                    style={{ fontSize: 18 }}
                  />
                </Tooltip>
                <Tooltip title={isEn ? 'Help' : 'Справка'}>
                  <Button
                    type="text"
                    icon={<QuestionCircleOutlined />}
                    onClick={() => {
                      try { localStorage.removeItem(ONBOARDING_KEY); } catch {}
                      setTourOpen(true);
                    }}
                    style={{ fontSize: 18 }}
                  />
                </Tooltip>
                <Tooltip title={isEn ? 'Switch language' : 'Сменить язык'}>
                  <Button
                    type="text"
                    icon={<GlobalOutlined />}
                    onClick={toggleLang}
                    style={{ fontSize: 18 }}
                  >
                    <span style={{ fontSize: 13, marginLeft: 2 }}>{isEn ? 'EN' : 'RU'}</span>
                  </Button>
                </Tooltip>
                <Tooltip title={isEn ? 'Toggle theme' : 'Сменить тему'}>
                  <Button
                    type="text"
                    icon={isDark ? <SunOutlined /> : <MoonOutlined />}
                    onClick={toggleTheme}
                    style={{ fontSize: 18 }}
                  />
                </Tooltip>
              </Space>
            </Header>
            <Content ref={contentRef} style={{ padding: 24, backgroundColor: '#0D0F14', minHeight: 280, position: 'relative' }}>
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                >
                  <Routes location={location}>
                    <Route path="/backing" element={<BackingPage />} />
                    <Route path="/training" element={<TrainingPage />} />
                    <Route path="/goals" element={<GoalsPage />} />
                    <Route path="/faq" element={<FaqPage />} />
                    <Route path="/movements" element={<MovementsPage />} />
                    <Route path="/" element={<SessionsPage />} />
                    <Route path="/tournaments" element={<TournamentsPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/bankroll" element={<BankrollPage />} />
                    <Route path="/equity" element={<EquityCalculatorPage />} />
                  </Routes>
                </motion.div>
              </AnimatePresence>
            </Content>
          </Layout>
        </Layout>
        <Tour
          open={tourOpen as any}
          onClose={closeTour}
          steps={tourSteps as any}
          onChange={(current) => {
            const pages: Record<number, string> = { 2: '/', 3: '/bankroll', 4: '/movements', 5: '/tournaments', 6: '/reports', 7: '/backing', 8: '/faq', 9: '/goals', 10: '/training' };
            if (pages[current]) {
              setTimeout(() => navigate(pages[current]!), 0);
            }
          }}
          mask
          type="primary"
          closable
          onFinish={closeTour}
        />
      </ConfigProvider>
      <CustomCursor />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <LicenseGate>
        <AppLayout />
      </LicenseGate>
    </HashRouter>
  );
}
