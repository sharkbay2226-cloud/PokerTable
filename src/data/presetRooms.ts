import type { Currency } from '../types';

export interface PresetTournament {
  name: string;
  buyIn: number;
  currency: Currency;
}

export interface PresetRoom {
  name: string;
  tournaments: PresetTournament[];
}

export const PRESET_ROOMS: PresetRoom[] = [
  {
    name: 'PokerStars',
    tournaments: [
      { name: 'Sunday Million', buyIn: 215, currency: 'USD' },
      { name: 'Big $11', buyIn: 11, currency: 'USD' },
      { name: 'Big $22', buyIn: 22, currency: 'USD' },
      { name: 'Hot $33', buyIn: 33, currency: 'USD' },
      { name: 'Bounty Builder $44', buyIn: 44, currency: 'USD' },
      { name: 'Daily Marathon', buyIn: 5.5, currency: 'USD' },
    ],
  },
  {
    name: '888poker',
    tournaments: [
      { name: 'The Big Game', buyIn: 30, currency: 'USD' },
      { name: 'Mega Deep', buyIn: 20, currency: 'USD' },
      { name: 'XL Series', buyIn: 55, currency: 'USD' },
      { name: 'Hurricane', buyIn: 10, currency: 'USD' },
    ],
  },
  {
    name: 'partypoker',
    tournaments: [
      { name: 'Powerfest', buyIn: 33, currency: 'USD' },
      { name: 'Grand Prix', buyIn: 55, currency: 'USD' },
      { name: 'Bounty Hunter', buyIn: 11, currency: 'USD' },
      { name: 'Daily Special', buyIn: 5.5, currency: 'USD' },
    ],
  },
  {
    name: 'Winamax',
    tournaments: [
      { name: "La Fièvre", buyIn: 10, currency: 'EUR' },
      { name: 'The Hot', buyIn: 5, currency: 'EUR' },
      { name: 'Expresso', buyIn: 2, currency: 'EUR' },
      { name: 'Highroller', buyIn: 100, currency: 'EUR' },
    ],
  },
  {
    name: 'GGPoker',
    tournaments: [
      { name: 'Bounty Hunters $5.40', buyIn: 5.4, currency: 'USD' },
      { name: 'Bounty Hunters $10.80', buyIn: 10.8, currency: 'USD' },
      { name: 'Daily Big $1', buyIn: 1, currency: 'USD' },
      { name: 'Daily Big $2', buyIn: 2, currency: 'USD' },
    ],
  },
  {
    name: 'CoinPoker',
    tournaments: [
      { name: '₮2 PKO', buyIn: 2, currency: 'USD' },
      { name: '₮5 PKO', buyIn: 5, currency: 'USD' },
      { name: '₮2 Classic', buyIn: 2, currency: 'USD' },
      { name: '₮10 Classic', buyIn: 10, currency: 'USD' },
    ],
  },
  {
    name: 'BetOnline',
    tournaments: [
      { name: '$10 PKO', buyIn: 10, currency: 'USD' },
      { name: '$20 Deepstack', buyIn: 20, currency: 'USD' },
      { name: '$5 Turbo', buyIn: 5, currency: 'USD' },
    ],
  },
  {
    name: 'Americas Cardroom',
    tournaments: [
      { name: 'Million Dollar Sunday', buyIn: 215, currency: 'USD' },
      { name: 'Venom PKO', buyIn: 66, currency: 'USD' },
      { name: '$10 PKO', buyIn: 10, currency: 'USD' },
    ],
  },
];
