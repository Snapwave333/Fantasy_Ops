const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = process.env.DB_PATH || './data/fantasy_ops.db';
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;
let SQL = null;
let initialized = false;

// Initialize database
const initDatabase = async () => {
  if (initialized) {
    return;
  }

  SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS leagues (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      sport TEXT NOT NULL DEFAULT 'football',
      max_teams INTEGER DEFAULT 12,
      scoring_type TEXT DEFAULT 'standard',
      draft_type TEXT DEFAULT 'snake',
      status TEXT DEFAULT 'draft',
      commissioner_id TEXT NOT NULL,
      season INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (commissioner_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      league_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      ties INTEGER DEFAULT 0,
      points_for REAL DEFAULT 0,
      points_against REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(league_id, owner_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      team TEXT NOT NULL,
      sport TEXT NOT NULL DEFAULT 'football',
      status TEXT DEFAULT 'active',
      bye_week INTEGER,
      avg_points REAL DEFAULT 0,
      total_points REAL DEFAULT 0,
      games_played INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rosters (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      roster_position TEXT NOT NULL,
      acquired_date TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      UNIQUE(team_id, player_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS weekly_scores (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      week INTEGER NOT NULL,
      season INTEGER NOT NULL,
      points REAL DEFAULT 0,
      opponent_id TEXT,
      result TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      UNIQUE(team_id, week, season)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS player_stats (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      week INTEGER NOT NULL,
      season INTEGER NOT NULL,
      points REAL DEFAULT 0,
      stats_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      UNIQUE(player_id, week, season)
    )
  `);

  // Create indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_rosters_team ON rosters(team_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_rosters_player ON rosters(player_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_players_position ON players(position)');

  // Check if we need to seed players
  const result = db.exec('SELECT COUNT(*) as count FROM players');
  const count = result.length > 0 ? result[0].values[0][0] : 0;

  if (count === 0) {
    seedSamplePlayers();
  }

  initialized = true;
  saveDatabase();
};

const saveDatabase = () => {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
};

const seedSamplePlayers = () => {
  const players = [
    { name: 'Patrick Mahomes', position: 'QB', team: 'KC', bye_week: 10, avg_points: 24.5 },
    { name: 'Josh Allen', position: 'QB', team: 'BUF', bye_week: 13, avg_points: 23.8 },
    { name: 'Jalen Hurts', position: 'QB', team: 'PHI', bye_week: 14, avg_points: 22.1 },
    { name: 'Lamar Jackson', position: 'QB', team: 'BAL', bye_week: 13, avg_points: 21.7 },
    { name: 'Joe Burrow', position: 'QB', team: 'CIN', bye_week: 7, avg_points: 20.3 },
    { name: 'Christian McCaffrey', position: 'RB', team: 'SF', bye_week: 9, avg_points: 22.4 },
    { name: 'Austin Ekeler', position: 'RB', team: 'LAC', bye_week: 5, avg_points: 19.8 },
    { name: 'Bijan Robinson', position: 'RB', team: 'ATL', bye_week: 11, avg_points: 18.5 },
    { name: 'Derrick Henry', position: 'RB', team: 'TEN', bye_week: 7, avg_points: 17.2 },
    { name: 'Tony Pollard', position: 'RB', team: 'DAL', bye_week: 7, avg_points: 16.9 },
    { name: 'Nick Chubb', position: 'RB', team: 'CLE', bye_week: 5, avg_points: 16.4 },
    { name: 'Josh Jacobs', position: 'RB', team: 'LV', bye_week: 13, avg_points: 15.8 },
    { name: 'Justin Jefferson', position: 'WR', team: 'MIN', bye_week: 13, avg_points: 20.1 },
    { name: 'Ja\'Marr Chase', position: 'WR', team: 'CIN', bye_week: 7, avg_points: 19.3 },
    { name: 'Tyreek Hill', position: 'WR', team: 'MIA', bye_week: 10, avg_points: 18.9 },
    { name: 'Davante Adams', position: 'WR', team: 'LV', bye_week: 13, avg_points: 17.6 },
    { name: 'CeeDee Lamb', position: 'WR', team: 'DAL', bye_week: 7, avg_points: 17.2 },
    { name: 'Stefon Diggs', position: 'WR', team: 'BUF', bye_week: 13, avg_points: 16.8 },
    { name: 'A.J. Brown', position: 'WR', team: 'PHI', bye_week: 14, avg_points: 16.4 },
    { name: 'Amon-Ra St. Brown', position: 'WR', team: 'DET', bye_week: 9, avg_points: 15.9 },
    { name: 'Travis Kelce', position: 'TE', team: 'KC', bye_week: 10, avg_points: 14.8 },
    { name: 'Mark Andrews', position: 'TE', team: 'BAL', bye_week: 13, avg_points: 13.2 },
    { name: 'T.J. Hockenson', position: 'TE', team: 'MIN', bye_week: 13, avg_points: 12.1 },
    { name: 'George Kittle', position: 'TE', team: 'SF', bye_week: 9, avg_points: 11.8 },
    { name: 'Dallas Goedert', position: 'TE', team: 'PHI', bye_week: 14, avg_points: 10.5 },
    { name: 'Justin Tucker', position: 'K', team: 'BAL', bye_week: 13, avg_points: 10.2 },
    { name: 'Harrison Butker', position: 'K', team: 'KC', bye_week: 10, avg_points: 9.8 },
    { name: 'Daniel Carlson', position: 'K', team: 'LV', bye_week: 13, avg_points: 9.5 },
    { name: 'San Francisco 49ers', position: 'DST', team: 'SF', bye_week: 9, avg_points: 11.3 },
    { name: 'Dallas Cowboys', position: 'DST', team: 'DAL', bye_week: 7, avg_points: 10.8 },
    { name: 'Buffalo Bills', position: 'DST', team: 'BUF', bye_week: 13, avg_points: 10.2 },
  ];

  for (const player of players) {
    const gamesPlayed = Math.floor(Math.random() * 5) + 10;
    db.run(
      'INSERT INTO players (id, name, position, team, sport, bye_week, avg_points, total_points, games_played) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), player.name, player.position, player.team, 'football', player.bye_week, player.avg_points, player.avg_points * gamesPlayed, gamesPlayed]
    );
  }
};

// Query helpers
const query = (sql, params = []) => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
};

const queryOne = (sql, params = []) => {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
};

const run = (sql, params = []) => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  db.run(sql, params);
  saveDatabase();
  return { changes: db.getRowsModified() };
};

module.exports = {
  initDatabase,
  query,
  queryOne,
  run,
  saveDatabase
};
