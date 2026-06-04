export const GRID_LABELS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;

export function handLabel(r: number, c: number): string {
  if (r === c) return `${GRID_LABELS[r]}${GRID_LABELS[r]}`;
  const higher = r < c ? GRID_LABELS[r] : GRID_LABELS[c];
  const lower = r < c ? GRID_LABELS[c] : GRID_LABELS[r];
  return `${higher}${lower}${r < c ? 's' : 'o'}`;
}

export function isSuited(r: number, c: number): boolean {
  return r < c;
}

export function comboCount(r: number, c: number): number {
  if (r === c) return 6;
  if (r < c) return 4;
  return 12;
}

function rankVal(idx: number): number {
  return 12 - idx;
}

function handVsHand(
  h1High: number, h1Low: number, suited1: boolean, isPair1: boolean,
  h2High: number, h2Low: number, suited2: boolean, isPair2: boolean,
): number {
  if (isPair1 && isPair2) {
    if (h1High === h2High) return 50;
    return h1High > h2High ? 80 : 20;
  }

  if (isPair1 && !isPair2) {
    const overcards = (h2High > h1High ? 1 : 0) + (h2Low > h1High ? 1 : 0);
    if (overcards === 2) return suited2 ? 53 : 55;
    if (overcards === 1) return suited2 ? 66 : 69;
    return suited2 ? 80 : 83;
  }

  if (!isPair1 && isPair2) {
    const overcards = (h1High > h2High ? 1 : 0) + (h1Low > h2High ? 1 : 0);
    if (overcards === 2) return suited1 ? 42 : 40;
    if (overcards === 1) return suited1 ? 30 : 28;
    return suited1 ? 17 : 15;
  }

  let equity = 50;

  if (h1High > h2High && h1Low > h2High) {
    equity += 18;
  } else if (h1High > h2High) {
    equity += 12;
    if (h1Low > h2Low) equity += 3;
  } else if (h2High > h1High && h2Low > h1High) {
    equity -= 18;
  } else if (h2High > h1High) {
    equity -= 12;
    if (h2Low > h1Low) equity -= 3;
  } else {
    const gap = h1Low - h2Low;
    if (gap >= 4) equity += 24;
    else if (gap === 3) equity += 22;
    else if (gap === 2) equity += 20;
    else if (gap === 1) equity += 18;
    else if (gap === 0) {}
    else if (gap <= -4) equity -= 24;
    else if (gap === -3) equity -= 22;
    else if (gap === -2) equity -= 20;
    else if (gap === -1) equity -= 18;
  }

  if (suited1 && !suited2) equity += 2;
  else if (!suited1 && suited2) equity -= 2;

  const gap1 = Math.abs(h1High - h1Low);
  const gap2 = Math.abs(h2High - h2Low);
  if (gap1 <= 2 && gap2 > 2) equity += 1;
  if (gap2 <= 2 && gap1 > 2) equity -= 1;

  return Math.round(Math.max(8, Math.min(92, equity)));
}

export function equityCellVsCell(r1: number, c1: number, r2: number, c2: number): number {
  const h1High = rankVal(Math.min(r1, c1));
  const h1Low = rankVal(Math.max(r1, c1));
  const h2High = rankVal(Math.min(r2, c2));
  const h2Low = rankVal(Math.max(r2, c2));
  return handVsHand(
    h1High, h1Low, r1 < c1, r1 === c1,
    h2High, h2Low, r2 < c2, r2 === c2,
  );
}

export function rangeEquity(heroCells: [number, number][], villainCells: [number, number][]): number {
  if (heroCells.length === 0 || villainCells.length === 0) return 0;

  let totalWeight = 0;
  let weightedEquity = 0;

  for (const [hr, hc] of heroCells) {
    const hCombos = comboCount(hr, hc);
    for (const [vr, vc] of villainCells) {
      const vCombos = comboCount(vr, vc);
      const w = hCombos * vCombos;
      totalWeight += w;
      weightedEquity += equityCellVsCell(hr, hc, vr, vc) * w;
    }
  }

  if (totalWeight === 0) return 50;
  return Math.round((weightedEquity / totalWeight) * 10) / 10;
}
