import { useState, useRef, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, ConfigProvider, theme, Typography, Tour, Button, Tooltip, Space, Modal } from 'antd';
import { QuestionCircleOutlined, DatabaseOutlined, BarChartOutlined, TrophyOutlined, WalletOutlined, SwapOutlined, TeamOutlined, SunOutlined, MoonOutlined, GlobalOutlined, ExperimentOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore } from './store/appStore';
import i18n from './i18n/i18n';
const APP_VERSION = '0.1.4';
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


const { Sider, Content, Header } = Layout;
const { Title } = Typography;

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
  ];

  const menuItems = [
    { key: '/bankroll', icon: <WalletOutlined />, label: t('menu.bankroll') },
    { key: '/movements', icon: <SwapOutlined />, label: t('menu.movements') },
    { key: '/', icon: <DatabaseOutlined />, label: t('menu.sessions') },
    { key: '/tournaments', icon: <TrophyOutlined />, label: t('menu.tournaments') },
    { key: '/reports', icon: <BarChartOutlined />, label: t('menu.reports') },
    { key: '/backing', icon: <TeamOutlined />, label: t('menu.backing') },
    { key: '/training', icon: <ExperimentOutlined />, label: t('menu.training') },
    { key: '/faq', icon: <QuestionCircleOutlined />, label: t('menu.faq') },
  ];

  const lo = {
    headerColor: isDark ? '#e8eaed' : '#1a1a1a',
    accent: '#d4a843',
  };

  return (
    <div className={isDark ? 'theme-dark' : 'theme-light'} style={{ minHeight: '100vh' }}>
      <ConfigProvider
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
            colorPrimary: '#d4a843',
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
              backgroundColor: '#0D0F14',
              borderInlineEnd: 'none',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{
                height: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
              }}>
                <Title level={4} style={{ color: '#d4a843', margin: 0, fontSize: collapsed ? 14 : 18, whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>
                  {collapsed ? '' : '♠ Poker Diary'}
                </Title>
              </div>
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
                }}
              />
              <div style={{
                padding: collapsed ? '8px 0' : '12px 16px',
                paddingBottom: 0,
                textAlign: 'center',
                fontSize: 12,
                color: isDark ? '#5f6368' : '#94a3b8',
              }}>
                {collapsed ? (
                  <span title="E.Lab" style={{ color: '#d4a843', fontSize: 12 }}>E.Lab</span>
                ) : (
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <span style={{ color: '#d4a843' }}>E.Lab © 2026</span>
                    <a
                      href="https://t.me/PokerDiary_Bot"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#d4a843', textDecoration: 'none' }}
                      onClick={(e) => { e.stopPropagation(); }}
                    >
                      @PokerDiary_Bot
                    </a>
                    <span style={{ fontSize: 10, color: '#d4a843' }}>v{APP_VERSION}</span>
                  </Space>
                )}
              </div>
              <div className="sider-collapse-track">
                <div
                  onClick={() => setCollapsed(!collapsed)}
                  className={`sider-collapse-btn ${collapsed ? 'collapsed' : ''}`}
                />
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
              <Space size={4}>
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
                    <Route path="/faq" element={<FaqPage />} />
                    <Route path="/movements" element={<MovementsPage />} />
                    <Route path="/" element={<SessionsPage />} />
                    <Route path="/tournaments" element={<TournamentsPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/bankroll" element={<BankrollPage />} />
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
            const pages: Record<number, string> = { 2: '/', 3: '/bankroll', 4: '/movements', 5: '/tournaments', 6: '/reports', 7: '/backing', 8: '/faq' };
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
