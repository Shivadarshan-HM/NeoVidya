// database.js
// NeoVidya – SQLite database bootstrap & helpers

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// ---- Resolve DB file path ----
const dbPath = path.join(__dirname, 'neovidya.db');

// ---- Open connection ----
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite:', dbPath);
  }
});

// ---- Promisified helpers (run/get/all) ----
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

// ---- Initialize schema, pragmas, triggers, indexes ----
async function initDatabase() {
  await run('PRAGMA foreign_keys = ON;');           // enforce FKs
  await run('PRAGMA journal_mode = WAL;');          // better concurrency
  await run('PRAGMA busy_timeout = 3000;');         // wait before "database is locked"
  await run('PRAGMA synchronous = NORMAL;');        // good balance of safety & speed

  // Create tables
  await run(`
    CREATE TABLE IF NOT EXISTS schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      school_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      subject TEXT,
      grade_level TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      score INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0 CHECK (completed IN (0,1)),
      last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );
  `);

  // Triggers: keep updated_at fresh on users
  await run(`
    CREATE TRIGGER IF NOT EXISTS users_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
  `);

  // Indexes: speed up frequent lookups/joins
  await run(`CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_progress_course ON progress(course_id);`);

  console.log('🛠️  Database tables, triggers, and indexes are ready.');
}

// ---- Seed sample data (idempotent) ----
async function seedSchoolRegistry() {
  const schools = [
    { name: 'Sample School 1', address: '123 Main St' },
    { name: 'Sample School 2', address: '456 Elm St' },
  ];

  for (const s of schools) {
    try {
      await run(
        `INSERT OR IGNORE INTO schools (name, address) VALUES (?, ?);`,
        [s.name, s.address]
      );
      // Check if inserted (optional)
      const row = await get(`SELECT id FROM schools WHERE name = ?;`, [s.name]);
      if (row) console.log(`🌱 School present: ${s.name} (id: ${row.id})`);
    } catch (err) {
      console.error('Seed error (schools):', err.message);
    }
  }
}

// ---- Health check helper ----
async function healthCheck() {
  try {
    const row = await get('SELECT 1 AS ok;');
    return { ok: !!row?.ok };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ---- Close db gracefully (call on app shutdown) ----
function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
        reject(err);
      } else {
        console.log('👋 SQLite connection closed.');
        resolve();
      }
    });
  });
}

module.exports = {
  db,                // raw sqlite3 Database instance (callback style)
  run, get, all,     // promise-based helpers
  initDatabase,
  seedSchoolRegistry,
  healthCheck,
  closeDatabase,
  dbPath
};
// ---- Temporary test user (for login demo) ----


(async () => {
  try {
    const exists = await get(`SELECT id FROM users WHERE username=?`, ['demo']).catch(() => null);
    if (!exists) {
      await run(
        `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
        ['demo', 'demo@example.com', '1234', 'student']
      );
      console.log('👤 Test user added: demo / 1234');
    } else {
      console.log('👤 Test user already exists');
    }
  } catch (e) {
    console.error('Test user seed error:', e.message);
  }
})();
