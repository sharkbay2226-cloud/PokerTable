import { addReferral, payReferral, getLatestActiveLicense, extendLicense, addUsdtBalance, row } from './db.js';

const REFERRAL_PERCENT = parseInt(process.env.REFERRAL_PERCENT || '20', 10);

export function awardReferral(userId) {
  const user = row('SELECT * FROM users WHERE id=?', { 0: userId });
  if (!user || !user.referrer_id) return null;

  const referrerId = user.referrer_id;
  const referrerLicense = getLatestActiveLicense(referrerId);
  if (!referrerLicense) return null;

  const lastOrder = row(
    "SELECT * FROM orders WHERE user_id=? AND status='confirmed' ORDER BY confirmed_at DESC LIMIT 1",
    { 0: userId }
  );
  if (!lastOrder) return null;

  const plan = lastOrder.plan;
  const amountUsd = lastOrder.amount_usd;

  if (referrerLicense.plan === 'lifetime') {
    const usdtAmount = (REFERRAL_PERCENT / 100) * amountUsd;
    const referralId = addReferral(referrerId, userId, 'usdt', usdtAmount);
    addUsdtBalance(referrerId, usdtAmount);
    return { type: 'usdt', amount: usdtAmount, referralId };
  }

  const daysMap = { monthly: 30, yearly: 365, lifetime: 730 };
  const baseDays = daysMap[plan] || 30;
  const daysToAdd = Math.round((REFERRAL_PERCENT / 100) * baseDays);
  const extended = extendLicense(referrerId, daysToAdd);
  if (extended) {
    const referralId = addReferral(referrerId, userId, 'extension_days', daysToAdd);
    if (referralId) payReferral(referralId);
    return { type: 'extension_days', amount: daysToAdd, referralId };
  }
  return null;
}
