import { useTranslation, Trans } from 'react-i18next';
import { Typography, Collapse, Button, Space, message, Modal } from 'antd';
import { InfoCircleOutlined, DownloadOutlined, UploadOutlined, DeleteOutlined, FileExcelOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { exportAllData, importAllData, clearAllSessions, getAllRooms, getAllTournaments, getAllSessions, getAllBankrollEntries } from '../db/db';

const { Title, Paragraph } = Typography;

const BACKUP_KEY = 'poker-diary-backup';

function autoSave() {
  exportAllData().then((json) => {
    try {
      localStorage.setItem(BACKUP_KEY, json);
    } catch { /* quota exceeded — ignore */ }
  });
}

export default function FaqPage() {
  const { t } = useTranslation();

  const handleExport = async () => {
    const json = await exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poker-diary-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success(t('faq.messages.exported'));
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        await importAllData(text);
        autoSave();
        message.success(t('faq.messages.imported'));
        setTimeout(() => window.location.reload(), 1000);
      } catch {
        message.error(t('faq.messages.importError'));
      }
    };
    input.click();
  };

  const handleClear = () => {
    Modal.confirm({
      title: t('faq.clearModal.title'),
      content: t('faq.clearModal.content'),
      okText: t('faq.clearModal.okText'),
      okType: 'danger',
      cancelText: t('faq.clearModal.cancelText'),
      onOk: async () => {
        try {
          await clearAllSessions();
          message.success(t('faq.messages.clearSuccess'));
          setTimeout(() => window.location.reload(), 1000);
        } catch {
          message.error(t('faq.messages.clearError'));
        }
      },
    });
  };

  const handleExportExcel = async () => {
    try {
      const [rooms, tournaments, sessions, bankroll] = await Promise.all([
        getAllRooms(),
        getAllTournaments(),
        getAllSessions(),
        getAllBankrollEntries(),
      ]);

      const wb = XLSX.utils.book_new();

      const roomsData = rooms.map((r) => ({ ID: r.id, Название: r.name }));
      const roomsWS = XLSX.utils.json_to_sheet(roomsData);
      XLSX.utils.book_append_sheet(wb, roomsWS, 'Румы');

      const toursData = tournaments.map((t) => ({
        ID: t.id, Название: t.name, Рум: t.roomId,
        'Бай-ин': t.buyIn, Валюта: t.currency,
      }));
      const toursWS = XLSX.utils.json_to_sheet(toursData);
      XLSX.utils.book_append_sheet(wb, toursWS, 'Турниры');

      const sessionsData = sessions.map((s) => ({
        ID: s.id, Дата: s.date, 'Турнир': s.tournamentId,
        Место: s.place, 'Выигрыш': s.prize, 'Валюта': s.prizeCurrency,
        'Баунти': s.bountySum, 'Бэкинг': s.backing ? 'Да' : 'Нет',
      }));
      const sessionsWS = XLSX.utils.json_to_sheet(sessionsData);
      XLSX.utils.book_append_sheet(wb, sessionsWS, 'Сессии');

      const bankrollData = bankroll.map((b) => ({
        ID: b.id, Дата: b.date, Рум: b.roomId,
        Сумма: b.amount, Комментарий: b.comment, Валюта: b.currency || 'USD',
      }));
      const bankrollWS = XLSX.utils.json_to_sheet(bankrollData);
      XLSX.utils.book_append_sheet(wb, bankrollWS, 'Операции');

      const fileName = `poker-diary-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success(t('faq.messages.excelExported'));
    } catch {
      message.error(t('faq.messages.excelError'));
    }
  };

  // Auto-save to localStorage on mount as a secondary backup
  setTimeout(autoSave, 500);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        <InfoCircleOutlined /> {t('faq.page.title')}
      </Title>

      <Collapse
        accordion
        defaultActiveKey={['1']}
        style={{ textAlign: 'left' }}
        items={[
          {
            key: '1',
            label: t('faq.room.label'),
            children: (
              <Paragraph>
                {t('faq.room.content')}
              </Paragraph>
            ),
          },
          {
            key: '2',
            label: t('faq.tournament.label'),
            children: (
              <Paragraph>
                {t('faq.tournament.content')}
              </Paragraph>
            ),
          },
          {
            key: '3',
            label: t('faq.session.label'),
            children: (
              <Paragraph>
                {t('faq.session.content')}
              </Paragraph>
            ),
          },
          {
            key: '4',
            label: t('faq.finish.label'),
            children: (
              <Paragraph>
                {t('faq.finish.content')}
              </Paragraph>
            ),
          },
          {
            key: '5',
            label: t('faq.bankroll.label'),
            children: (
              <Paragraph>
                {t('faq.bankroll.content')}
              </Paragraph>
            ),
          },
          {
            key: '6',
            label: t('faq.reports.label'),
            children: (
              <Paragraph>
                {t('faq.reports.intro')}
                <ul>
                  <li><b>{t('faq.reports.list.profitByRoom')}</b> — {t('faq.reports.list.profitByRoomDesc')}</li>
                  <li><b>{t('faq.reports.list.profitByTournament')}</b> — {t('faq.reports.list.profitByTournamentDesc')}</li>
                  <li><b>{t('faq.reports.list.bankroll')}</b> — {t('faq.reports.list.bankrollDesc')}</li>
                  <li><b>{t('faq.reports.list.expenses')}</b> — {t('faq.reports.list.expensesDesc')}</li>
                </ul>
                {t('faq.reports.footer')}
              </Paragraph>
            ),
          },
          {
            key: '7',
            label: t('faq.currencies.label'),
            children: (
              <Paragraph>
                {t('faq.currencies.content')}
              </Paragraph>
            ),
          },
          {
            key: '9',
            label: t('faq.backing.label'),
            children: (
              <Paragraph>
                {t('faq.backing.intro')}
                <ul>
                  <li><b>{t('faq.backing.list.add')}</b> — {t('faq.backing.list.addDesc')}</li>
                  <li><b>{t('faq.backing.list.link')}</b> — {t('faq.backing.list.linkDesc')}</li>
                  <li><b>{t('faq.backing.list.ops')}</b> — {t('faq.backing.list.opsDesc')}</li>
                  <li><b>{t('faq.backing.list.debt')}</b> — {t('faq.backing.list.debtDesc')}</li>
                  <li><b>{t('faq.backing.list.history')}</b> — {t('faq.backing.list.historyDesc')}</li>
                </ul>
              </Paragraph>
            ),
          },
          {
            key: '10',
            label: t('faq.movements.label'),
            children: (
              <Paragraph>
                {t('faq.movements.intro')}
                <ul>
                  <li><b>{t('faq.movements.list.wins')}</b> — {t('faq.movements.list.winsDesc')}</li>
                  <li><b>{t('faq.movements.list.manual')}</b> — {t('faq.movements.list.manualDesc')}</li>
                </ul>
                {t('faq.movements.footer')}
              </Paragraph>
            ),
          },
          {
            key: '8',
            label: t('faq.backup.label'),
            children: (
              <div style={{ textAlign: 'center' }}>
                <Paragraph>
                  <Trans i18nKey="faq.backup.desc1" components={{ code: <code /> }} />
                </Paragraph>
                <Paragraph>
                  {t('faq.backup.desc2')}
                </Paragraph>
                <Paragraph type="secondary">
                  <Trans i18nKey="faq.backup.desc3" components={{ code: <code /> }} />
                </Paragraph>
                <Space size={16} style={{ marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
                    {t('faq.buttons.downloadBackup')}
                  </Button>
                  <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>
                    {t('faq.buttons.exportExcel')}
                  </Button>
                  <Button icon={<UploadOutlined />} onClick={handleImport}>
                    {t('faq.buttons.restore')}
                  </Button>
                </Space>
                <div style={{ marginTop: 24, borderTop: '1px solid #334155', paddingTop: 16 }}>
                  <Button danger icon={<DeleteOutlined />} onClick={handleClear}>
                    {t('faq.buttons.clearSessions')}
                  </Button>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
