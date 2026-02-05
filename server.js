// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// DB bootstrap & helpers
const {
  db,
  dbPath,
  initDatabase,
  seedSchoolRegistry,
  seedDemoUser,
  healthCheck
} = require('./database');

// Routes (import after DB helpers is fine)
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const progressRoutes = require('./routes/progress');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- Security (dev-friendly CSP) ----------------
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ---------------- CORS ----------------
const allowedOrigins = [
  `http://localhost:${PORT}`,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// ---------------- Parsers ----------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------- Rate limit ONLY API ----------------
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ---------------- Health ----------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
app.get('/api/health/db', async (_req, res) => {
  const status = await healthCheck();
  res.status(status.ok ? 200 : 500).json(status);
});

// ---------------- Static frontend ----------------
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));

// SPA fallback for NON-API routes
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'dash1.html')); // change if your entry is login.html
});

// ---------------- Errors ----------------
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', detail: err.message });
});

// ---------------- Start only after DB is ready ----------------
async function start() {
  try {
    console.log('SQLite file:', dbPath);
    await initDatabase();          // ensures PRAGMAs, tables, triggers, indexes
    await seedSchoolRegistry();    // safe to run repeatedly
    await seedDemoUser();          // safe to run repeatedly

    // Mount API routes **after** DB is ready to avoid "no such table" on first hits
    app.use('/api/auth', authRoutes);
    app.use('/api/courses', courseRoutes);
    app.use('/api/progress', progressRoutes);

    app.listen(PORT, () => {
      console.log(`NeoVidya server running on http://localhost:${PORT}`);
      console.log(`Serving static files from: ${PUBLIC_DIR}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\nShutting down...');
      db.close((err) => {
        if (err) console.error('Error closing SQLite:', err.message);
        else console.log('SQLite connection closed.');
        process.exit(0);
      });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (e) {
    console.error('DB initialization error:', e);
    process.exit(1);
  }
}

start();

module.exports = app;
