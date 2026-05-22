import { addressToHex } from './base58.js';

const TRONGRID_URL = 'https://api.trongrid.io';
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const USDT_CONTRACT_HEX = '41a614f803b6fd780986a42c78ec9c7f77e6ded13c';

let walletHex = '';
let walletBase58 = '';

export function setWalletAddress(base58Address) {
  try {
    walletBase58 = base58Address;
    walletHex = addressToHex(base58Address);
    return true;
  } catch {
    return false;
  }
}

export async function verifyTransaction(txid, expectedAmount) {
  if (!walletHex) throw new Error('Wallet address not configured');

  try {
    const res = await fetch(`${TRONGRID_URL}/v1/transactions/${txid}/events`, {
      headers: process.env.TRONGRID_API_KEY
        ? { 'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY }
        : {},
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      if (res.status === 404) return { valid: false, reason: 'transaction_not_found' };
      return { valid: false, reason: `api_error: ${res.status}` };
    }

    const data = await res.json();
    if (!data.data || data.data.length === 0) {
      return { valid: false, reason: 'no_events' };
    }

    const transfers = data.data.filter((e) => {
      const ca = (e.contract_address || '').toLowerCase();
      return ca === USDT_CONTRACT.toLowerCase() || ca === USDT_CONTRACT_HEX.toLowerCase();
    });

    for (const event of transfers) {
      const toHex = (event.topic2 || event.result?.to || '').toLowerCase().replace('0x', '');
      if (toHex.includes(walletHex)) {
        const valueHex = event.data || event.result?.value || '0';
        const amount = Number(BigInt(valueHex.startsWith('0x') ? valueHex : `0x${valueHex}`)) / 1_000_000;
        if (amount >= expectedAmount) {
          return { valid: true, amount, from: event.topic1 || '' };
        }
      }
    }

    return { valid: false, reason: 'no_matching_transfer' };
  } catch (e) {
    return { valid: false, reason: `error: ${e.message}` };
  }
}

export async function getIncomingTransfers(minTimestamp) {
  if (!walletHex) throw new Error('Wallet address not configured');

  const params = new URLSearchParams({
    only_to: 'true',
    only_confirmed: 'true',
    limit: '200',
    min_timestamp: String(minTimestamp),
  });

  try {
    const res = await fetch(`${TRONGRID_URL}/v1/accounts/${walletBase58}/transactions/trc20?${params}`, {
      headers: process.env.TRONGRID_API_KEY
        ? { 'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY }
        : {},
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) return [];

    return data.data
      .filter(tx => tx.to && tx.token_info?.symbol === 'USDT')
      .map(tx => ({
        txid: tx.transaction_id,
        from: tx.from,
        to: tx.to,
        value: parseFloat(tx.value || '0'),
        token: tx.token_info?.symbol || 'USDT',
        timestamp: tx.block_timestamp,
      }))
      .filter(tx => tx.value > 0);
  } catch {
    return [];
  }
}
