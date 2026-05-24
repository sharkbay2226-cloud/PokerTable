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

export interface RangeColor {
  id: string;
  name: string;
  hex: string;
}

export interface RangeData {
  id: string;
  name: string;
  description?: string;
  parentId: string | null;
  colors: RangeColor[];
  grid: Record<string, string>;
  weights?: Record<string, number>;
}

export interface TrainingFolder {
  id: string;
  name: string;
  parentId: string | null;
}

export type TrainingItem = RangeData | TrainingFolder;

export function isFolder(item: TrainingItem): item is TrainingFolder {
  return 'parentId' in item && !('colors' in item);
}

export function isRange(item: TrainingItem): item is RangeData {
  return 'colors' in item;
}

function defaultColors(): RangeColor[] {
  return [
    { id: 'c1', name: 'Raise', hex: '#22c55e' },
    { id: 'c2', name: 'Call', hex: '#eab308' },
    { id: 'c3', name: 'Fold', hex: '#ef4444' },
  ];
}

export function createRange(name: string, parentId: string | null, description?: string): RangeData {
  return {
    id: crypto.randomUUID(),
    name,
    description,
    parentId,
    colors: defaultColors(),
    grid: {},
    weights: {},
  };
}

export function createFolder(name: string, parentId: string | null): TrainingFolder {
  return {
    id: crypto.randomUUID(),
    name,
    parentId,
  };
}
