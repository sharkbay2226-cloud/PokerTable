import { useState } from 'react';
import { Typography, Input, Button, Tabs, Alert, Space, Tag, message } from 'antd';
import { KeyOutlined, ShoppingCartOutlined, CheckCircleOutlined, CopyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text, Paragraph } = Typography;

interface Props {
  onActivated: () => void;
  reason?: string;
  compact?: boolean;
}

export default function ActivationForm({ onActivated, reason, compact }: Props) {
  const { t } = useTranslation();
  const [keyInput, setKeyInput] = useState('');
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [challenge, setChallenge] = useState<string | null>(null);
  const [offlineResponse, setOfflineResponse] = useState('');
  const [offlineVerifying, setOfflineVerifying] = useState(false);

  const handleActivate = async () => {
    if (!keyInput.trim()) return;
    setActivating(true);
    setError(null);
    try {
      const result = await window.licenseAPI!.activateKey(keyInput.trim());
      if (result.success) {
        message.success(t('license.activated'));
        onActivated();
      } else if (result.offline) {
        setError(t('license.serverUnreachable'));
      } else {
        setError(result.error || t('license.activationFailed'));
      }
    } catch {
      setError(t('license.activationError'));
    } finally {
      setActivating(false);
    }
  };

  const handleGetChallenge = async () => {
    try {
      const c = await window.licenseAPI!.getOfflineChallenge();
      setChallenge(c);
    } catch {
      message.error(t('license.challengeError'));
    }
  };

  const handleVerifyOffline = async () => {
    if (!offlineResponse.trim()) return;
    setOfflineVerifying(true);
    setError(null);
    try {
      const result = await window.licenseAPI!.verifyOfflineResponse(offlineResponse.trim());
      if (result.success) {
        message.success(t('license.activated'));
        onActivated();
      } else {
        setError(result.error || t('license.activationFailed'));
      }
    } catch {
      setError(t('license.activationError'));
    } finally {
      setOfflineVerifying(false);
    }
  };

  const copyChallenge = () => {
    if (challenge) {
      navigator.clipboard.writeText(challenge);
      message.success(t('license.copied'));
    }
  };

  return (
    <Space direction="vertical" size={compact ? 'middle' : 'large'} style={{ width: '100%' }}>
      {!compact && reason === 'trial_ended' && (
        <div style={{ textAlign: 'center' }}>
          <Tag color="orange">{t('license.trialExpired')}</Tag>
        </div>
      )}

      {error && <Alert type="error" message={error} closable onClose={() => setError(null)} />}

      <Tabs
        items={[
          {
            key: 'online',
            label: <span><KeyOutlined /> {t('license.onlineTab')}</span>,
            children: (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Paragraph>{t('license.onlineDesc')}</Paragraph>
                <Input
                  size="large"
                  placeholder={t('license.keyPlaceholder')}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onPressEnter={handleActivate}
                />
                <Button
                  type="primary"
                  size="large"
                  block
                  loading={activating}
                  disabled={!keyInput.trim()}
                  onClick={handleActivate}
                  icon={<CheckCircleOutlined />}
                >
                  {t('license.activateBtn')}
                </Button>
                <div style={{ textAlign: 'center' }}>
                  <Button
                    type="link"
                    icon={<ShoppingCartOutlined />}
                    onClick={() => window.licenseAPI!.openPurchase()}
                  >
                    {t('license.buyBtn')}
                  </Button>
                </div>
              </Space>
            ),
          },
          {
            key: 'offline',
            label: <span><CopyOutlined /> {t('license.offlineTab')}</span>,
            children: (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Paragraph>{t('license.offlineDesc')}</Paragraph>

                {!challenge ? (
                  <Button onClick={handleGetChallenge} icon={<KeyOutlined />}>
                    {t('license.getChallengeBtn')}
                  </Button>
                ) : (
                  <>
                    <Input.TextArea rows={3} value={challenge} readOnly />
                    <Button onClick={copyChallenge} icon={<CopyOutlined />}>
                      {t('license.copyChallengeBtn')}
                    </Button>
                    <Paragraph type="secondary" style={{ marginTop: 8 }}>
                      {t('license.challengeHint')}
                    </Paragraph>
                    <Input
                      size="large"
                      placeholder={t('license.responsePlaceholder')}
                      value={offlineResponse}
                      onChange={(e) => setOfflineResponse(e.target.value)}
                      onPressEnter={handleVerifyOffline}
                    />
                    <Button
                      type="primary"
                      size="large"
                      block
                      loading={offlineVerifying}
                      disabled={!offlineResponse.trim()}
                      onClick={handleVerifyOffline}
                      icon={<CheckCircleOutlined />}
                    >
                      {t('license.verifyBtn')}
                    </Button>
                  </>
                )}
              </Space>
            ),
          },
        ]}
      />
    </Space>
  );
}
