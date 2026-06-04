import type { Room, Tournament, Session, GameSession, BankrollEntry, TrainingItem, Currency, Goal } from '../types';

const API = window.electronAPI?.apiBase ?? '/api';

async function getTable<T>(table: string): Promise<T[]> {
  const res = await fetch(`${API}/${table}`);
  if (!res.ok) throw new Error(`Failed to fetch ${table}`);
  return res.json();
}

async function getById<T>(table: string, id: string | number): Promise<T> {
  const res = await fetch(`${API}/${table}/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch ${table}/${id}`);
  return res.json();
}

async function addToTable<T>(table: string, data: Partial<T>): Promise<T> {
  const res = await fetch(`${API}/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to add to ${table}`);
  return res.json();
}

async function updateInTable<T>(table: string, id: string | number, data: Partial<T>): Promise<void> {
  const res = await fetch(`${API}/${table}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update ${table}/${id}`);
}

async function deleteFromTable(table: string, id: string | number): Promise<void> {
  const res = await fetch(`${API}/${table}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete ${table}/${id}`);
}

// Rooms
export async function addRoom(name: string, defaultCurrency?: Currency): Promise<string> {
  const room = await addToTable<Room>('rooms', { id: crypto.randomUUID(), name, defaultCurrency });
  return room.id;
}

export async function updateRoom(id: string, name: string): Promise<void> {
  await updateInTable<Room>('rooms', id, { name });
}

export async function deleteRoom(id: string): Promise<void> {
  await deleteFromTable('rooms', id);
}

export function getAllRooms(): Promise<Room[]> {
  return getTable<Room>('rooms');
}

// Tournaments
export async function addTournament(data: Omit<Tournament, 'id'>): Promise<string> {
  const tournament = await addToTable<Tournament>('tournaments', { ...data, id: crypto.randomUUID() });
  return tournament.id;
}

export async function updateTournament(id: string, data: Partial<Tournament>): Promise<void> {
  await updateInTable<Tournament>('tournaments', id, data);
}

export async function deleteTournament(id: string): Promise<void> {
  await deleteFromTable('tournaments', id);
}

export function getAllTournaments(): Promise<Tournament[]> {
  return getTable<Tournament>('tournaments');
}

// Sessions
export async function addSession(data: Omit<Session, 'id'>): Promise<number> {
  const session = await addToTable<Session>('sessions', data);
  return session.id;
}

export async function updateSession(id: number, data: Partial<Session>): Promise<void> {
  await updateInTable<Session>('sessions', id, data);
}

export async function deleteSession(id: number): Promise<void> {
  await deleteFromTable('sessions', id);
}

export function getAllSessions(): Promise<Session[]> {
  return getTable<Session>('sessions');
}

// Game Sessions
export async function addGameSession(data: Omit<GameSession, 'id'>): Promise<number> {
  const gs = await addToTable<GameSession>('gameSessions', data);
  return gs.id;
}

export async function updateGameSession(id: number, data: Partial<GameSession>): Promise<void> {
  await updateInTable<GameSession>('gameSessions', id, data);
}

export function getAllGameSessions(): Promise<GameSession[]> {
  return getTable<GameSession>('gameSessions');
}

// Goals
export async function addGoal(data: Omit<Goal, 'id'>): Promise<number> {
  const g = await addToTable<Goal>('goals', data);
  return g.id;
}

export async function updateGoal(id: number, data: Partial<Goal>): Promise<void> {
  await updateInTable<Goal>('goals', id, data);
}

export function getAllGoals(): Promise<Goal[]> {
  return getTable<Goal>('goals');
}

export async function deleteGoal(id: number): Promise<void> {
  await deleteFromTable('goals', id);
}

export async function addBankrollEntry(data: Omit<BankrollEntry, 'id' | 'createdAt'>): Promise<number> {
  const entry = await addToTable<BankrollEntry>('bankroll', { ...data, createdAt: Date.now() });
  return entry.id;
}

export async function deleteBankrollEntry(id: number): Promise<void> {
  await deleteFromTable('bankroll', id);
}

export async function updateBankrollEntry(id: number, data: Partial<BankrollEntry>): Promise<void> {
  await updateInTable<BankrollEntry>('bankroll', id, data);
}

export function getAllBankrollEntries(): Promise<BankrollEntry[]> {
  return getTable<BankrollEntry>('bankroll');
}

export async function exportAllData(): Promise<string> {
  const [rooms, tournaments, sessions, bankroll] = await Promise.all([
    getTable<Room>('rooms'),
    getTable<Tournament>('tournaments'),
    getTable<Session>('sessions'),
    getTable<BankrollEntry>('bankroll'),
  ]);
  return JSON.stringify({ rooms, tournaments, sessions, bankroll }, null, 2);
}

export async function clearAllSessions(): Promise<void> {
  const res = await fetch(`${API}/clear-sessions`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to clear sessions');
  const gameSessions = await getTable<GameSession>('gameSessions');
  await Promise.all(gameSessions.map(gs =>
    fetch(`${API}/gameSessions/${gs.id}`, { method: 'DELETE' })
  ));
}

export async function importAllData(json: string): Promise<void> {
  const data = JSON.parse(json);
  const res = await fetch(`${API}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to import data');
}

export async function loadTrainingData(): Promise<TrainingItem[]> {
  const res = await fetch(`${API}/training`);
  if (!res.ok) throw new Error('Failed to load training data');
  return res.json();
}

export async function saveTrainingData(items: TrainingItem[]): Promise<void> {
  const res = await fetch(`${API}/training`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Status ${res.status}: ${text}`);
  }
}

export function getCustomTournamentTypes(): Promise<{ id: number; name: string }[]> {
  return getTable('customTournamentTypes');
}

export async function addCustomTournamentType(name: string): Promise<{ id: number; name: string }> {
  const item = await addToTable<{ id: number; name: string }>('customTournamentTypes', { name } as any);
  return item;
}

export async function deleteCustomTournamentType(id: number): Promise<void> {
  await deleteFromTable('customTournamentTypes', id);
}
