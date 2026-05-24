import { getAllRooms, getAllSessions, getAllTournaments, getAllBankrollEntries } from './db';

const SEED_DONE_KEY = 'poker-diary-seed-done';

export async function seedDatabase() {
  if (localStorage.getItem(SEED_DONE_KEY)) return;

  try {
    const [rooms, tournaments, sessions, bankroll] = await Promise.all([
      getAllRooms(),
      getAllTournaments(),
      getAllSessions(),
      getAllBankrollEntries(),
    ]);

    if (rooms.length > 0 || tournaments.length > 0 || sessions.length > 0 || bankroll.length > 0) {
      try { localStorage.setItem(SEED_DONE_KEY, '1'); } catch {}
      return;
    }

    const { default: seedData } = await import('./seed_data.json');
    await fetch('/api/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seedData),
    });
    try { localStorage.setItem(SEED_DONE_KEY, '1'); } catch {}
  } catch {
    // seed is best-effort, ignore failures
  }
}
