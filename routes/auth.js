// routes/auth.js  — simple auth matched to your SQLite tables
const express = require('express');
const router = express.Router();

// Promise helpers from your database.js:
//   - get(sql, params?) -> row | undefined
//   - run(sql, params?) -> { lastID, changes }
const { get, run } = require('../database');

// Decide whether user typed an email or a username
function pickLoginKey(login) {
  return (typeof login === 'string' && login.includes('@')) ? 'email' : 'username';
}

// Basic field cleanup
function clean(s) {
  return (typeof s === 'string' ? s.trim() : '');
}

// POST /api/auth/register
// body: { username, email, password, role? }
router.post('/register', async (req, res) => {
  try {
    let { username, email, password, role = 'student' } = req.body || {};
    username = clean(username);
    email = clean(email).toLowerCase();
    password = clean(password);
    role = clean(role) || 'student';

    if (!username || !email || !password) {
      return res.status(400).json({ ok: false, message: 'username, email, password are required' });
    }

    // Optional: allow only known roles
    if (!['student', 'teacher', 'admin'].includes(role)) role = 'student';

    // Uniqueness checks
    const existsUser = await get('SELECT id FROM users WHERE username = ?', [username]);
    if (existsUser) return res.status(409).json({ ok: false, message: 'Username already exists' });

    const existsEmail = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existsEmail) return res.status(409).json({ ok: false, message: 'Email already exists' });

    // Store as-is (plain password to match your current table)
    const result = await run(
      `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
      [username, email, password, role]
    );

    return res.status(201).json({
      ok: true,
      message: 'User registered',
      user: { id: result.lastID, username, email, role }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// POST /api/auth/login
// body: { login, password }  // login can be username OR email
// also accepts { email, password } or { username, password } for flexibility
router.post('/login', async (req, res) => {
  try {
    // Accept multiple shapes to match different frontends
    let login = clean(req.body?.login || req.body?.email || req.body?.username);
    const password = clean(req.body?.password);

    if (!login || !password) {
      return res.status(400).json({ ok: false, message: 'login (email/username) and password are required' });
    }

    // Normalize email case
    if (login.includes('@')) login = login.toLowerCase();

    const key = pickLoginKey(login); // 'email' or 'username'
    const user = await get(
      `SELECT id, username, email, password, role FROM users WHERE ${key} = ?`,
      [login]
    );

    if (!user || user.password !== password) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    // Success: return user (no token in this simple version)
    return res.json({
      ok: true,
      message: 'Login successful',
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;
