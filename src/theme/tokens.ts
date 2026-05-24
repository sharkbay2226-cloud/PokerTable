export const tokens = {
  dark: {
    bg: '#0D0F14',
    accent: '#d4a843',
    accentSoft: 'rgba(212, 168, 67, 0.12)',
    profit: '#d4a843',
    loss: '#ef4444',
    text: {
      primary: '#e2e8f0',
      secondary: '#94a3b8',
      muted: '#64748b',
    },
    surface: {
      card: '#1A1C23',
      elevated: '#1A1C23',
      hover: 'rgba(212, 168, 67, 0.08)',
    },
    border: '#2A2D35',
    borderHover: '#d4a843',
    siderBg: '#0D0F14',
    headerBg: '#0D0F14',
  },
  light: {
    bg: '#f0f2f5',
    accent: '#d4a843',
    accentSoft: 'rgba(212, 168, 67, 0.1)',
    profit: '#16a34a',
    loss: '#dc2626',
    text: {
      primary: '#1a1a1a',
      secondary: '#475569',
      muted: '#94a3b8',
    },
    surface: {
      card: 'rgba(255, 255, 255, 0.85)',
      elevated: '#ffffff',
      hover: 'rgba(241, 245, 249, 0.7)',
    },
    border: 'rgba(0, 0, 0, 0.06)',
    borderHover: 'rgba(212, 168, 67, 0.3)',
    siderBg: 'rgba(248, 250, 252, 0.9)',
    headerBg: 'rgba(255, 255, 255, 0.85)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 16,
  },
  font: {
    display: "'Inter', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  transition: {
    fast: '0.15s ease',
    normal: '0.2s ease',
    slow: '0.3s ease',
  },
}

export type ThemeMode = 'dark' | 'light'
export type ThemeTokens = typeof tokens.dark
