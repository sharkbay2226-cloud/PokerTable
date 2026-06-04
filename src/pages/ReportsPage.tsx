import { useState } from 'react';
import { Typography, Modal, Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { QuestionCircleOutlined } from '@ant-design/icons';
import Charts from '../components/Charts';

const { Title, Text } = Typography;

export default function ReportsPage() {
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <div>
      <Space style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>{t('reports.page.title')}</Title>
        <Button type="text" icon={<QuestionCircleOutlined style={{ color: 'var(--color-accent)', fontSize: 18 }} />} onClick={() => setHelpOpen(true)} />
      </Space>
      <Charts />

      <Modal title={<span style={{ color: 'var(--color-accent)' }}>{t('reports.help.title')}</span>} open={helpOpen} onCancel={() => setHelpOpen(false)} footer={null} width={520}>
        <Typography.Paragraph>{t('reports.help.intro')}</Typography.Paragraph>
        <Typography.Paragraph>
          <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{t('reports.help.graphs')}</span><br />
          {t('reports.help.graphsDesc')}
        </Typography.Paragraph>
        <Typography.Paragraph>
          <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{t('reports.help.filters')}</span><br />
          {t('reports.help.filtersDesc')}
        </Typography.Paragraph>
      </Modal>
    </div>
  );
}
