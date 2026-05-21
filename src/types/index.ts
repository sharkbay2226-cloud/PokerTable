export interface Room {
  id: string;
  name: string;
}

export interface Tournament {
  id: string;
  name: string;
  roomId: string;
  buyIn: number;
  currency: 'RUB' | 'USD' | 'EUR';
}

export interface Backer {
  id: string;
  name: string;
  percent: number;
}

export interface Session {
  id: number;
  date: string;
  tournamentId: string;
  inPrize: boolean;
  backing: boolean;
  backerId?: string;
  place: number;
  prize: number;
  prizeCurrency: 'RUB' | 'USD' | 'EUR';
  bountySum: number;
  bountyCurrency: 'RUB' | 'USD' | 'EUR';
}

export interface BankrollEntry {
  id: number;
  roomId: string;
  amount: number;
  currency?: Currency;
  comment: string;
  date: string;
  createdAt: number;
}

export type Currency = 'RUB' | 'USD' | 'EUR';

export interface AppSettings {
  usdToRub: number;
  eurToRub: number;
  roomDisplayCurrency?: Record<string, Currency>;
  backerName?: string;
  backerPercent?: number;
  backers?: Backer[];
  themeMode?: 'dark' | 'light';
  locale?: 'ru' | 'en';
}
