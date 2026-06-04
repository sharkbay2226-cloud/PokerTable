import { initDb } from './db.js';
import { getDb } from './db.js';
await initDb();
const db = getDb();
db.run("UPDATE orders SET license_key=NULL WHERE id=1");
db.run("DELETE FROM licenses WHERE user_id=1188567309");
console.log('Done');
process.exit(0);
