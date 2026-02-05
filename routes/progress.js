const express = require('express');
const { db } = require('../database');

const router = express.Router();

function titleFromSubject(subject) {
  if (!subject) return 'Course';
  return subject.charAt(0).toUpperCase() + subject.slice(1);
}

function getOrCreateCourseId(subject, cb) {
  db.get(`SELECT id FROM courses WHERE subject = ? LIMIT 1`, [subject], (err, row) => {
    if (err) return cb(err);
    if (row?.id) return cb(null, row.id);

    const title = titleFromSubject(subject);
    db.run(
      `INSERT INTO courses (title, subject, description) VALUES (?, ?, ?)`
      , [title, subject, `${title} course`],
      function (insertErr) {
        if (insertErr) return cb(insertErr);
        cb(null, this.lastID);
      }
    );
  });
}

// Middleware to authenticate token (simplified - should be imported from auth)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // For now, just check if token exists (simplified)
  // In production, verify JWT properly
  req.user = { id: 1 }; // Mock user ID
  next();
}

// Get user progress
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(`
    SELECT subject_key, chapter_index, item_index, completed, score, completed_at
    FROM progress
    WHERE user_id = ?
    ORDER BY subject_key, chapter_index, item_index
  `, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Group by subject
    const progress = {};
    rows.forEach(row => {
      if (!progress[row.subject_key]) {
        progress[row.subject_key] = {};
      }
      if (!progress[row.subject_key][row.chapter_index]) {
        progress[row.subject_key][row.chapter_index] = {};
      }
      progress[row.subject_key][row.chapter_index][row.item_index] = {
        completed: row.completed,
        score: row.score,
        completed_at: row.completed_at
      };
    });

    res.json({ progress });
  });
});

// Update progress for a specific item
router.post('/:subject/:chapter/:item', authenticateToken, (req, res) => {
  const { subject, chapter, item } = req.params;
  const { completed, score } = req.body;
  const userId = req.user.id;

  const chapterIndex = parseInt(chapter);
  const itemIndex = parseInt(item);

  if (isNaN(chapterIndex) || isNaN(itemIndex)) {
    return res.status(400).json({ error: 'Invalid chapter or item index' });
  }

  getOrCreateCourseId(subject, (courseErr, courseId) => {
    if (courseErr) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Check if progress already exists
    db.get(`
      SELECT id FROM progress
      WHERE user_id = ? AND subject_key = ? AND chapter_index = ? AND item_index = ?
    `, [userId, subject, chapterIndex, itemIndex], (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const now = new Date().toISOString();

      if (existing) {
        // Update existing progress
        db.run(`
          UPDATE progress
          SET completed = ?, score = ?, completed_at = ?, course_id = ?
          WHERE user_id = ? AND subject_key = ? AND chapter_index = ? AND item_index = ?
        `, [completed ? 1 : 0, score || 0, completed ? now : null, courseId, userId, subject, chapterIndex, itemIndex], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to update progress' });
          }
          res.json({ message: 'Progress updated' });
        });
      } else {
        // Insert new progress
        db.run(`
          INSERT INTO progress (user_id, course_id, subject_key, chapter_index, item_index, completed, score, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, courseId, subject, chapterIndex, itemIndex, completed ? 1 : 0, score || 0, completed ? now : null], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to save progress' });
          }
          res.json({ message: 'Progress saved' });
        });
      }
    });
  });
});

// Get user stats (XP, streak, etc.)
router.get('/stats', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.get(`
    SELECT xp, streak, last_active
    FROM users
    WHERE id = ?
  `, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate total completed items
    db.get(`
      SELECT COUNT(*) as completed_count
      FROM progress
      WHERE user_id = ? AND completed = 1
    `, [userId], (err, stats) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        xp: user.xp,
        streak: user.streak,
        last_active: user.last_active,
        completed_items: stats.completed_count
      });
    });
  });
});

// Update user XP and streak
router.post('/stats', authenticateToken, (req, res) => {
  const { xp, streak } = req.body;
  const userId = req.user.id;

  if (xp !== undefined && xp < 0) {
    return res.status(400).json({ error: 'XP cannot be negative' });
  }

  if (streak !== undefined && streak < 0) {
    return res.status(400).json({ error: 'Streak cannot be negative' });
  }

  let sql = 'UPDATE users SET last_active = CURRENT_TIMESTAMP';
  let params = [];

  if (xp !== undefined) {
    sql += ', xp = ?';
    params.push(xp);
  }

  if (streak !== undefined) {
    sql += ', streak = ?';
    params.push(streak);
  }

  sql += ' WHERE id = ?';
  params.push(userId);

  db.run(sql, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update stats' });
    }

    res.json({ message: 'Stats updated' });
  });
});

module.exports = router;
