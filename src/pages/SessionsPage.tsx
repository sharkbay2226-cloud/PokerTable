import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Space, message, Typography } from 'antd';
import { CheckCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import SessionForm from '../components/SessionForm';
import SessionTable from '../components/SessionTable';
import { getAllSessions, updateSession } from '../db/db';

const { Title } = Typography;

export default function SessionsPage() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const triggerRefresh = () => { setRefreshKey((k) => k + 1); setShowForm(false); };

  const handleEndDay = async () => {
    const sessions = await getAllSessions();
    const today = dayjs().format('YYYY-MM-DD');
    const active = sessions.filter((s) => s.date === today && s.place === 0);
    if (active.length === 0) {
      message.info(t('sessions.page.noActive'));
      return;
    }
    for (const s of active) {
      await updateSession(s.id, { inPrize: false });
    }
    message.success(t('sessions.page.ended', { count: active.length }));
    triggerRefresh();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>{t('sessions.page.title')}</Title>
      </div>

      {showForm ? (
        <SessionForm onSuccess={triggerRefresh} />
      ) : (
        <Space style={{ marginBottom: 24, width: '100%' }}>
          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={() => setShowForm(true)}
            style={{ height: 48, fontSize: 16, minWidth: 200 }}
          >
            {t('sessions.actions.start')}
          </Button>
          <Button
            icon={<CheckCircleOutlined />}
            size="large"
            style={{ height: 48, fontSize: 16, minWidth: 200 }}
            onClick={handleEndDay}
          >
            {t('sessions.actions.endDay')}
          </Button>
        </Space>
      )}
      <SessionTable key={refreshKey} />
    </div>
  );
}
