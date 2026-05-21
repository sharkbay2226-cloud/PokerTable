import { getAllRooms, getAllSessions } from './db';
import type { Session, Tournament, Room } from '../types';
import seedData from './seed_data.json';

interface SeedData {
  rooms: Room[];
  tournaments: Tournament[];
  sessions: Session[];
}

export async function seedDatabase() {
  try {
    const data = seedData as SeedData;
    const roomCount = (await getAllRooms()).length;

    if (roomCount > 0) {
      const sessions = await getAllSessions();
      if (sessions.length > 0) {
        const hasOldFields = 'bountyCount' in sessions[0] || !('inPrize' in sessions[0]);
        if (hasOldFields) {
          console.log('Clearing old schema data and re-seeding...');
          await fetch('/api/seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rooms: [], tournaments: [], sessions: [], bankroll: [] }),
          });
        } else {
          console.log('Database has data, skipping seed');
          return;
        }
      } else {
        return;
      }
    }

    console.log('Seeding database...');
    await fetch('/api/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    console.log(`Seeded ${data.rooms.length} rooms, ${data.tournaments.length} tournaments, ${data.sessions.length} sessions`);
  } catch (err) {
    console.error('Seed error, clearing and retrying...', err);
    try {
      await fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seedData),
      });
      console.log('Database re-seeded successfully after error!');
    } catch (e) {
      console.error('Fatal seed error:', e);
    }
  }
}
