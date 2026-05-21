import type { Currency } from '../types';
import { useAppStore } from '../store/appStore';

const RATES_CACHE = { usdToRub: 90, eurToRub: 100, eurToUsd: 100 / 90 };

function getRates() {
  const { settings } = useAppStore.getState();
  return {
    usdToRub: settings.usdToRub,
    eurToRub: settings.eurToRub,
    eurToUsd: settings.eurToRub / settings.usdToRub,
  };
}

export function getCurrencyRate(currency: Currency): number {
  const r = getRates();
  if (currency === 'RUB') return 1;
  if (currency === 'USD') return r.usdToRub;
  return r.eurToRub;
}

export function convertToRub(amount: number, currency: Currency): number {
  if (currency === 'RUB') return amount;
  if (currency === 'USD') return amount * getRates().usdToRub;
  return amount * getRates().eurToRub;
}

export function convertToUsd(amount: number, currency: Currency): number {
  if (currency === 'USD') return amount;
  if (currency === 'RUB') return amount / getRates().usdToRub;
  return amount * getRates().eurToUsd;
}

export function formatRub(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUsd(amount: number): string {
  return `${amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

export function formatEur(amount: number): string {
  return `${amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export function formatAmount(amount: number, currency: Currency): string {
  if (currency === 'RUB') return formatRub(amount);
  if (currency === 'USD') return formatUsd(amount);
  return formatEur(amount);
}
