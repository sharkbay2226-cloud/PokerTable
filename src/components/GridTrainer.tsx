import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button, Select, Typography, Progress, Space } from 'antd';
import { CheckOutlined, CloseOutlined, UndoOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { GridMatrix, CellData } from './GridEditor';

const { Text } = Typography;
const CELL = 38;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getAllCellKeys(m: GridMatrix): string[] {
  const keys: string[] = [];
  for (let r = 0; r < m.rows; r++) {
    for (let c = 0; c < m.cols; c++) {
      keys.push(`${r},${c}`);
    }
  }
  return keys;
}

type Mode = 'classic' | 'drawing';

interface Stats {
  correct: number;
  total: number;
  perColor: Record<string, { correct: number; total: number }>;
}

const sounds = {
  correct: null as HTMLAudioElement | null,
  wrong: null as HTMLAudioElement | null,
};

function playSound(type: 'correct' | 'wrong') {
  try {
    if (!sounds[type]) {
      sounds[type] = new Audio(type === 'correct' ? '/sounds/correct.mp3' : '/sounds/wrong.mp3');
    }
    sounds[type]!.currentTime = 0;
    sounds[type]!.play().catch(() => {});
  } catch {}
}

interface Props {
  matrix: GridMatrix;
}

export default function GridTrainer({ matrix }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('classic');
  const [started, setStarted] = useState(false);
  const [stats, setStats] = useState<Stats>({ correct: 0, total: 0, perColor: {} });
  const [currentKeys, setCurrentKeys] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [drawnCells, setDrawnCells] = useState<Record<string, CellData>>({});
  const [checkResult, setCheckResult] = useState<Record<string, 'match' | 'miss' | 'extra'>>({});
  const [selColor, setSelColor] = useState(matrix.colors[0]?.id ?? '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allKeys = getAllCellKeys(matrix);
  const coloredKeys = allKeys.filter(k => matrix.cells[k]?.colorId);

  const startClassic = useCallback(() => {
    const shuffled = [...coloredKeys].sort(() => Math.random() - 0.5);
    setCurrentKeys(shuffled);
    setCurrentIdx(0);
    setStats({ correct: 0, total: 0, perColor: {} });
    setStarted(true);
    setFeedback(null);
  }, [coloredKeys]);

  const handleClassicAnswer = (colorId: string) => {
    if (!currentKeys[currentIdx]) return;
    const cell = matrix.cells[currentKeys[currentIdx]];
    const isCorrect = cell?.colorId === colorId;
    if (isCorrect) playSound('correct');
    else playSound('wrong');
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setStats(prev => {
      const perColor = { ...prev.perColor };
      const colorKey = cell?.colorId || 'none';
      if (!perColor[colorKey]) perColor[colorKey] = { correct: 0, total: 0 };
      perColor[colorKey].total++;
      if (isCorrect) perColor[colorKey].correct++;
      if (isCorrect) {
        return { correct: prev.correct + 1, total: prev.total + 1, perColor };
      } else {
        return { correct: prev.correct, total: prev.total + 1, perColor };
      }
    });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setFeedback(null);
      if (currentIdx + 1 < currentKeys.length) {
        setCurrentIdx(i => i + 1);
      } else {
        setStarted(false);
      }
    }, 800);
  };

  const getCell = (key: string): CellData => matrix.cells[key] || {};
  const colorById = (id: string) => matrix.colors.find(c => c.id === id);
  const getCellColor = (key: string) => getCell(key).colorId ? colorById(getCell(key).colorId!) : undefined;

  const startDrawing = () => {
    setDrawnCells({});
    setCheckResult({});
    setStats({ correct: 0, total: 0, perColor: {} });
    setStarted(true);
  };

  const paintCell = (key: string) => {
    if (!started || Object.keys(checkResult).length > 0) return;
    setDrawnCells(prev => {
      const next = { ...prev };
      next[key] = { colorId: selColor };
      return next;
    });
  };

  const handleCheck = () => {
    let c = 0;
    let total = 0;
    const result: Record<string, 'match' | 'miss' | 'extra'> = {};
    for (const key of allKeys) {
      const target = getCell(key).colorId;
      const drawn = drawnCells[key]?.colorId;
      if (target) total++;
      if (target && drawn === target) {
        result[key] = 'match';
        c++;
      } else if (target && !drawn) {
        result[key] = 'miss';
      } else if (!target && drawn) {
        result[key] = 'extra';
      }
    }
    setCheckResult(result);
    if (c === total) playSound('correct');
    else playSound('wrong');
    setStats(prev => ({ correct: prev.correct + c, total: prev.total + total, perColor: prev.perColor }));
  };

  const progressPct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  const currentCell = currentKeys[currentIdx] ? (matrix.cells[currentKeys[currentIdx]] || null) : null;
  const currentKey = currentKeys[currentIdx] ?? '';
  const [cr, cc] = currentKey ? currentKey.split(',').map(Number) : [0, 0];
  const currentLabel = useMemo(() => {
    if (!currentKey || cr >= matrix.rowLabels.length || cc >= matrix.colLabels.length) return '';
    const rl = matrix.rowLabels[cr];
    const cl = matrix.colLabels[cc];
    if (cr === cc) return rl + cl;
    if (cr < cc) return rl + cl + 's';
    return cl + rl + 'o';
  }, [currentKey, cr, cc, matrix.rowLabels, matrix.colLabels]);

  // Cleanup timer
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Text style={{ color: '#e2e8f0', fontWeight: 600 }}>{matrix.name}</Text>
        <Select value={mode} onChange={v => { setMode(v); setStarted(false); setFeedback(null); setCheckResult({}); }} style={{ width: 130 }}>
          <Select.Option value="classic">{t('training.classic')}</Select.Option>
          <Select.Option value="drawing">{t('training.drawing')}</Select.Option>
        </Select>
        <div style={{ flex: 1 }} />
        {!started && (
          <Button type="primary" icon={<ReloadOutlined />} onClick={mode === 'classic' ? startClassic : startDrawing}>{t('training.start')}</Button>
        )}
        {started && mode === 'drawing' && Object.keys(checkResult).length === 0 && (
          <Button type="primary" icon={<CheckOutlined />} onClick={handleCheck}>{t('training.check')}</Button>
        )}
        {started && (
          <Button icon={<UndoOutlined />} onClick={() => { setStarted(false); setCheckResult({}); setDrawnCells({}); if (timerRef.current) clearTimeout(timerRef.current); }}>{t('training.stop')}</Button>
        )}
      </div>

      {matrix.description && (
        <div style={{ marginBottom: 12, padding: '6px 12', background: '#1e293b', borderRadius: 6, border: '1px solid #334155' }}>
          <Text style={{ color: '#94a3b8', fontSize: 13 }}>{matrix.description}</Text>
        </div>
      )}

      {stats.total > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ color: '#94a3b8', fontSize: 12 }}>{t('training.accuracy')}: {progressPct}%</Text>
            <Text style={{ color: '#94a3b8', fontSize: 12 }}>{stats.correct}/{stats.total}</Text>
          </div>
          <Progress percent={progressPct} strokeColor="#22c55e" trailColor="#334155" size="small" showInfo={false} />
          {Object.entries(stats.perColor).map(([colorId, s]) => {
            const color = colorById(colorId);
            const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
            return (
              <Text key={colorId} style={{ color: color?.hex || '#94a3b8', fontSize: 11, marginRight: 12 }}>
                {color?.name || colorId}: {pct}% ({s.correct}/{s.total})
              </Text>
            );
          })}
        </div>
      )}

      {mode === 'classic' && (
        <>
          {started && currentKeys.length > 0 ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{currentLabel}</div>
              <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
                {currentIdx + 1} / {currentKeys.length}
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                {matrix.colors.map(color => {
                  const isCorrect = feedback === 'correct' && currentCell?.colorId === color.id;
                  const isWrong = feedback === 'wrong' && currentCell?.colorId === color.id;
                  return (
                    <Button
                      key={color.id}
                      onClick={() => handleClassicAnswer(color.id)}
                      disabled={feedback !== null}
                      style={{
                        background: feedback === null ? color.hex : isCorrect ? color.hex : isWrong ? color.hex : '#334155',
                        border: feedback === 'correct' && currentCell?.colorId === color.id ? '3px solid #22c55e' :
                                feedback === 'wrong' && color.id === currentCell?.colorId ? '3px solid #ef4444' :
                                '2px solid transparent',
                        color: '#fff',
                        fontWeight: 600,
                        minWidth: 80,
                        height: 44,
                        opacity: feedback !== null && !isCorrect && !isWrong ? 0.4 : 1,
                      }}
                    >
                      {color.name || '—'}
                      {feedback !== null && currentCell?.colorId === color.id && (
                        feedback === 'correct' ? <CheckOutlined style={{ marginLeft: 6 }} /> : <CloseOutlined style={{ marginLeft: 6 }} />
                      )}
                    </Button>
                  );
                })}
              </div>

              <div style={{ display: 'inline-block' }}>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: CELL, height: 20 }} />
                  {Array.from({ length: matrix.cols }, (_, c) => (
                    <div key={c} style={{ width: CELL, textAlign: 'center', color: '#64748b', fontSize: 10 }}>{matrix.colLabels[c]}</div>
                  ))}
                </div>
                {Array.from({ length: matrix.rows }, (_, r) => (
                  <div key={r} style={{ display: 'flex' }}>
                    <div style={{ width: CELL, lineHeight: `${CELL}px`, textAlign: 'center', color: '#64748b', fontSize: 10 }}>{matrix.rowLabels[r]}</div>
                    {Array.from({ length: matrix.cols }, (_, c) => {
                      const rowRank = matrix.rowLabels[r];
                      const colRank = matrix.colLabels[c];
                      const hand = r === c ? rowRank + colRank : r < c ? rowRank + colRank + 's' : colRank + rowRank + 'o';
                      const isCurrent = r === cr && c === cc;
                      return (
                        <div
                          style={{
                            width: CELL,
                            height: CELL,
                            background: '#1e293b',
                            border: isCurrent ? '2px solid #3b82f6' : '1px solid #334155',
                            boxShadow: isCurrent ? '0 0 8px rgba(59,130,246,0.6)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 9,
                            fontWeight: 600,
                            color: isCurrent ? '#3b82f6' : '#475569',
                            transition: 'all 0.15s',
                          }}
                        >
                          {hand}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              {coloredKeys.length === 0 ? t('training.noCells') : t('training.clickStart')}
            </div>
          )}
        </>
      )}

      {mode === 'drawing' && (
        <div>
          <div style={{ marginBottom: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {matrix.colors.map(color => (
              <div
                key={color.id}
                onClick={() => setSelColor(color.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6,
                  cursor: 'pointer', background: selColor === color.id ? '#334155' : 'transparent',
                  border: selColor === color.id ? `2px solid ${color.hex}` : '2px solid transparent',
                }}
              >
                <div style={{ width: 16, height: 16, borderRadius: 3, background: color.hex, border: '1px solid #475569' }} />
                <Text style={{ color: '#e2e8f0', fontSize: 11 }}>{color.name || '—'}</Text>
              </div>
            ))}
          </div>

          {Object.keys(checkResult).length > 0 && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
              <Text style={{ color: '#22c55e', fontSize: 14, fontWeight: 600 }}>
                <CheckOutlined /> {Object.values(checkResult).filter(v => v === 'match').length} {t('training.correct')}
              </Text>
              <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: 600 }}>
                <CloseOutlined /> {Object.values(checkResult).filter(v => v === 'miss' || v === 'extra').length} {t('training.wrong')}
              </Text>
            </div>
          )}

          {Object.keys(checkResult).length > 0 && (
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <Text style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginBottom: 6 }}>{t('training.yourAnswer')}</Text>
                <div style={{ overflowX: 'auto', display: 'inline-block' }}>
                  <div style={{ display: 'flex' }}>
                    <div style={{ width: CELL, height: 20 }} />
                    {Array.from({ length: matrix.cols }, (_, c) => (
                      <div key={c} style={{ width: CELL, textAlign: 'center', color: '#64748b', fontSize: 10 }}>{matrix.colLabels[c]}</div>
                    ))}
                  </div>
                  {Array.from({ length: matrix.rows }, (_, r) => (
                    <div key={r} style={{ display: 'flex' }}>
                      <div style={{ width: CELL, lineHeight: `${CELL}px`, textAlign: 'center', color: '#64748b', fontSize: 10 }}>{matrix.rowLabels[r]}</div>
                      {Array.from({ length: matrix.cols }, (_, c) => {
                        const key = `${r},${c}`;
                        const rowRank = matrix.rowLabels[r];
                        const colRank = matrix.colLabels[c];
                        const hand = r === c ? rowRank + colRank : r < c ? rowRank + colRank + 's' : colRank + rowRank + 'o';
                        const drawn = drawnCells[key]?.colorId;
                        const chk = checkResult[key];
                        const bg = drawn ? (colorById(drawn)?.hex || '#1e293b') : '#1e293b';
                        let border = '1px solid #334155';
                        if (chk === 'match') border = '2px solid #22c55e';
                        else if (chk === 'miss' || chk === 'extra') border = '2px solid #ef4444';
                        return (
                          <div style={{
                            width: CELL, height: CELL, background: bg, border,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 600, color: '#e2e8f0', userSelect: 'none',
                          }}>
                            {hand}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Text style={{ color: '#22c55e', fontSize: 11, display: 'block', marginBottom: 6 }}>{t('training.correctAnswer')}</Text>
                <div style={{ overflowX: 'auto', display: 'inline-block' }}>
                  <div style={{ display: 'flex' }}>
                    <div style={{ width: CELL, height: 20 }} />
                    {Array.from({ length: matrix.cols }, (_, c) => (
                      <div key={c} style={{ width: CELL, textAlign: 'center', color: '#64748b', fontSize: 10 }}>{matrix.colLabels[c]}</div>
                    ))}
                  </div>
                  {Array.from({ length: matrix.rows }, (_, r) => (
                    <div key={r} style={{ display: 'flex' }}>
                      <div style={{ width: CELL, lineHeight: `${CELL}px`, textAlign: 'center', color: '#64748b', fontSize: 10 }}>{matrix.rowLabels[r]}</div>
                      {Array.from({ length: matrix.cols }, (_, c) => {
                        const key = `${r},${c}`;
                        const rowRank = matrix.rowLabels[r];
                        const colRank = matrix.colLabels[c];
                        const hand = r === c ? rowRank + colRank : r < c ? rowRank + colRank + 's' : colRank + rowRank + 'o';
                        const targetCell = matrix.cells[key];
                        const bg = targetCell?.colorId ? (colorById(targetCell.colorId)?.hex || '#1e293b') : '#1e293b';
                        return (
                          <div style={{
                            width: CELL, height: CELL, background: bg, border: '1px solid #334155',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 600, color: '#e2e8f0', userSelect: 'none',
                          }}>
                            {hand}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {Object.keys(checkResult).length === 0 && (
            <div style={{ overflowX: 'auto', display: 'inline-block' }}>
              <div style={{ display: 'flex' }}>
                <div style={{ width: CELL, height: 20 }} />
                {Array.from({ length: matrix.cols }, (_, c) => (
                  <div key={c} style={{ width: CELL, textAlign: 'center', color: '#64748b', fontSize: 10 }}>{matrix.colLabels[c]}</div>
                ))}
              </div>
              {Array.from({ length: matrix.rows }, (_, r) => (
                <div key={r} style={{ display: 'flex' }}>
                  <div style={{ width: CELL, lineHeight: `${CELL}px`, textAlign: 'center', color: '#64748b', fontSize: 10 }}>{matrix.rowLabels[r]}</div>
                  {Array.from({ length: matrix.cols }, (_, c) => {
                    const key = `${r},${c}`;
                    const rowRank = matrix.rowLabels[r];
                    const colRank = matrix.colLabels[c];
                    const hand = r === c ? rowRank + colRank : r < c ? rowRank + colRank + 's' : colRank + rowRank + 'o';
                    const drawn = drawnCells[key]?.colorId;
                    const bg = drawn ? (colorById(drawn)?.hex || '#1e293b') : '#1e293b';
                    return (
                      <div
                        key={c}
                        onClick={() => paintCell(key)}
                        onMouseEnter={(e) => { if (e.buttons === 1) paintCell(key); }}
                        style={{
                          width: CELL, height: CELL, background: bg, border: '1px solid #334155',
                          cursor: started ? 'pointer' : 'default', transition: 'background 0.1s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 600, color: '#e2e8f0', userSelect: 'none',
                        }}
                      >
                        {hand}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
