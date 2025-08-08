-- D1 schema
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('mc','tf','num')),
  category_id TEXT NOT NULL REFERENCES categories(id),
  text TEXT NOT NULL,
  options_json TEXT, -- for mc
  answer_text TEXT,  -- for tf ("true"/"false") or numeric answer
  tolerance REAL,    -- for numeric
  difficulty INTEGER DEFAULT 1,
  tags TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'lobby',
  round INTEGER DEFAULT 1,
  used_ids_json TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  name TEXT,
  avatar TEXT,
  score INTEGER DEFAULT 0,
  avg_ms REAL DEFAULT 0,
  answers INTEGER DEFAULT 0,
  joined_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  question_id TEXT NOT NULL REFERENCES questions(id),
  round INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
