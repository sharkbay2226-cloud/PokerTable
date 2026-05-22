const STORAGE_KEY = '__mock_license';
const TRIAL_DAYS = 14;

const MOCK_VALID_KEYS: Record<string, { plan: 'yearly' | 'lifetime'; expiresAt?: number }> = {
  'TEST-1234-TEST-5678': { plan: 'yearly', expiresAt: Date.now() + 365 * 86400000 },
  'LIFETIME-TEST-1234': { plan: 'lifetime' },
};

function load(): Record<string, any> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(s: Record<string, any>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export const mockLicenseAPI: LicenseAPI = {
  async getStatus() {
    const s = load();
    const now = Date.now();

    if (s.licenseKey && s.activatedAt) {
      if (s.plan === 'lifetime') {
        return { status: 'licensed', plan: 'lifetime', activatedAt: s.activatedAt };
      }
      if (s.plan === 'yearly' && s.expiresAt > now) {
        return { status: 'licensed', plan: 'yearly', expiresAt: s.expiresAt };
      }
      if (s.plan === 'yearly') {
        return { status: 'expired', reason: 'license_expired' };
      }
    }

    if (s.trialStartedAt) {
      const trialEnd = s.trialStartedAt + TRIAL_DAYS * 86400000;
      if (now < trialEnd) {
        return { status: 'trial', daysLeft: Math.ceil((trialEnd - now) / 86400000), trialEnd };
      }
      return { status: 'expired', reason: 'trial_ended' };
    }

    s.trialStartedAt = now;
    save(s);
    return { status: 'trial', daysLeft: TRIAL_DAYS, trialEnd: now + TRIAL_DAYS * 86400000 };
  },

  async activateKey(key) {
    const info = MOCK_VALID_KEYS[key];
    if (!info) {
      return { success: false, error: 'Неверный ключ активации' };
    }
    const s = load();
    s.licenseKey = key;
    s.activatedAt = Date.now();
    s.plan = info.plan;
    if (info.expiresAt) s.expiresAt = info.expiresAt;
    save(s);
    return { success: true, plan: info.plan };
  },

  async getOfflineChallenge() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    const challenge = Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
    const s = load();
    s.pendingChallenge = challenge;
    s.challengeAt = Date.now();
    save(s);
    return challenge;
  },

  async verifyOfflineResponse(response) {
    if (!response.trim()) {
      return { success: false, error: 'Введите ответ' };
    }
    const s = load();
    s.licenseKey = 'offline-mock' + Math.random().toString(36).slice(2, 8);
    s.activatedAt = Date.now();
    s.plan = 'lifetime';
    delete s.pendingChallenge;
    delete s.challengeAt;
    save(s);
    return { success: true, plan: 'lifetime' };
  },

  openPurchase() {
    alert('Открыть Telegram-бота @PokerDiary_Bot для покупки');
  },

  async revalidate() {
    return this.getStatus();
  },

  onRevoked(_cb: (status: LicenseStatus) => void) {
    // no-op in dev
  },
};
