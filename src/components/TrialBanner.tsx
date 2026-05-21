import { useState } from 'react';
import { Alert, Button, Modal } from 'antd';
import { KeyOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import ActivationForm from './ActivationForm';

interface Props {
  daysLeft: number;
  grace?: boolean;
}

export default function TrialBanner({ daysLeft, grace }: Props) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);

  const handleActivated = () => {
    setModalOpen(false);
    window.location.reload();
  };

  const bannerAction = (
    <>
      <Button size="small" icon={<KeyOutlined />} onClick={() => setModalOpen(true)}>
        {t('license.enterKeyBtn')}
      </Button>
      <Button size="small" icon={<ShoppingCartOutlined />} onClick={() => window.licenseAPI?.openPurchase()}>
        {t('license.buyBtn')}
      </Button>
    </>
  );

  if (grace) {
    return (
      <>
        <Alert type="warning" showIcon message={t('license.graceMessage')} action={bannerAction} banner closable />
        <Modal open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={480} title={t('license.activateTitle')} destroyOnClose>
          <ActivationForm onActivated={handleActivated} compact />
        </Modal>
      </>
    );
  }

  const isUrgent = daysLeft <= 3;
  const message = daysLeft <= 0
    ? t('license.trialExpired')
    : t('license.trialDaysLeft', { days: daysLeft });

  return (
    <>
      <Alert type={isUrgent ? 'warning' : 'info'} showIcon message={message} action={bannerAction} banner closable />
      <Modal open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={480} title={t('license.activateTitle')} destroyOnClose>
        <ActivationForm onActivated={handleActivated} compact />
      </Modal>
    </>
  );
}
