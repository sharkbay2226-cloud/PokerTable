import { useEffect, useState, useCallback, ReactNode } from 'react';
import { Spin, Result, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { mockLicenseAPI } from '../mock/mockLicenseAPI';
import TrialBanner from './TrialBanner';
import ActivationScreen from './ActivationScreen';

type GateStatus = 'loading' | 'trial' | 'licensed' | 'grace' | 'expired' | 'error' | 'unavailable';

interface StatusData {
  status: string;
  daysLeft?: number;
  plan?: string;
  reason?: string;
}

export default function LicenseGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [gateStatus, setGateStatus] = useState<GateStatus>('loading');
  const [statusData, setStatusData] = useState<StatusData | null>(null);

  const checkStatus = useCallback(async () => {
    const api = window.licenseAPI || (import.meta.env.DEV || !window.electronAPI?.isElectron
      ? (window as any).licenseAPI = mockLicenseAPI
      : null);
    if (!api) {
      setGateStatus('unavailable');
      return;
    }
    try {
      const result = await api.getStatus();
      setStatusData(result);
      setGateStatus(result.status as GateStatus);
    } catch {
      setGateStatus('error');
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  if (gateStatus === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (gateStatus === 'unavailable') {
    return <>{children}</>;
  }

  if (gateStatus === 'error') {
    return (
      <Result
        status="error"
        title={t('license.errorTitle')}
        subTitle={t('license.errorSubtitle')}
        extra={<Button type="primary" onClick={checkStatus}>{t('license.retry')}</Button>}
      />
    );
  }

  if (gateStatus === 'expired') {
    return <ActivationScreen onActivated={checkStatus} reason={statusData?.reason} />;
  }

  return (
    <>
      {gateStatus === 'trial' && <TrialBanner daysLeft={statusData?.daysLeft ?? 0} />}
      {gateStatus === 'grace' && <TrialBanner daysLeft={0} grace />}
      {children}
    </>
  );
}
