export interface Card {
  rank: number;
  suit: number;
}

export const RANK_NAMES: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
  9: '9', 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

export const SUIT_SYMBOLS = ['♠', '♥', '♦', '♣'];

export const HAND_TYPE_NAMES: Record<number, string> = {
  1: 'High Card', 2: 'Pair', 3: 'Two Pair', 4: 'Trips',
  5: 'Straight', 6: 'Flush', 7: 'Full House', 8: 'Quads', 9: 'Straight Flush',
};

export interface HandResult {
  type: number;
  value: number;
}

function rankCounts(cards: Card[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const c of cards) m.set(c.rank, (m.get(c.rank) || 0) + 1);
  return m;
}

function sortedRanks(cards: Card[]): number[] {
  return cards.map(c => c.rank).sort((a, b) => b - a);
}

export function evaluate5(cards: Card[]): HandResult {
  const ranks = sortedRanks(cards);
  const counts = rankCounts(cards);
  const flush = cards.every(c => c.suit === cards[0].suit);

  const unique = [...new Set(ranks)].sort((a, b) => b - a);
  let straight = 0;
  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i] - unique[i + 4] === 4) { straight = unique[i]; break; }
  }
  if (!straight && unique.includes(14) && [2, 3, 4, 5].every(r => unique.includes(r))) straight = 5;

  const groups = [...counts.entries()]
    .map(([r, c]) => ({ rank: r, count: c }))
    .sort((a, b) => b.count !== a.count ? b.count - a.count : b.rank - a.rank);

  const v = (...args: number[]) => {
    let val = 0;
    for (let i = 0; i < args.length && i < 5; i++) val = val * 100 + args[i];
    return val;
  };

  if (flush && straight) return { type: 9, value: v(straight) };
  if (groups[0]?.count === 4) return { type: 8, value: v(groups[0].rank, groups[1]?.rank || 0) };
  if (groups[0]?.count === 3 && groups[1]?.count === 2) return { type: 7, value: v(groups[0].rank, groups[1].rank) };
  if (flush) return { type: 6, value: v(...ranks) };
  if (straight) return { type: 5, value: v(straight) };
  if (groups[0]?.count === 3) return { type: 4, value: v(groups[0].rank, groups[1]?.rank || 0, groups[2]?.rank || 0) };
  if (groups[0]?.count === 2 && groups[1]?.count === 2) return { type: 3, value: v(groups[0].rank, groups[1].rank, groups[2]?.rank || 0) };
  if (groups[0]?.count === 2) return { type: 2, value: v(groups[0].rank, ...groups.slice(1).map(g => g.rank)) };
  return { type: 1, value: v(...ranks) };
}

export function evaluateBest(cards: Card[]): HandResult {
  if (cards.length < 5) return { type: 1, value: 0 };
  if (cards.length === 5) return evaluate5(cards);
  let best: HandResult | null = null;
  const n = cards.length;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++)
          for (let e = d + 1; e < n; e++) {
            const r = evaluate5([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || compareHands(r, best) > 0) best = r;
          }
  return best!;
}

export function compareHands(a: HandResult, b: HandResult): number {
  if (a.type !== b.type) return a.type - b.type;
  return a.value - b.value;
}
