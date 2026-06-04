import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Col, InputNumber, Modal, Row, Space, Typography, message, Popconfirm, Divider } from 'antd';
import { PlusOutlined, TrophyOutlined, CheckCircleOutlined, DeleteOutlined, RollbackOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAllGoals, addGoal, updateGoal, deleteGoal } from '../db/db';
import { getAllSessions, getAllTournaments } from '../db/db';
import { convertToUsd } from '../utils/currency';
import type { Goal } from '../types';

const { Title, Text } = Typography;

export default function GoalsPage() {
  const { t } = useTranslation();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [goalTarget, setGoalTarget] = useState(100);
  const [profitTarget, setProfitTarget] = useState<number | undefined>(undefined);
  const [useProfit, setUseProfit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const load = async () => {
    const [g, s, t] = await Promise.all([getAllGoals(), getAllSessions(), getAllTournaments()]);
    setGoals(g);
    setSessions(s);
    setTournaments(t);
  };

  useEffect(() => { load(); }, []);

  const sessionTs = (s: any): string => s.createdAt || `${s.date}T00:00:00.000Z`;

  const getPlayedCount = (startDate: string, endDate?: string, excludeSessions?: Set<string>): number => {
    return sessions.filter((s) => {
      if (excludeSessions?.has(s.id)) return false;
      if (endDate && sessionTs(s) > endDate) return false;
      return sessionTs(s) >= startDate && s.place > 0;
    }).length;
  };

  const getProfitUsd = (startDate: string, endDate?: string, excludeSessions?: Set<string>): number => {
    const tourMap = new Map(tournaments.map((t) => [t.id, t]));
    const dateSessions = sessions.filter((s) => {
      if (excludeSessions?.has(s.id)) return false;
      if (endDate && sessionTs(s) > endDate) return false;
      return sessionTs(s) >= startDate;
    });
    return dateSessions.reduce((sum: number, s: any) => {
      const tour = tourMap.get(s.tournamentId);
      const buyIn = tour ? convertToUsd(tour.buyIn, tour.currency) : 0;
      const prize = s.place > 0 ? convertToUsd(s.prize, s.prizeCurrency) : 0;
      const bounty = s.place > 0 ? convertToUsd(s.bountySum, s.bountyCurrency) : 0;
      return sum + prize + bounty - buyIn;
    }, 0);
  };

  const handleAddGoal = async () => {
    if (goalTarget < 1 && (!useProfit || !profitTarget || profitTarget < 1)) return;
    setSaving(true);
    try {
      await addGoal({
        targetCount: goalTarget,
        profitTarget: useProfit ? profitTarget : undefined,
        startDate: new Date().toISOString(),
        endDate: null,
        completed: false,
        completedDate: null,
        createdAt: new Date().toISOString(),
      });
      setModalOpen(false);
      setGoalTarget(100);
      setProfitTarget(undefined);
      setUseProfit(false);
      await load();
      message.success(t('goals.page.created'));
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    setGoalTarget(100);
    setProfitTarget(undefined);
    setUseProfit(false);
    setModalOpen(true);
  };

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);

  const completedSessionIds = new Set(
    sessions
      .filter((s) => completedGoals.some((g) => {
        const start = g.createdAt || `${g.startDate}T00:00:00.000Z`;
        const end = g.completedAt || (g.completedDate ? `${g.completedDate}T23:59:59.999Z` : '9999-12-31T23:59:59.999Z');
        return sessionTs(s) >= start && sessionTs(s) <= end;
      }))
      .map((s) => s.id)
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Title level={3} style={{ margin: 0 }}>{t('goals.page.title')}</Title>
          <Button type="text" icon={<QuestionCircleOutlined style={{ color: 'var(--color-accent)', fontSize: 18 }} />} onClick={() => setHelpOpen(true)} />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal} size="large" style={{ height: 48, fontSize: 16, minWidth: 160 }}>
          {t('goals.page.addGoal')}
        </Button>
      </div>

      {activeGoals.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <TrophyOutlined style={{ fontSize: 48, color: 'var(--color-accent)' }} />
          <div style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 16, color: '#94a3b8' }}>{t('goals.page.noGoals')}</Text>
          </div>
        </Card>
      )}

      <Row gutter={[16, 16]}>
        {activeGoals.map((goal) => {
          const played = getPlayedCount(goal.startDate, undefined, completedSessionIds);
          const profit = getProfitUsd(goal.startDate, undefined, completedSessionIds);
          const countMet = goal.targetCount > 0 && played >= goal.targetCount;
          const profitMet = goal.profitTarget ? profit >= goal.profitTarget : false;
          const isComplete = countMet || profitMet;

          if (goal.completed) return null;

          if (isComplete && !goal.completed) {
            const now = new Date().toISOString();
            const today = dayjs().format('YYYY-MM-DD');
            updateGoal(goal.id, { completed: true, completedDate: today, endDate: today, completedAt: now }).then(() => load());
          }

          const countProgress = goal.targetCount > 0 ? Math.min(played / goal.targetCount, 1) : 0;
          const profitProgress = goal.profitTarget ? Math.max(Math.min(profit / goal.profitTarget, 1), 0) : 0;
          const profitOnly = goal.targetCount === 0 && goal.profitTarget != null;

          return (
            <Col key={goal.id} xs={24} sm={12} lg={8}>
              <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', textAlign: 'center', padding: '24px 16px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
                  <Button
                    type="text"
                    size="small"
                    icon={<CheckCircleOutlined style={{ color: '#22c55e' }} />}
                    onClick={async () => {
                      const now = new Date().toISOString();
                      const today = dayjs().format('YYYY-MM-DD');
                      await updateGoal(goal.id, { completed: true, completedDate: today, endDate: today, completedAt: now });
                      await load();
                    }}
                  />
                  <Popconfirm
                    title={t('goals.page.deleteConfirm')}
                    onConfirm={async () => {
                      await deleteGoal(goal.id);
                      await load();
                    }}
                  >
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
                <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>
                  {t('goals.page.startDate')}: {dayjs(goal.startDate).format('DD.MM.YYYY')}
                </div>
                {isComplete && (
                  <div style={{ marginBottom: 8 }}>
                    <CheckCircleOutlined style={{ fontSize: 28, color: '#22c55e' }} />
                  </div>
                )}
                {profitOnly ? (
                  <>
                    <div style={{ fontSize: 36, fontWeight: 700, color: profit >= 0 ? '#22c55e' : '#ef4444', margin: '8px 0' }}>
                      {(profit >= 0 ? '+' : '')}{profit.toFixed(2)}$
                      <span style={{ fontSize: 24, color: '#94a3b8' }}> / {(goal.profitTarget ?? 0) > 0 ? '+' : ''}{(goal.profitTarget ?? 0).toFixed(2)}$</span>
                    </div>
                    <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 4 }}>
                      {t('goals.page.profitLabel')}
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#334155', overflow: 'hidden', marginBottom: 16 }}>
                      <div style={{ height: '100%', borderRadius: 3, background: profitProgress > 0 ? 'linear-gradient(90deg, #d4a843, #22c55e)' : '#ef4444', width: `${profitProgress * 100}%`, transition: 'width 0.5s ease' }} />
                    </div>
                    <Divider style={{ borderColor: '#334155', margin: '8px 0' }} />
                    <div style={{ fontSize: 16, color: '#94a3b8', margin: '4px 0' }}>
                      {played} {t('goals.page.tournamentsPlayed')}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 36, fontWeight: 700, color: countMet ? '#22c55e' : '#3b82f6', margin: '8px 0' }}>
                      {played}
                      <span style={{ fontSize: 24, color: '#94a3b8' }}> / {goal.targetCount}</span>
                    </div>
                    <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 4 }}>
                      {t('goals.page.tournamentsPlayed')}
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#334155', overflow: 'hidden', marginBottom: 16 }}>
                      <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #3b82f6, #22c55e)', width: `${countProgress * 100}%`, transition: 'width 0.5s ease' }} />
                    </div>
                    <Divider style={{ borderColor: '#334155', margin: '8px 0' }} />
                    <div style={{ fontSize: 28, fontWeight: 700, color: profit >= 0 ? '#22c55e' : '#ef4444', margin: '8px 0' }}>
                      {(profit >= 0 ? '+' : '')}{profit.toFixed(2)}$
                      {goal.profitTarget != null && (
                        <span style={{ fontSize: 18, color: '#94a3b8' }}> / {(goal.profitTarget >= 0 ? '+' : '')}{goal.profitTarget.toFixed(2)}$</span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 4 }}>
                      {t('goals.page.profitLabel')}
                    </div>
                    {goal.profitTarget != null && (
                      <div style={{ height: 6, borderRadius: 3, background: '#334155', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, background: profitProgress > 0 ? 'linear-gradient(90deg, #d4a843, #22c55e)' : '#ef4444', width: `${profitProgress * 100}%`, transition: 'width 0.5s ease' }} />
                      </div>
                    )}
                  </>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>

      {completedGoals.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div
            onClick={() => setCompletedExpanded(!completedExpanded)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, userSelect: 'none' }}
          >
            <Title level={4} style={{ color: '#94a3b8', margin: 0 }}>{t('goals.page.completedTitle')} ({completedGoals.length})</Title>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{completedExpanded ? '▲' : '▼'}</span>
          </div>
          {completedExpanded && (
            <>
              <Row gutter={[16, 16]}>
                {completedGoals.map((goal) => {
                  const endTs = goal.completedAt || (goal.completedDate ? `${goal.completedDate}T23:59:59.999Z` : undefined);
                  const played = getPlayedCount(goal.startDate, endTs);
                  const profit = getProfitUsd(goal.startDate, endTs);
                  const countMet = goal.targetCount > 0 && played >= goal.targetCount;
                  const profitMet = goal.profitTarget ? profit >= goal.profitTarget : false;
                  const wasIncomplete = !countMet && !profitMet;
              return (
                <Col key={goal.id} xs={12} sm={8} lg={6}>
                  <Card style={{
                    background: 'var(--color-surface-card)',
                    border: '1px solid var(--color-accent)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    position: 'relative',
                  }}>
                    <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
                      {wasIncomplete && (
                        <Button
                          type="text"
                          size="small"
                          icon={<RollbackOutlined style={{ color: 'var(--color-accent)' }} />}
                          onClick={async () => {
                            await updateGoal(goal.id, { completed: false, completedDate: null, completedAt: undefined, endDate: null });
                            await load();
                          }}
                        />
                      )}
                      <Popconfirm
                        title={t('goals.page.deleteConfirm')}
                        onConfirm={async () => {
                          await deleteGoal(goal.id);
                          await load();
                        }}
                      >
                        <Button type="text" danger size="small" icon={<DeleteOutlined style={{ fontSize: 12 }} />} />
                      </Popconfirm>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <CheckCircleOutlined style={{ fontSize: 16, color: 'var(--color-accent)' }} />
                      <Text style={{ fontSize: 12, color: 'var(--color-accent)' }}>
                        {dayjs(goal.startDate).format('DD.MM')}
                        {goal.completedDate ? ` – ${dayjs(goal.completedDate).format('DD.MM')}` : ''}
                      </Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-accent)' }}>
                        {played}{goal.targetCount > 0 ? <> / {goal.targetCount}</> : ''}
                      </span>
                      <span style={{ fontSize: 18, fontWeight: 600, color: profit >= 0 ? '#22c55e' : '#ef4444' }}>
                        {(profit >= 0 ? '+' : '')}{profit.toFixed(2)}$
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                      {t('goals.page.tournamentsPlayed')} · {t('goals.page.profitLabel')}
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
            </>
          )}
        </div>
      )}

      <Modal
        title={t('goals.page.addGoal')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleAddGoal}
        confirmLoading={saving}
        okText={t('goals.page.create')}
        cancelText={t('goals.page.cancel')}
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={4}>
              <Text style={{ fontSize: 14 }}>{t('goals.page.setTarget')}</Text>
              <InputNumber
                value={goalTarget}
                onChange={(v) => setGoalTarget(v ?? 0)}
                min={0}
                size="large"
                style={{ width: '100%', fontSize: 16 }}
                placeholder={t('goals.page.targetCountPlaceholder')}
              />
            </Space>
          </div>
          <Divider style={{ borderColor: '#334155', margin: '8px 0' }} />
          <div>
            <Space direction="vertical" style={{ width: '100%' }} size={4}>
              <Text style={{ fontSize: 14 }}>{t('goals.page.setProfitTarget')}</Text>
              <InputNumber
                value={profitTarget}
                onChange={(v) => {
                  setProfitTarget(v ?? undefined);
                  setUseProfit(v !== null && v !== undefined && v > 0);
                }}
                min={0}
                size="large"
                style={{ width: '100%', fontSize: 16 }}
                placeholder={t('goals.page.profitTargetPlaceholder')}
              />
            </Space>
          </div>
        </div>
      </Modal>

      <Modal title={<span style={{ color: 'var(--color-accent)' }}>{t('goals.help.title')}</span>} open={helpOpen} onCancel={() => setHelpOpen(false)} footer={null} width={520}>
        <Typography.Paragraph>{t('goals.help.intro')}</Typography.Paragraph>
        <Typography.Paragraph>
          <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{t('goals.help.create')}</span><br />
          {t('goals.help.createDesc')}
        </Typography.Paragraph>
        <Typography.Paragraph>
          <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{t('goals.help.active')}</span><br />
          {t('goals.help.activeDesc')}
        </Typography.Paragraph>
        <Typography.Paragraph>
          <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{t('goals.help.completed')}</span><br />
          {t('goals.help.completedDesc')}
        </Typography.Paragraph>
      </Modal>
    </div>
  );
}