import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Space, message, Typography, Modal } from 'antd';
import { CheckCircleOutlined, PlayCircleOutlined, FlagOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import SessionForm from '../components/SessionForm';
import SessionTable from '../components/SessionTable';
import { getAllSessions, getAllGameSessions, addGameSession, updateGameSession, updateSession } from '../db/db';
import type { GameSession } from '../types';

const { Title, Text } = Typography;
const SESSION_ID_KEY = 'poker-diary-current-session-id';

function getStoredSessionId(): number | null {
  const v = localStorage.getItem(SESSION_ID_KEY);
  return v ? Number(v) : null;
}

function clearStoredSessionId(): void {
  localStorage.removeItem(SESSION_ID_KEY);
}

export default function SessionsPage() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [notifyNewDay, setNotifyNewDay] = useState(false);
  const [notifyComplete, setNotifyComplete] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const triggerRefresh = useCallback(() => { setRefreshKey((k) => k + 1); setShowForm(false); }, []);

  // Load current session from DB on mount
  useEffect(() => {
    const storedId = getStoredSessionId();
    if (!storedId) return;

    getAllGameSessions().then((all) => {
      const gs = all.find((s) => s.id === storedId && !s.archived);
      if (!gs) {
        clearStoredSessionId();
        return;
      }
      setCurrentSession(gs);

      const today = dayjs().format('YYYY-MM-DD');
      if (today > gs.startDate) {
        setNotifyNewDay(true);
      }

      getAllSessions().then((sessions) => {
        const sessionSessions = sessions.filter((s) => s.sessionId === gs.id);
        const allPlayed = sessionSessions.length > 0 && sessionSessions.every((s) => s.place > 0);
        if (allPlayed) {
          setNotifyComplete(true);
        }
      });
    });
  }, [refreshKey]);

  const handleStartSession = async () => {
    const today = dayjs().format('YYYY-MM-DD');
    const all = await getAllGameSessions();
    const maxNum = all.length > 0 ? Math.max(...all.map((s) => s.number)) : 0;
    const id = await addGameSession({ number: maxNum + 1, startDate: today, endDate: null, archived: false });
    localStorage.setItem(SESSION_ID_KEY, String(id));
    triggerRefresh();
  };

  const handleStartTournament = () => {
    setShowForm(true);
  };

  const handleFinishSession = () => {
    setEndModalOpen(true);
  };

  const [endModalOpen, setEndModalOpen] = useState(false);

  const confirmEndSession = async () => {
    setEndModalOpen(false);
    const storedId = getStoredSessionId();
    if (!storedId || !currentSession) return;

    // Mark active tournaments as inPrize:false
    const sessions = await getAllSessions();
    const active = sessions.filter((s) => s.sessionId === storedId && s.place === 0);
    for (const s of active) {
      await updateSession(s.id, { inPrize: false });
    }

    // Archive the game session
    await updateGameSession(storedId, { archived: true, endDate: dayjs().format('YYYY-MM-DD') });
    clearStoredSessionId();
    setCurrentSession(null);
    setNotifyNewDay(false);
    setNotifyComplete(false);
    message.success(t('sessions.page.ended', { count: active.length }));
    triggerRefresh();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Title level={3} style={{ margin: 0 }}>{t('sessions.page.title')}</Title>
          <Button type="text" icon={<QuestionCircleOutlined style={{ color: 'var(--color-accent)', fontSize: 18 }} />} onClick={() => setHelpOpen(true)} />
        </Space>
        {currentSession && (
          <Text style={{ fontSize: 14, color: 'var(--color-accent)' }}>
            {t('sessions.page.sessionLabel')} #{currentSession.number}
          </Text>
        )}
      </div>

      {notifyNewDay && (
        <div style={{ background: 'rgba(212, 168, 67, 0.15)', border: '1px solid #d4a843', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          <Text style={{ color: 'var(--color-accent)', fontSize: 14 }}>{t('sessions.page.newDayNotify')}</Text>
        </div>
      )}

      {notifyComplete && (
        <div style={{ background: 'rgba(212, 168, 67, 0.15)', border: '1px solid #d4a843', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          <Text style={{ color: 'var(--color-accent)', fontSize: 14 }}>{t('sessions.page.completeNotify')}</Text>
        </div>
      )}

      {showForm ? (
        <SessionForm onSuccess={triggerRefresh} />
      ) : !currentSession ? (
        <Space style={{ marginBottom: 24, width: '100%' }}>
          <Button
            type="primary"
            size="large"
            icon={<FlagOutlined />}
            onClick={handleStartSession}
            style={{ height: 48, fontSize: 16, minWidth: 200 }}
          >
            {t('sessions.actions.startSession')}
          </Button>
        </Space>
      ) : (
        <Space style={{ marginBottom: 24, width: '100%' }}>
          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={handleStartTournament}
            style={{ height: 48, fontSize: 16, minWidth: 200 }}
          >
            {t('sessions.actions.start')}
          </Button>
          <Button
            icon={<CheckCircleOutlined />}
            size="large"
            style={{ height: 48, fontSize: 16, minWidth: 200 }}
            onClick={handleFinishSession}
          >
            {t('sessions.actions.endDay')}
          </Button>
        </Space>
      )}
      <SessionTable key={refreshKey} currentSession={currentSession} />

      <Modal
        title={t('sessions.page.modalEndTitle')}
        open={endModalOpen}
        onCancel={() => setEndModalOpen(false)}
        onOk={confirmEndSession}
        okText={t('sessions.actions.endDay')}
        cancelText={t('sessions.page.modalCancel')}
        destroyOnHidden
      >
        {currentSession && (
          <Text>
            {t('sessions.page.modalEndContentSession', { number: currentSession.number })}
          </Text>
        )}
      </Modal>

      <Modal title={<span style={{ color: 'var(--color-accent)' }}>{t('sessions.help.title')}</span>} open={helpOpen} onCancel={() => setHelpOpen(false)} footer={null} width={520}>
        <Typography.Paragraph>{t('sessions.help.intro')}</Typography.Paragraph>
        <Typography.Paragraph>
          <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{t('sessions.help.start')}</span><br />
          {t('sessions.help.startDesc')}
        </Typography.Paragraph>
        <Typography.Paragraph>
          <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{t('sessions.help.endDay')}</span><br />
          {t('sessions.help.endDayDesc')}
        </Typography.Paragraph>
        <Typography.Paragraph>
          <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{t('sessions.help.table')}</span><br />
          {t('sessions.help.tableDesc')}
        </Typography.Paragraph>
      </Modal>
    </div>
  );
}