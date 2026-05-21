import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import Charts from '../components/Charts';

const { Title } = Typography;

export default function ReportsPage() {
  const { t } = useTranslation();
  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>{t('reports.page.title')}</Title>
      <Charts />
    </div>
  );
}
