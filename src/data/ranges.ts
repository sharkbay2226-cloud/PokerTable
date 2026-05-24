export type Position = 'UTG' | 'MP' | 'CO' | 'BTN' | 'SB' | 'BB';
export type ActionType = 'RFI';
export type HandAction = 'fold' | 'raise';

export interface Scenario {
  position: Position;
  action: ActionType;
}

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

export function handKey(r1: string, r2: string, suited: boolean): string {
  if (r1 === r2) return r1 + r2;
  return suited ? r1 + r2 + 's' : r1 + r2 + 'o';
}

export function allHands(): string[] {
  const hands: string[] = [];
  for (let i = 0; i < RANKS.length; i++) {
    for (let j = 0; j < RANKS.length; j++) {
      if (i === j) {
        hands.push(RANKS[i] + RANKS[j]);
      } else if (i < j) {
        hands.push(RANKS[i] + RANKS[j] + 's');
      } else {
        hands.push(RANKS[j] + RANKS[i] + 'o');
      }
    }
  }
  return hands;
}

const handSet = (list: string[]): Set<string> => new Set(list);

const UTG_RFI = handSet([
  'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77',
  'AKs', 'AQs', 'AJs', 'ATs', 'KQs', 'KJs', 'QJs', 'JTs', 'T9s', '98s',
  'AKo', 'AQo', 'AJo', 'KQo',
]);

const MP_RFI = handSet([
  'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55',
  'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'KQs', 'KJs', 'KTs', 'QJs', 'QTs', 'JTs', 'T9s', '98s', '87s',
  'AKo', 'AQo', 'AJo', 'ATo', 'KQo', 'KJo', 'QJo',
]);

const CO_RFI = handSet([
  'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
  'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
  'KQs', 'KJs', 'KTs', 'K9s', 'QJs', 'QTs', 'Q9s', 'JTs', 'J9s', 'T9s', 'T8s', '98s', '97s', '87s', '86s', '76s', '75s', '65s', '54s',
  'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'KQo', 'KJo', 'KTo', 'QJo', 'QTo', 'JTo', 'T9o',
]);

const BTN_RFI = handSet([
  'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
  'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
  'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s',
  'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s',
  'JTs', 'J9s', 'J8s', 'J7s',
  'T9s', 'T8s', 'T7s', 'T6s',
  '98s', '97s', '96s',
  '87s', '86s', '85s',
  '76s', '75s', '74s',
  '65s', '64s', '63s',
  '54s', '53s', '52s',
  '42s', '43s',
  '32s',
  'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o',
  'KQo', 'KJo', 'KTo', 'K9o', 'K8o', 'K7o',
  'QJo', 'QTo', 'Q9o', 'Q8o',
  'JTo', 'J9o', 'J8o',
  'T9o', 'T8o',
  '97o', '98o',
  '87o', '86o',
  '76o', '75o',
  '65o',
  '54o',
]);

const SB_RFI = handSet([
  'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
  'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
  'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s',
  'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s',
  'JTs', 'J9s', 'J8s', 'J7s',
  'T9s', 'T8s', 'T7s', 'T6s',
  '98s', '97s', '96s', '95s',
  '87s', '86s', '85s',
  '76s', '75s', '74s',
  '65s', '64s', '63s',
  '54s', '53s',
  'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o',
  'KQo', 'KJo', 'KTo', 'K9o', 'K8o',
  'QJo', 'QTo', 'Q9o',
  'JTo', 'J9o',
  'T9o',
]);

const BB_VS_BTN_RFI = handSet([
  'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
  'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
  'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s',
  'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s',
  'JTs', 'J9s', 'J8s', 'J7s',
  'T9s', 'T8s', 'T7s',
  '98s', '97s', '96s',
  '87s', '86s',
  '76s', '75s',
  '65s', '64s',
  '54s',
  'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o',
  'KQo', 'KJo', 'KTo', 'K9o', 'K8o', 'K7o', 'K6o', 'K5o', 'K4o', 'K3o', 'K2o',
  'QJo', 'QTo', 'Q9o', 'Q8o', 'Q7o',
  'JTo', 'J9o', 'J8o',
  'T9o', 'T8o',
  '98o', '97o',
  '87o',
]);

const RANGES: Record<Position, Record<ActionType, Set<string>>> = {
  UTG: { RFI: UTG_RFI },
  MP: { RFI: MP_RFI },
  CO: { RFI: CO_RFI },
  BTN: { RFI: BTN_RFI },
  SB: { RFI: SB_RFI },
  BB: { RFI: BB_VS_BTN_RFI },
};

export function getGtoRange(position: Position, action: ActionType): Set<string> {
  return RANGES[position][action];
}

export function getRandomScenario(): Scenario {
  const positions: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB'];
  const pos = positions[Math.floor(Math.random() * positions.length)];
  return { position: pos, action: 'RFI' };
}

export function getPositionLabel(position: Position, t: (key: string) => string): string {
  const labels: Record<Position, string> = {
    UTG: 'UTG',
    MP: 'MP',
    CO: 'CO',
    BTN: t('training.btn'),
    SB: t('training.sb'),
    BB: t('training.bb'),
  };
  return labels[position];
}

export { RANKS };
