import { useState, useRef, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, ConfigProvider, theme, Typography, Tour, Button, Tooltip, Space, Modal } from 'antd';
import { QuestionCircleOutlined, DatabaseOutlined, BarChartOutlined, TrophyOutlined, WalletOutlined, SwapOutlined, TeamOutlined, SunOutlined, MoonOutlined, GlobalOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAppStore } from './store/appStore';
import i18n from './i18n/i18n';
import LicenseGate from './components/LicenseGate';
import SessionsPage from './pages/SessionsPage';
import ReportsPage from './pages/ReportsPage';
import TournamentsPage from './pages/TournamentsPage';
import BankrollPage from './pages/BankrollPage';
import MovementsPage from './pages/MovementsPage';
import FaqPage from './pages/FaqPage';
import BackingPage from './pages/BackingPage';
import TrainingPage from './pages/TrainingPage';


const scrollStyles = `
  html { scroll-behavior: smooth; }
  .ant-collapse-item { transition: all 0.3s ease; }
  .ant-collapse-content { transition: all 0.4s ease-in-out !important; }
`;

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

  const darkLayout = {
    siderBg: '#1e293b',
    siderBorder: '#334155',
    headerBg: '#1e293b',
    headerBorder: '#334155',
    headerColor: '#e2e8f0',
    contentBg: '#0f172a',
    borderColor: '#334155',
  };

  const lightLayout = {
    siderBg: '#f8fafc',
    siderBorder: '#e2e8f0',
    headerBg: '#ffffff',
    headerBorder: '#e2e8f0',
    headerColor: '#1a1a1a',
    contentBg: '#f5f7fa',
    borderColor: '#e2e8f0',
  };

  const lo = isDark ? darkLayout : lightLayout;

  return (
    <div className={isDark ? 'theme-dark' : 'theme-light'} style={{ minHeight: '100vh' }}>
      <ConfigProvider
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: isDark ? {
            colorPrimary: '#3b82f6',
            borderRadius: 8,
            colorBgContainer: '#0f172a',
            colorBgElevated: '#1e293b',
            colorBorder: '#334155',
          } : {
            colorPrimary: '#3b82f6',
            borderRadius: 8,
            colorBgContainer: '#ffffff',
            colorBgElevated: '#f8fafc',
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
              <Title level={3} style={{ margin: 0, color: '#3b82f6' }}>♠ Poker Diary</Title>
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
          <Layout style={{ minHeight: '100vh' }} ref={siderRef}>
            <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            style={{
              borderRight: `1px solid ${lo.borderColor}`,
              background: lo.siderBg,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: `1px solid ${lo.borderColor}`,
                background: isDark ? 'transparent' : '#ffffff',
              }}>
                <Title level={4} style={{ color: '#3b82f6', margin: 0, fontSize: collapsed ? 14 : 18, whiteSpace: 'nowrap' }}>
                  {collapsed ? '♠' : '♠ Poker Diary'}
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
                borderTop: `1px solid ${lo.borderColor}`,
                padding: collapsed ? '8px 0' : '12px 16px',
                textAlign: 'center',
                fontSize: 12,
                color: isDark ? '#94a3b8' : '#64748b',
              }}>
                {collapsed ? (
                  <span title="E.Lab">♠</span>
                ) : (
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <span>E.Lab © 2026</span>
                    <a
                      href="https://t.me/PokerDiary_Bot"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#3b82f6', textDecoration: 'none' }}
                      onClick={(e) => { e.stopPropagation(); }}
                    >
                      @PokerDiary_Bot
                    </a>
                  </Space>
                )}
              </div>
            </div>
          </Sider>
          <Layout>
            <Header ref={headerRef} style={{
              background: lo.headerBg,
              borderBottom: `1px solid ${lo.headerBorder}`,
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
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
                    style={{ color: isDark ? '#e2e8f0' : '#64748b', fontSize: 18 }}
                  />
                </Tooltip>
                <Tooltip title={isEn ? 'Switch language' : 'Сменить язык'}>
                  <Button
                    type="text"
                    icon={<GlobalOutlined />}
                    onClick={toggleLang}
                    style={{ color: isDark ? '#e2e8f0' : '#64748b', fontSize: 18 }}
                  >
                    <span style={{ fontSize: 13, marginLeft: 2 }}>{isEn ? 'EN' : 'RU'}</span>
                  </Button>
                </Tooltip>
                <Tooltip title={isEn ? 'Toggle theme' : 'Сменить тему'}>
                  <Button
                    type="text"
                    icon={isDark ? <SunOutlined /> : <MoonOutlined />}
                    onClick={toggleTheme}
                    style={{ color: isDark ? '#e2e8f0' : '#64748b', fontSize: 18 }}
                  />
                </Tooltip>
              </Space>
            </Header>
            <Content ref={contentRef} style={{ padding: 24, background: lo.contentBg, minHeight: 280 }}>
              <Routes>
                <Route path="/backing" element={<BackingPage />} />
                <Route path="/training" element={<TrainingPage />} />
                <Route path="/faq" element={<FaqPage />} />
                <Route path="/movements" element={<MovementsPage />} />
                <Route path="/" element={<SessionsPage />} />
                <Route path="/tournaments" element={<TournamentsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/bankroll" element={<BankrollPage />} />
              </Routes>
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
    </div>
  );
}

export default function App() {
  return (
    <>
      <style>{scrollStyles}</style>
      <HashRouter>
        <LicenseGate>
          <AppLayout />
        </LicenseGate>
      </HashRouter>
    </>
  );
}
