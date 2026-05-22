/// <reference types="vite/client" />

interface ElectronAPI {
  apiBase: string;
  isElectron: boolean;
}

interface LicenseStatus {
  status: 'trial' | 'licensed' | 'grace' | 'expired';
  daysLeft?: number;
  trialEnd?: number;
  plan?: 'yearly' | 'lifetime';
  activatedAt?: number;
  expiresAt?: number;
  reason?: string;
}

interface ActivateResult {
  success: boolean;
  error?: string;
  plan?: string;
  expiresAt?: string;
  offline?: boolean;
}

interface LicenseAPI {
  getStatus: () => Promise<LicenseStatus>;
  activateKey: (key: string) => Promise<ActivateResult>;
  getOfflineChallenge: () => Promise<string>;
  verifyOfflineResponse: (response: string) => Promise<ActivateResult>;
  openPurchase: () => void;
  revalidate?: () => Promise<LicenseStatus>;
  onRevoked?: (cb: (status: LicenseStatus) => void) => void;
}

interface Window {
  electronAPI?: ElectronAPI;
  licenseAPI?: LicenseAPI;
}
