import { Card, Typography, Space, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import ActivationForm from './ActivationForm';

const { Title, Text } = Typography;

interface Props {
  onActivated: () => void;
  reason?: string;
}

export default function ActivationScreen({ onActivated, reason }: Props) {
  const { t } = useTranslation();

  return (
    <div className="activation-screen" style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', background: 'var(--bg-color, #141414)',
      padding: 24,
    }}>
      <Card style={{ maxWidth: 520, width: '100%' }} className="activation-card">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2}>{t('license.activateTitle')}</Title>
            <Text type="secondary">{t('license.activateSubtitle')}</Text>
            {reason === 'trial_ended' && (
              <div style={{ marginTop: 8 }}>
                <Tag color="orange">{t('license.trialExpired')}</Tag>
              </div>
            )}
          </div>
          <ActivationForm onActivated={onActivated} reason={reason} />
        </Space>
      </Card>
    </div>
  );
}
