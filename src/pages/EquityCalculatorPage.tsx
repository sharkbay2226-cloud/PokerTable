import { useState, useEffect } from 'react';
import { Typography, Modal, Button, Space, Card as AntCard, Tabs, InputNumber, Statistic, Row, Col, Progress, Alert, Descriptions, Segmented } from 'antd';
import { useTranslation } from 'react-i18next';
import { QuestionCircleOutlined, PercentageOutlined, CalculatorOutlined, DollarOutlined, GiftOutlined, FundOutlined } from '@ant-design/icons';
import type { Card as CardType } from '../data/handEval';
import HandGrid from '../components/HandGrid';
import CardPicker from '../components/CardPicker';
import RangeBreakdown from '../components/RangeBreakdown';
import { rangeEquity } from '../data/preflopEquity';
import { analyzeRange, monteCarloEquity, heroHandVsRangeEquity, classifyHandAll } from '../data/boardAnalysis';

const { Title, Text } = Typography;

function potOddsPercent(call: number, pot: number) {
  if (pot + call === 0) return 0;
  return (call / (pot + call)) * 100;
}

export default function EquityCalculatorPage() {
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);

  const [bbSize, setBbSize] = useState(100);
  const [displayMode, setDisplayMode] = useState<string>('chips');

  const [heroHands, setHeroHands] = useState<Set<string>>(new Set(['0,0']));
  const [villainHands, setVillainHands] = useState<Set<string>>(new Set(['1,1']));

  const [boardCards, setBoardCards] = useState<CardType[]>([]);
  const [heroCards, setHeroCards] = useState<CardType[]>([]);
  const [allSelectedCards, setAllSelectedCards] = useState<CardType[]>([]);
  const [rangeAnalysis, setRangeAnalysis] = useState<Awaited<ReturnType<typeof analyzeRange>> | null>(null);
  const TOP_CATS = [
  'Royal Flush', 'Straight Flush', 'Quads', 'Full House', 'Flush', 'Straight',
  'Set', 'Trips', 'Two Pair',
  'Overpair', 'Top Pair', 'Middle Pair', 'Bottom Pair', 'Pair', 'Paired Board',
];
const OTHER_CATS = [
  'Flush Draw + OESD', 'Flush Draw + Gutshot', 'Two Overcards + Flush Draw',
  'Flush Draw', 'Backdoor Flush Draw',
  'OESD', 'Gutshot',
  'Overcards', 'One Overcard',
  'Nothing',
];

const [equity, setEquity] = useState<number | null>(null);
  const [equityLoading, setEquityLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('equity');
  const [highlightedCells, setHighlightedCells] = useState<Set<string> | undefined>(undefined);

  const handleHoverCategory = (cat: string | null) => {
    if (!cat || !rangeAnalysis) {
      setHighlightedCells(undefined);
      return;
    }
    const cells = rangeAnalysis.categoryCells[cat];
    if (cells) setHighlightedCells(new Set(cells));
    else setHighlightedCells(undefined);
  };

  const heroArr: [number, number][] = Array.from(heroHands).map(k => {
    const [r, c] = k.split(',').map(Number);
    return [r, c];
  });
  const villainArr: [number, number][] = Array.from(villainHands).map(k => {
    const [r, c] = k.split(',').map(Number);
    return [r, c];
  });
  const calcEquity = rangeEquity(heroArr, villainArr);

  const analysisHeroCards = allSelectedCards.slice(0, 2);
  const analysisBoardCards = allSelectedCards.slice(2);
  const heroCategories = analysisHeroCards.length === 2 && analysisBoardCards.length >= 3
    ? new Set([classifyHandAll(analysisHeroCards, analysisBoardCards)[0]])
    : new Set<string>();

  useEffect(() => {
    if (activeTab === 'analysis') {
      if (analysisHeroCards.length === 2 && analysisBoardCards.length >= 3 && analysisBoardCards.length <= 5 && heroArr.length > 0) {
        setEquityLoading(true);
        const analysis = analyzeRange(heroArr, analysisBoardCards);
        setRangeAnalysis(analysis);
        setHighlightedCells(undefined);
        heroHandVsRangeEquity(analysisHeroCards, heroArr, analysisBoardCards, 5000).then(eq => {
          setEquity(eq);
          setEquityLoading(false);
        });
      } else {
        setRangeAnalysis(null);
        setHighlightedCells(undefined);
        setEquity(null);
        setEquityLoading(false);
      }
    }
  }, [allSelectedCards, heroHands, activeTab]);

  const [eqPot, setEqPot] = useState(200);
  const [eqCall, setEqCall] = useState(50);
  const eqRequired = potOddsPercent(eqCall, eqPot);
  const eqProfitable = calcEquity >= eqRequired;

  const [poPot, setPoPot] = useState(200);
  const [poCall, setPoCall] = useState(50);
  const poRequired = potOddsPercent(poCall, poPot);
  const poRatio = poCall > 0 ? `${(poPot / poCall).toFixed(1)}:1` : '∞:1';

  const [bPot, setBPot] = useState(200);
  const [bCall, setBCall] = useState(50);
  const [bBounty, setBBounty] = useState(100);
  const [bEquity, setBEquity] = useState(40);
  const bAdjPot = bPot + bBounty;
  const bRequired = potOddsPercent(bCall, bAdjPot);
  const bProfitable = bEquity >= bRequired;

  const [mPot, setMPot] = useState(200);
  const [mCall, setMCall] = useState(50);
  const [mEquity, setMEquity] = useState(40);
  const [mMinB, setMMinB] = useState(50);
  const [mMaxB, setMMaxB] = useState(250);
  const mAvgB = (mMinB + mMaxB) / 2;
  const mAdjPot = mPot + mAvgB;
  const mRequired = potOddsPercent(mCall, mAdjPot);
  const mProfitable = mEquity >= mRequired;
  const mEV = (mEquity / 100) * (mAdjPot + mCall) - mCall;
  const mMinReq = potOddsPercent(mCall, mPot + mMinB);
  const mMaxReq = potOddsPercent(mCall, mPot + mMaxB);

  const ins: React.CSSProperties = { width: '100%' };
  const card: React.CSSProperties = { background: 'var(--color-surface-card)', height: '100%' };
  const lbl: React.CSSProperties = { color: '#888', marginBottom: 4, display: 'block' };

  const fmtVal = (v: number) => {
    if (displayMode === 'bb') return `${(v / bbSize).toFixed(1)} ${t('equity.bb')}`;
    return `${v.toLocaleString()} ${t('equity.chips')}`;
  };
  const toChips = (v: number | null) => displayMode === 'bb' ? (v || 0) * bbSize : (v || 0);
  const fromChips = (v: number) => displayMode === 'bb' ? v / bbSize : v;

  const addon = displayMode === 'bb' ? t('equity.bb') : t('equity.chips');

  const numInput = (
    val: number,
    setter: (n: number) => void,
    opts?: { min?: number; addonAfter?: string }
  ) => (
    <InputNumber
      value={Number(fromChips(val).toFixed(displayMode === 'bb' ? 1 : 0))}
      onChange={v => setter(toChips(v))}
      addonAfter={opts?.addonAfter || addon}
      style={ins}
      min={opts?.min ?? 0}
    />
  );

  return (
    <div>
      <Space style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>{t('equity.page.title')}</Title>
        <Button type="text" icon={<QuestionCircleOutlined style={{ color: 'var(--color-accent)', fontSize: 18 }} />} onClick={() => setHelpOpen(true)} />
      </Space>

      <div style={{ marginBottom: 16 }}>
        <Segmented
          value={displayMode}
          onChange={v => setDisplayMode(v as string)}
          options={[
            { value: 'chips', label: t('equity.chips') },
            { value: 'bb', label: t('equity.bb') },
          ]}
          size="large"
          style={{ fontWeight: 600 }}
        />
      </div>

      <Tabs
        defaultActiveKey="equity"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'equity',
            label: <span><PercentageOutlined /> {t('equity.tabs.equity')}</span>,
            children: (
              <>
                <Row gutter={[24, 24]}>
                  <Col xs={24} md={12}>
                    <div style={{ overflowX: 'auto' }}>
                      <HandGrid selected={heroHands} onChange={setHeroHands} label={t('equity.heroRange')} />
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div style={{ overflowX: 'auto' }}>
                      <HandGrid selected={villainHands} onChange={setVillainHands} label={t('equity.villainRange')} />
                    </div>
                  </Col>
                </Row>

                <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                  <Col xs={24} md={8}>
                    <AntCard title={t('equity.inputs')} style={card} size="small">
                      <label style={lbl}>{t('equity.potSize')}</label>
                      {numInput(eqPot, setEqPot)}
                      <div style={{ height: 12 }} />
                      <label style={lbl}>{t('equity.callAmount')}</label>
                      {numInput(eqCall, setEqCall)}
                    </AntCard>
                  </Col>
                  <Col xs={24} md={16}>
                    <AntCard title={t('equity.result')} style={card} size="small">
                      <Row gutter={[16, 16]}>
                        <Col xs={12} md={6}>
                          <Statistic title={t('equity.potOdds')} value={`${eqRequired.toFixed(1)}%`} />
                        </Col>
                        <Col xs={12} md={6}>
                          <Statistic title={t('equity.requiredEquity')} value={`${eqRequired.toFixed(1)}%`} />
                        </Col>
                        <Col xs={12} md={6}>
                          <Statistic title={t('equity.yourEquity')} value={`${calcEquity}%`} valueStyle={{ color: 'var(--color-accent)' }} />
                        </Col>
                        <Col xs={12} md={6}>
                          <Statistic
                            title={t('equity.decision')}
                            value={eqProfitable ? t('equity.call') : t('equity.fold')}
                            valueStyle={{ color: eqProfitable ? 'var(--color-profit)' : 'var(--color-loss)' }}
                          />
                        </Col>
                      </Row>
                      <div style={{ marginTop: 16 }}>
                        <Text strong>{t('equity.requiredEquity')}: {eqRequired.toFixed(1)}%</Text>
                        <Progress percent={Number(eqRequired.toFixed(1))} showInfo={false} strokeColor={eqProfitable ? 'var(--color-profit)' : 'var(--color-loss)'} style={{ marginTop: 4 }} />
                        <div style={{ marginTop: 12 }}>
                          <Text strong>{t('equity.youHave')}: {calcEquity}%</Text>
                          <Progress percent={calcEquity} showInfo={false} strokeColor={eqProfitable ? 'var(--color-profit)' : 'var(--color-loss)'} style={{ marginTop: 4 }} />
                        </div>
                        {eqProfitable ? (
                          <Alert type="success" message={t('equity.profitableCall')} style={{ marginTop: 16 }} showIcon />
                        ) : (
                          <Alert type="error" message={t('equity.unprofitableCall')} style={{ marginTop: 16 }} showIcon />
                        )}
                      </div>
                    </AntCard>
                  </Col>
                </Row>
              </>
            ),
          },
          {
            key: 'potodds',
            label: <span><CalculatorOutlined /> {t('equity.tabs.potOdds')}</span>,
            children: (
              <Row gutter={[24, 24]}>
                <Col xs={24} md={8}>
                  <AntCard title={t('equity.inputs')} style={card} size="small">
                    <label style={lbl}>{t('equity.potSize')}</label>
                    {numInput(poPot, setPoPot)}
                    <div style={{ height: 12 }} />
                    <label style={lbl}>{t('equity.callAmount')}</label>
                    {numInput(poCall, setPoCall)}
                  </AntCard>
                </Col>
                <Col xs={24} md={16}>
                  <AntCard title={t('equity.result')} style={card} size="small">
                    <Row gutter={[16, 16]}>
                      <Col xs={12} md={6}>
                        <Statistic title={t('equity.potOdds')} value={poRatio} />
                      </Col>
                      <Col xs={12} md={6}>
                        <Statistic title={t('equity.potOddsPercent')} value={`${poRequired.toFixed(1)}%`} />
                      </Col>
                      <Col xs={12} md={6}>
                        <Statistic title={t('equity.requiredEquity')} value={`${poRequired.toFixed(1)}%`} />
                      </Col>
                      <Col xs={12} md={6}>
                        <Statistic title={t('equity.youNeed')} value={fmtVal(poCall)} valueStyle={{ color: 'var(--color-accent)', fontSize: 16 }} />
                      </Col>
                    </Row>
                    <div style={{ marginTop: 16 }}>
                      <Text>{t('equity.potOddsDesc', { chips: fmtVal(poCall), pot: fmtVal(poPot), required: poRequired.toFixed(1) })}</Text>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <Alert type="info" message={t('equity.potOddsTip', { ratio: poRatio, required: poRequired.toFixed(1) })} showIcon />
                    </div>
                  </AntCard>
                </Col>
              </Row>
            ),
          },
          {
            key: 'bounty',
            label: <span><DollarOutlined /> {t('equity.tabs.bounty')}</span>,
            children: (
              <Row gutter={[24, 24]}>
                <Col xs={24} md={8}>
                  <AntCard title={t('equity.inputs')} style={card} size="small">
                    <label style={lbl}>{t('equity.potSize')}</label>
                    {numInput(bPot, setBPot)}
                    <div style={{ height: 12 }} />
                    <label style={lbl}>{t('equity.callAmount')}</label>
                    {numInput(bCall, setBCall)}
                    <div style={{ height: 12 }} />
                    <label style={lbl}>{t('equity.bountyAmount')}</label>
                    {numInput(bBounty, setBBounty)}
                    <div style={{ height: 12 }} />
                    <label style={lbl}>{t('equity.yourEquity')}</label>
                    <InputNumber value={bEquity} onChange={v => setBEquity(Number(v))} addonAfter="%" style={ins} min={0} max={100} />
                  </AntCard>
                </Col>
                <Col xs={24} md={16}>
                  <AntCard title={t('equity.result')} style={card} size="small">
                    <Row gutter={[16, 16]}>
                      <Col xs={12} md={4}>
                        <Statistic title={t('equity.potSize')} value={fmtVal(bPot)} valueStyle={{ fontSize: 14 }} />
                      </Col>
                      <Col xs={12} md={5}>
                        <Statistic title={t('equity.adjustedPot')} value={fmtVal(bAdjPot)} valueStyle={{ color: 'var(--color-accent)', fontSize: 14 }} />
                      </Col>
                      <Col xs={12} md={5}>
                        <Statistic title={t('equity.requiredEquity')} value={`${bRequired.toFixed(1)}%`} />
                      </Col>
                      <Col xs={12} md={5}>
                        <Statistic title={t('equity.yourEquity')} value={`${bEquity}%`} />
                      </Col>
                      <Col xs={12} md={5}>
                        <Statistic
                          title={t('equity.decision')}
                          value={bProfitable ? t('equity.call') : t('equity.fold')}
                          valueStyle={{ color: bProfitable ? 'var(--color-profit)' : 'var(--color-loss)' }}
                        />
                      </Col>
                    </Row>
                    <div style={{ marginTop: 16 }}>
                      <Descriptions column={1} size="small" bordered>
                        <Descriptions.Item label={t('equity.potSize')}>{fmtVal(bPot)}</Descriptions.Item>
                        <Descriptions.Item label={t('equity.bountyAmount')}>{fmtVal(bBounty)}</Descriptions.Item>
                        <Descriptions.Item label={t('equity.adjustedPot')}>{fmtVal(bAdjPot)}</Descriptions.Item>
                        <Descriptions.Item label={t('equity.requiredEquity')}>{bRequired.toFixed(1)}%</Descriptions.Item>
                      </Descriptions>
                      {bProfitable ? (
                        <Alert type="success" message={t('equity.bountyProfitable')} style={{ marginTop: 16 }} showIcon />
                      ) : (
                        <Alert type="error" message={t('equity.bountyUnprofitable')} style={{ marginTop: 16 }} showIcon />
                      )}
                    </div>
                  </AntCard>
                </Col>
              </Row>
            ),
          },
          {
            key: 'mystery',
            label: <span><GiftOutlined /> {t('equity.tabs.mystery')}</span>,
            children: (
              <Row gutter={[24, 24]}>
                <Col xs={24} md={8}>
                  <AntCard title={t('equity.inputs')} style={card} size="small">
                    <label style={lbl}>{t('equity.potSize')}</label>
                    {numInput(mPot, setMPot)}
                    <div style={{ height: 12 }} />
                    <label style={lbl}>{t('equity.callAmount')}</label>
                    {numInput(mCall, setMCall)}
                    <div style={{ height: 12 }} />
                    <label style={lbl}>{t('equity.minBounty')}</label>
                    {numInput(mMinB, setMMinB)}
                    <div style={{ height: 12 }} />
                    <label style={lbl}>{t('equity.maxBounty')}</label>
                    {numInput(mMaxB, setMMaxB)}
                    <div style={{ height: 12 }} />
                    <label style={lbl}>{t('equity.yourEquity')}</label>
                    <InputNumber value={mEquity} onChange={v => setMEquity(Number(v))} addonAfter="%" style={ins} min={0} max={100} />
                  </AntCard>
                </Col>
                <Col xs={24} md={16}>
                  <AntCard title={t('equity.result')} style={card} size="small">
                    <Row gutter={[16, 16]}>
                      <Col xs={12} md={4}>
                        <Statistic title={t('equity.avgBounty')} value={fmtVal(mAvgB)} valueStyle={{ color: 'var(--color-accent)', fontSize: 14 }} />
                      </Col>
                      <Col xs={12} md={5}>
                        <Statistic title={t('equity.adjustedPot')} value={fmtVal(mAdjPot)} valueStyle={{ color: 'var(--color-accent)', fontSize: 14 }} />
                      </Col>
                      <Col xs={12} md={5}>
                        <Statistic title={t('equity.reqEquityRange')} value={`${mMinReq.toFixed(1)}% - ${mMaxReq.toFixed(1)}%`} />
                      </Col>
                      <Col xs={12} md={5}>
                        <Statistic
                          title={t('equity.ev')}
                          value={fmtVal(mEV)}
                          valueStyle={{ color: mEV >= 0 ? 'var(--color-profit)' : 'var(--color-loss)', fontSize: 14 }}
                        />
                      </Col>
                      <Col xs={12} md={5}>
                        <Statistic
                          title={t('equity.decision')}
                          value={mProfitable ? t('equity.call') : t('equity.fold')}
                          valueStyle={{ color: mProfitable ? 'var(--color-profit)' : 'var(--color-loss)' }}
                        />
                      </Col>
                    </Row>
                    <div style={{ marginTop: 16 }}>
                      <Progress percent={Number(mMinReq.toFixed(0))} format={() => `${mMinReq.toFixed(1)}% (${t('equity.minLabel')})`} strokeColor="var(--color-accent)" />
                      <Progress percent={Number(mMaxReq.toFixed(0))} format={() => `${mMaxReq.toFixed(1)}% (${t('equity.maxLabel')})`} strokeColor="var(--color-accent)" style={{ marginTop: 8 }} />
                      {mProfitable ? (
                        <Alert type="success" message={t('equity.mysteryProfitable', { ev: fmtVal(mEV) })} style={{ marginTop: 16 }} showIcon />
                      ) : (
                        <Alert type="warning" message={t('equity.mysteryUnprofitable', { ev: fmtVal(mEV) })} style={{ marginTop: 16 }} showIcon />
                      )}
                    </div>
                  </AntCard>
                </Col>
              </Row>
            ),
          },
          {
            key: 'analysis',
            label: <span><FundOutlined /> {t('equity.tabs.analysis')}</span>,
            children: (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32 }}>
                  <div>
                    <HandGrid selected={heroHands} onChange={setHeroHands} label={t('equity.opponentRange')} highlightedCells={highlightedCells} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <CardPicker
                      selected={allSelectedCards}
                      onChange={setAllSelectedCards}
                      maxCards={7}
                      label={t('equity.selectHeroCards')}
                      sections={[
                        { count: 2, label: t('equity.heroRange'), color: '#22c55e' },
                        { count: 5, label: t('equity.boardCards'), color: 'var(--color-accent)' },
                      ]}
                    />
                    {equity !== null && (
                      <div style={{ padding: '8px 16px', background: '#0c1420', borderRadius: 6, border: '1px solid #2a2d33', textAlign: 'center' }}>
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>{t('equity.equityVsRandom')}: </span>
                        <span style={{ fontSize: 18, fontWeight: 700, color: equity > 50 ? 'var(--color-profit)' : equity > 40 ? 'var(--color-accent)' : 'var(--color-loss)' }}>
                          {equity.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {equityLoading && (
                      <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center' }}>
                        {t('equity.calculatingEquity')}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                  <RangeBreakdown
                    analysis={rangeAnalysis}
                    onHoverCategory={handleHoverCategory}
                    categories={TOP_CATS}
                    title="Top"
                    highlightedCats={heroCategories}
                  />
                  <RangeBreakdown
                    analysis={rangeAnalysis}
                    onHoverCategory={handleHoverCategory}
                    categories={OTHER_CATS}
                    title="Other"
                    highlightedCats={heroCategories}
                  />
                </div>
              </>
            ),
          },
        ]}
      />

      <Modal
        title={<span style={{ color: 'var(--color-accent)' }}>{t('equity.help.title')}</span>}
        open={helpOpen}
        onCancel={() => setHelpOpen(false)}
        footer={null}
        width={520}
      >
        <Typography.Paragraph>{t('equity.help.intro')}</Typography.Paragraph>
        <Typography.Paragraph>
          <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{t('equity.help.equity')}</span><br />
          {t('equity.help.equityDesc')}
        </Typography.Paragraph>
        <Typography.Paragraph>
          <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{t('equity.help.potOdds')}</span><br />
          {t('equity.help.potOddsDesc')}
        </Typography.Paragraph>
        <Typography.Paragraph>
          <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{t('equity.help.bounty')}</span><br />
          {t('equity.help.bountyDesc')}
        </Typography.Paragraph>
        <Typography.Paragraph>
          <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{t('equity.help.mystery')}</span><br />
          {t('equity.help.mysteryDesc')}
        </Typography.Paragraph>
        <Typography.Paragraph>
          <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{t('equity.help.analysis')}</span><br />
          {t('equity.help.analysisDesc')}
        </Typography.Paragraph>
      </Modal>
    </div>
  );
}
