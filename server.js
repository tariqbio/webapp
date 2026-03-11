const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Simple PIN auth middleware ──────────────────────────────────────
// Pins are set via environment variables: TARIQ_PIN and NAWSHIN_PIN
// Default fallback pins for local dev only
const PINS = {
  tariq:   process.env.TARIQ_PIN   || '1111',
  nawshin: process.env.NAWSHIN_PIN || '2222',
};

function authMiddleware(req, res, next) {
  const { person, pin } = req.headers;
  if (!person || !pin) return res.status(401).json({ error: 'Missing person or pin header' });
  const name = person.toLowerCase();
  if (!PINS[name] || PINS[name] !== pin) return res.status(401).json({ error: 'Invalid credentials' });
  req.person = name;
  next();
}

// ── Routes ─────────────────────────────────────────────────────────

// POST /api/login  — verify pin, return person name
app.post('/api/login', (req, res) => {
  const { person, pin } = req.body;
  if (!person || !pin) return res.status(400).json({ error: 'person and pin required' });
  const name = person.toLowerCase();
  if (PINS[name] && PINS[name] === pin) {
    res.json({ success: true, person: name });
  } else {
    res.status(401).json({ error: 'Wrong PIN' });
  }
});

// GET /api/entries — get all entries (authenticated)
app.get('/api/entries', authMiddleware, (req, res) => {
  const { month, year } = req.query;
  let entries;
  if (month && year) {
    entries = db.prepare(`
      SELECT * FROM entries
      WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?
      ORDER BY date DESC, created_at DESC
    `).all(String(year), String(month).padStart(2, '0'));
  } else {
    entries = db.prepare(`
      SELECT * FROM entries ORDER BY date DESC, created_at DESC LIMIT 500
    `).all();
  }
  res.json(entries);
});

// POST /api/entries — add new entry
app.post('/api/entries', authMiddleware, (req, res) => {
  const { date, description, category, type, amount } = req.body;
  if (!date || !description || !category || !type || amount == null) {
    return res.status(400).json({ error: 'All fields required: date, description, category, type, amount' });
  }
  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'type must be income or expense' });
  }
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  const stmt = db.prepare(`
    INSERT INTO entries (date, description, category, type, amount, person)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(date, description.trim(), category, type, parseFloat(amount), req.person);
  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(entry);
});

// DELETE /api/entries/:id — delete own entry
app.delete('/api/entries/:id', authMiddleware, (req, res) => {
  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  if (entry.person !== req.person) return res.status(403).json({ error: 'Can only delete your own entries' });
  db.prepare('DELETE FROM entries WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/insights — computed analytics for current month
app.get('/api/insights', authMiddleware, (req, res) => {
  const { month, year } = req.query;
  const y = year  || new Date().getFullYear();
  const m = month || String(new Date().getMonth() + 1).padStart(2, '0');
  const mm = String(m).padStart(2, '0');

  const entries = db.prepare(`
    SELECT * FROM entries
    WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?
  `).all(String(y), mm);

  const income   = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const expenses = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const balance  = income - expenses;

  // per person
  const byPerson = {};
  for (const e of entries) {
    if (!byPerson[e.person]) byPerson[e.person] = { income: 0, expenses: 0, count: 0 };
    if (e.type === 'income') byPerson[e.person].income += e.amount;
    else                     byPerson[e.person].expenses += e.amount;
    byPerson[e.person].count++;
  }

  // by category
  const byCategory = {};
  for (const e of entries.filter(x => x.type === 'expense')) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  }

  // daily totals
  const byDay = {};
  for (const e of entries.filter(x => x.type === 'expense')) {
    byDay[e.date] = (byDay[e.date] || 0) + e.amount;
  }

  // days with data
  const activeDays = Object.keys(byDay).length;
  const avgDaily   = activeDays > 0 ? expenses / activeDays : 0;

  // biggest single expense
  const expenseEntries = entries.filter(e => e.type === 'expense');
  const biggest = expenseEntries.sort((a, b) => b.amount - a.amount)[0] || null;

  // top 5 expenses
  const top5 = expenseEntries.slice(0, 5);

  res.json({
    month: mm, year: y,
    summary: { income, expenses, balance, activeDays, avgDaily },
    byPerson,
    byCategory,
    byDay,
    biggest,
    top5,
    totalEntries: entries.length,
  });
});

// GET /api/months — list of months that have data
app.get('/api/months', authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT DISTINCT strftime('%Y', date) as year, strftime('%m', date) as month
    FROM entries ORDER BY year DESC, month DESC
  `).all();
  res.json(rows);
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅  Expense tracker running at http://localhost:${PORT}`);
});
