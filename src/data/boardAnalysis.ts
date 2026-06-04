import { Card, evaluateBest, RANK_NAMES, SUIT_SYMBOLS, HAND_TYPE_NAMES, type HandResult } from './handEval';
import { GRID_LABELS } from './preflopEquity';

export interface HandClass {
  category: string;
  detail: string;
}

function pairClass(pairRank: number, holeRanks: number[], boardRanks: number[]): string {
  const maxBoard = Math.max(...boardRanks);
  const minBoard = Math.min(...boardRanks);
  const allBoard = boardRanks.every(r => r === boardRanks[0]);
  const pairFromBoard = boardRanks.filter(r => r === pairRank).length >= 2;
  const pairFromHole = holeRanks[0] === holeRanks[1];
  const pairUsesHole = holeRanks.includes(pairRank);

  if (pairFromHole && pairRank > maxBoard) return 'Overpair';
  if (pairUsesHole && pairRank === maxBoard) return 'Top Pair';
  if (pairUsesHole && pairRank === minBoard && boardRanks.length > 1) return 'Bottom Pair';
  if (pairUsesHole && boardRanks.length >= 3) return 'Middle Pair';
  if (pairFromBoard && !pairUsesHole) return 'Paired Board';
  if (pairUsesHole) return 'Pair';
  if (pairFromBoard) return 'Paired Board';
  return 'Pair';
}

function hasFlushDraw(cards: Card[]): boolean {
  const cnt = [0, 0, 0, 0];
  for (const c of cards) cnt[c.suit]++;
  return cnt.some(c => c === 4);
}

function hasStraightDraw(ranks: number[]): number {
  const u = [...new Set(ranks.map(r => r === 14 ? 1 : r))].sort((a, b) => a - b);

  for (let i = 0; i <= u.length - 4; i++) {
    if (u[i + 3] - u[i] === 3) return 2;
  }

  for (let i = 0; i <= u.length - 3; i++) {
    if (u[i + 2] - u[i] === 3) {
      if (u[i + 1] !== u[i] + 1) return 1;
    }
  }

  return 0;
}

export function classifyHand(hole: Card[], board: Card[]): HandClass {
  const all = [...hole, ...board];
  const result = evaluateBest(all);

  if (result.type >= 5) {
    return { category: HAND_TYPE_NAMES[result.type], detail: HAND_TYPE_NAMES[result.type] };
  }
  if (result.type === 4) return { category: 'Trips', detail: 'Trips' };
  if (result.type === 3) return { category: 'Two Pair', detail: 'Two Pair' };
  if (result.type === 2) {
    const ranks = all.map(c => c.rank);
    const counts = new Map<number, number>();
    for (const r of ranks) counts.set(r, (counts.get(r) || 0) + 1);
    const pairRank = [...counts.entries()].find(([_, c]) => c >= 2)![0];
    const boardRanks = board.map(c => c.rank);
    const holeRanks = hole.map(c => c.rank);
    const pc = pairClass(pairRank, holeRanks, boardRanks);
    return { category: pc, detail: pc };
  }

  const isFD = hasFlushDraw(all);
  const sd = hasStraightDraw(all.map(c => c.rank));

  if (isFD && sd >= 2) return { category: 'Flush Draw + OESD', detail: 'Flush Draw + Open Ender' };
  if (isFD && sd >= 1) return { category: 'Flush Draw + Gutshot', detail: 'Flush Draw + Gutshot' };
  if (isFD) return { category: 'Flush Draw', detail: 'Flush Draw' };
  if (sd >= 2) return { category: 'OESD', detail: 'Open Ender' };
  if (sd >= 1) return { category: 'Gutshot', detail: 'Gutshot' };

  return { category: 'Nothing', detail: 'High Card' };
}

export function classifyHandAll(hole: Card[], board: Card[]): string[] {
  let cats: string[] = [];
  const all = [...hole, ...board];
  const rawResult = evaluateBest(all);
  const holeRanks = [hole[0].rank, hole[1].rank];
  const boardRanks = board.map(c => c.rank);
  const result = rawResult;
  const isRiver = board.length === 5;

  if (result.type === 9 && result.value === 14) {
    cats.push('Royal Flush');
  } else if (result.type >= 5) {
    cats.push(HAND_TYPE_NAMES[result.type]);
  }

  if (result.type === 4) {
    const rankCounts: Record<number, number> = {};
    for (const r of all.map(c => c.rank)) rankCounts[r] = (rankCounts[r] || 0) + 1;
    const tripRank = Number(Object.entries(rankCounts).find(([_, c]) => c >= 3)![0]);
    if (hole[0].rank === hole[1].rank && hole[0].rank === tripRank)
      cats.push('Set');
    else
      cats.push('Trips');
  }

  if (result.type === 3) cats.push('Two Pair');

  if (result.type === 2) {
    const rankCounts: Record<number, number> = {};
    for (const r of all.map(c => c.rank)) rankCounts[r] = (rankCounts[r] || 0) + 1;
    const pairRank = Number(Object.entries(rankCounts).find(([_, c]) => c >= 2)![0]);
    const specific = pairClass(pairRank, holeRanks, boardRanks);
    cats.push(specific);
    if (specific === 'Overpair' || specific === 'Top Pair' || specific === 'Middle Pair' || specific === 'Bottom Pair') {
      cats.push('Pair');
    }
  }

  if (result.type === 1) cats.push('Nothing');

  if (board.length < 5) {
    const suits = all.map(c => c.suit);
    const suitCounts = [0, 0, 0, 0];
    for (const s of suits) suitCounts[s]++;

    if (result.type < 6) {
      const fdSuit = suitCounts.findIndex(c => c === 4);
      if (fdSuit >= 0) cats.push('Flush Draw');
    }
    if (board.length === 3) {
      const boardSuitCounts = [0, 0, 0, 0];
      for (const s of board.map(c => c.suit)) boardSuitCounts[s]++;
      if (boardSuitCounts.some(c => c === 3)) cats.push('Backdoor Flush Draw');
    }

    if (result.type < 5) {
      const sd = hasStraightDraw(all.map(c => c.rank));
      if (sd >= 2) cats.push('OESD');
      else if (sd >= 1) cats.push('Gutshot');
    }

    const maxBoard = Math.max(...boardRanks);
    const overcards = holeRanks.filter(r => r > maxBoard);
    if (overcards.length === 2) cats.push('Overcards');
    else if (overcards.length === 1) cats.push('One Overcard');
  }

  // Combined categories — exclusive: remove individual when combined is added
  const isFD = cats.includes('Flush Draw');
  const isOESD = cats.includes('OESD');
  const isGutshot = cats.includes('Gutshot');
  const isOvercards = cats.includes('Overcards');

  if (isFD && isOESD) {
    cats = cats.filter(c => c !== 'Flush Draw' && c !== 'OESD');
    cats.push('Flush Draw + OESD');
  } else if (isFD && isGutshot) {
    cats = cats.filter(c => c !== 'Flush Draw' && c !== 'Gutshot');
    cats.push('Flush Draw + Gutshot');
  }

  if (isFD && isOvercards) {
    if (cats.includes('Flush Draw')) {
      cats = cats.filter(c => c !== 'Flush Draw' && c !== 'Overcards');
    }
    cats.push('Two Overcards + Flush Draw');
  }

  return [...new Set(cats)];
}

export function classifyFinalHand(hole: Card[], board: Card[]): HandClass {
  const all = [...hole, ...board];
  const result = evaluateBest(all);

  if (result.type === 9 && result.value === 14) return { category: 'Royal Flush', detail: 'Royal Flush' };
  if (result.type >= 5) return { category: HAND_TYPE_NAMES[result.type], detail: HAND_TYPE_NAMES[result.type] };
  if (result.type === 4) {
    const ranks = all.map(c => c.rank);
    const rcounts: Record<number, number> = {};
    for (const r of ranks) rcounts[r] = (rcounts[r] || 0) + 1;
    const tripRank = Number(Object.entries(rcounts).find(([_, c]) => c >= 3)![0]);
    if (hole[0].rank === hole[1].rank && hole[0].rank === tripRank)
      return { category: 'Set', detail: 'Set' };
    return { category: 'Trips', detail: 'Trips' };
  }
  if (result.type === 3) return { category: 'Two Pair', detail: 'Two Pair' };

  if (result.type === 2) {
    const ranks = all.map(c => c.rank);
    const counts = new Map<number, number>();
    for (const r of ranks) counts.set(r, (counts.get(r) || 0) + 1);
    const pairRank = [...counts.entries()].find(([_, c]) => c >= 2)![0];
    const boardRanks = board.map(c => c.rank);
    const holeRanks = hole.map(c => c.rank);
    const pc = pairClass(pairRank, holeRanks, boardRanks);
    return { category: pc, detail: pc };
  }

  return { category: 'Nothing', detail: 'High Card' };
}

function gridIndexToRank(gridIdx: number): number {
  return 14 - gridIdx;
}

function parseHandLabel(label: string): { r1: number; r2: number; type: 'pair' | 'suited' | 'offsuit' } | null {
  const rMatch = label.match(/^([AKQJT98765432]{1})([AKQJT98765432]{1})([so]?)$/);
  if (!rMatch) return null;
  const rankNames: Record<string, number> = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
  const r1 = rankNames[rMatch[1]];
  const r2 = rankNames[rMatch[2]];
  if (r1 === r2 && rMatch[3] === '') return { r1, r2, type: 'pair' };
  if (rMatch[3] === 's') return { r1, r2, type: 'suited' };
  return { r1, r2, type: 'offsuit' };
}

const boardSet = (boardCards: Card[]) => new Set(boardCards.map(c => `${c.rank},${c.suit}`));

export function generateAllHoleCombos(label: string, boardCards: Card[]): Card[][] {
  const parsed = parseHandLabel(label);
  if (!parsed) return [];
  const { r1, r2, type } = parsed;
  const onBoard = boardSet(boardCards);
  const isFree = (r: number, s: number) => !onBoard.has(`${r},${s}`);

  const results: Card[][] = [];

  if (type === 'pair') {
    for (let s1 = 0; s1 < 4; s1++)
      for (let s2 = s1 + 1; s2 < 4; s2++)
        if (isFree(r1, s1) && isFree(r1, s2))
          results.push([{ rank: r1, suit: s1 }, { rank: r1, suit: s2 }]);
  } else if (type === 'suited') {
    for (let s = 0; s < 4; s++)
      if (isFree(r1, s) && isFree(r2, s))
        results.push([{ rank: r1, suit: s }, { rank: r2, suit: s }]);
  } else {
    for (let s1 = 0; s1 < 4; s1++)
      for (let s2 = 0; s2 < 4; s2++)
        if (s1 !== s2 && isFree(r1, s1) && isFree(r2, s2))
          results.push([{ rank: r1, suit: s1 }, { rank: r2, suit: s2 }]);
  }

  return results;
}

function handLabelFromGrid(r: number, c: number): string {
  if (r === c) return `${GRID_LABELS[r]}${GRID_LABELS[r]}`;
  const high = r < c ? GRID_LABELS[r] : GRID_LABELS[c];
  const low = r < c ? GRID_LABELS[c] : GRID_LABELS[r];
  return `${high}${low}${r < c ? 's' : 'o'}`;
}

export interface RangeAnalysis {
  categories: Record<string, { combos: number; hands: number }>;
  totalCombos: number;
  categoryCells: Record<string, string[]>;
}

export function analyzeRange(
  heroCells: [number, number][],
  boardCards: Card[],
): RangeAnalysis {
  const catMap: Record<string, { combos: number; hands: number }> = {};
  const categoryCells: Record<string, string[]> = {};
  let total = 0;

  for (const [r, c] of heroCells) {
    const label = handLabelFromGrid(r, c);
    const allCombos = generateAllHoleCombos(label, boardCards);
    if (allCombos.length === 0) continue;

    const seenCats = new Set<string>();
    for (const hole of allCombos) {
      const handCats = classifyHandAll(hole, boardCards);
      for (const cat of handCats) {
        if (!catMap[cat]) catMap[cat] = { combos: 0, hands: 0 };
        catMap[cat].combos += 1;
        seenCats.add(cat);
      }
    }

    for (const cat of seenCats) {
      if (!categoryCells[cat]) categoryCells[cat] = [];
      categoryCells[cat].push(`${r},${c}`);
    }
    total += allCombos.length;
  }

  return { categories: catMap, totalCombos: total, categoryCells };
}

export function monteCarloEquity(
  heroCells: [number, number][],
  boardCards: Card[],
  samples: number = 10000,
): Promise<number> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const deck: Card[] = [];
      for (let s = 0; s < 4; s++)
        for (let r = 2; r <= 14; r++)
          if (!boardCards.some(c => c.rank === r && c.suit === s))
            deck.push({ rank: r, suit: s });

      const allHeroCombos: Card[][] = [];
      for (const [r, c] of heroCells) {
        const label = handLabelFromGrid(r, c);
        const combos = generateAllHoleCombos(label, boardCards);
        allHeroCombos.push(...combos);
      }

      if (allHeroCombos.length === 0) { resolve(0); return; }

      let wins = 0, ties = 0;

      for (let s = 0; s < samples; s++) {
        const hero = allHeroCombos[Math.floor(Math.random() * allHeroCombos.length)];
        const deckCopy = deck.filter(c =>
          !(c.rank === hero[0].rank && c.suit === hero[0].suit)
        ).filter(c =>
          !(c.rank === hero[1].rank && c.suit === hero[1].suit)
        );

        for (let i = deckCopy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deckCopy[i], deckCopy[j]] = [deckCopy[j], deckCopy[i]];
        }

        const villain = [deckCopy[0], deckCopy[1]];
        let fullBoard = [...boardCards];
        for (let i = 2; i < deckCopy.length && fullBoard.length < 5; i++)
          fullBoard.push(deckCopy[i]);

        const heroAll = [...hero, ...fullBoard];
        const villainAll = [...villain, ...fullBoard];
        const hResult = evaluateBest(heroAll);
        const vResult = evaluateBest(villainAll);

        if (hResult.type > vResult.type || (hResult.type === vResult.type && hResult.value > vResult.value)) wins++;
        else if (hResult.type === vResult.type && hResult.value === vResult.value) ties++;
      }

      resolve(((wins + ties / 2) / samples) * 100);
    }, 0);
  });
}

export function heroHandVsRangeEquity(
  heroHand: Card[],
  villainCells: [number, number][],
  boardCards: Card[],
  samples: number = 5000,
): Promise<number> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const villainCombos: Card[][] = [];
      for (const [r, c] of villainCells) {
        const label = handLabelFromGrid(r, c);
        const combos = generateAllHoleCombos(label, boardCards);
        villainCombos.push(...combos);
      }

      const used = new Set<string>();
      for (const c of [...heroHand, ...boardCards]) used.add(`${c.rank},${c.suit}`);
      const validVillain = villainCombos.filter(combo =>
        !used.has(`${combo[0].rank},${combo[0].suit}`) &&
        !used.has(`${combo[1].rank},${combo[1].suit}`)
      );

      if (validVillain.length === 0) { resolve(0); return; }

      const deck: Card[] = [];
      for (let s = 0; s < 4; s++)
        for (let r = 2; r <= 14; r++)
          if (!used.has(`${r},${s}`))
            deck.push({ rank: r, suit: s });

      let wins = 0, ties = 0;
      const remaining = 5 - boardCards.length;

      for (let s = 0; s < samples; s++) {
        const villain = validVillain[Math.floor(Math.random() * validVillain.length)];

        const villainUsed = new Set(used);
        villainUsed.add(`${villain[0].rank},${villain[0].suit}`);
        villainUsed.add(`${villain[1].rank},${villain[1].suit}`);

        const deckCopy = deck.filter(c => !villainUsed.has(`${c.rank},${c.suit}`));

        for (let i = deckCopy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deckCopy[i], deckCopy[j]] = [deckCopy[j], deckCopy[i]];
        }

        const fullBoard = remaining > 0
          ? [...boardCards, ...deckCopy.slice(0, remaining)]
          : boardCards;

        const heroAll = [...heroHand, ...fullBoard];
        const villainAll = [...villain, ...fullBoard];
        const hResult = evaluateBest(heroAll);
        const vResult = evaluateBest(villainAll);

        if (hResult.type > vResult.type || (hResult.type === vResult.type && hResult.value > vResult.value)) wins++;
        else if (hResult.type === vResult.type && hResult.value === vResult.value) ties++;
      }

      resolve(((wins + ties / 2) / samples) * 100);
    }, 0);
  });
}

export const CAT_ORDER = [
  'Royal Flush', 'Straight Flush', 'Quads', 'Full House', 'Flush', 'Straight',
  'Set', 'Trips', 'Two Pair',
  'Overpair', 'Top Pair', 'Middle Pair', 'Bottom Pair', 'Pair', 'Paired Board',
  'Flush Draw + OESD', 'Flush Draw + Gutshot', 'Two Overcards + Flush Draw', 'Flush Draw',
  'Backdoor Flush Draw', 'OESD', 'Gutshot',
  'Overcards', 'One Overcard',
  'Nothing',
];

export function computeDrawProbs(
  heroCells: [number, number][],
  boardCards: Card[],
): Promise<Record<string, number>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const probs: Record<string, number> = {};
      for (const cat of CAT_ORDER) probs[cat] = 0;

      const isFlop = boardCards.length === 3;
      let totalSamples = 0;

      for (const [r, c] of heroCells) {
        const label = handLabelFromGrid(r, c);
        const allCombos = generateAllHoleCombos(label, boardCards);
        if (allCombos.length === 0) continue;

        for (const hole of allCombos) {
          const deck: Card[] = [];
          for (let s = 0; s < 4; s++)
            for (let r2 = 2; r2 <= 14; r2++)
              if (!boardCards.some(bc => bc.rank === r2 && bc.suit === s) &&
                  !hole.some(hc => hc.rank === r2 && hc.suit === s))
                deck.push({ rank: r2, suit: s });

          if (isFlop) {
            for (let i = 0; i < deck.length; i++)
              for (let j = i + 1; j < deck.length; j++) {
                const fullBoard = [...boardCards, deck[i], deck[j]];
                const hc = classifyFinalHand(hole, fullBoard);
                probs[hc.category] += 1;
              }
          } else {
            for (let i = 0; i < deck.length; i++) {
              const fullBoard = [...boardCards, deck[i]];
              const hc = classifyFinalHand(hole, fullBoard);
              probs[hc.category] += 1;
            }
          }

          const deckSize = 52 - boardCards.length - 2;
          totalSamples += isFlop ? deckSize * (deckSize - 1) / 2 : deckSize;
        }
      }

      if (totalSamples > 0)
        for (const cat of Object.keys(probs))
          probs[cat] = (probs[cat] / totalSamples) * 100;

      resolve(probs);
    }, 0);
  });
}

export function cardEqual(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

export function cardInList(c: Card, list: Card[]): boolean {
  return list.some(x => cardEqual(x, c));
}
