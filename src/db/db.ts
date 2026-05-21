import type { Room, Tournament, Session, BankrollEntry } from '../types';

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
export async function addRoom(name: string): Promise<string> {
  const room = await addToTable<Room>('rooms', { id: crypto.randomUUID(), name });
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

// Bankroll
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
