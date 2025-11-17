const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || './data/fantasy_ops.db';
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
const initDatabase = () => {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Leagues table
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (commissioner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Teams table
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(league_id, owner_id)
    );

    -- Players table
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Team rosters (players on teams)
    CREATE TABLE IF NOT EXISTS rosters (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      roster_position TEXT NOT NULL,
      acquired_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      UNIQUE(team_id, player_id)
    );

    -- Weekly scores
    CREATE TABLE IF NOT EXISTS weekly_scores (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      week INTEGER NOT NULL,
      season INTEGER NOT NULL,
      points REAL DEFAULT 0,
      opponent_id TEXT,
      result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (opponent_id) REFERENCES teams(id) ON DELETE SET NULL,
      UNIQUE(team_id, week, season)
    );

    -- Player statistics
    CREATE TABLE IF NOT EXISTS player_stats (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      week INTEGER NOT NULL,
      season INTEGER NOT NULL,
      points REAL DEFAULT 0,
      stats_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      UNIQUE(player_id, week, season)
    );

    -- Trades
    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      league_id TEXT NOT NULL,
      proposer_team_id TEXT NOT NULL,
      receiver_team_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      proposed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
      FOREIGN KEY (proposer_team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    -- Trade items
    CREATE TABLE IF NOT EXISTS trade_items (
      id TEXT PRIMARY KEY,
      trade_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      from_team_id TEXT NOT NULL,
      to_team_id TEXT NOT NULL,
      FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY (from_team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (to_team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_id);
    CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
    CREATE INDEX IF NOT EXISTS idx_rosters_team ON rosters(team_id);
    CREATE INDEX IF NOT EXISTS idx_rosters_player ON rosters(player_id);
    CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats(player_id);
    CREATE INDEX IF NOT EXISTS idx_weekly_scores_team ON weekly_scores(team_id);
    CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
    CREATE INDEX IF NOT EXISTS idx_players_sport ON players(sport);
  `);

  // Seed some sample players if none exist
  const playerCount = db.prepare('SELECT COUNT(*) as count FROM players').get();
  if (playerCount.count === 0) {
    seedSamplePlayers();
  }
};

const seedSamplePlayers = () => {
  const { v4: uuidv4 } = require('uuid');

  const players = [
    // Quarterbacks
    { name: 'Patrick Mahomes', position: 'QB', team: 'KC', bye_week: 10, avg_points: 24.5 },
    { name: 'Josh Allen', position: 'QB', team: 'BUF', bye_week: 13, avg_points: 23.8 },
    { name: 'Jalen Hurts', position: 'QB', team: 'PHI', bye_week: 14, avg_points: 22.1 },
    { name: 'Lamar Jackson', position: 'QB', team: 'BAL', bye_week: 13, avg_points: 21.7 },
    { name: 'Joe Burrow', position: 'QB', team: 'CIN', bye_week: 7, avg_points: 20.3 },

    // Running Backs
    { name: 'Christian McCaffrey', position: 'RB', team: 'SF', bye_week: 9, avg_points: 22.4 },
    { name: 'Austin Ekeler', position: 'RB', team: 'LAC', bye_week: 5, avg_points: 19.8 },
    { name: 'Bijan Robinson', position: 'RB', team: 'ATL', bye_week: 11, avg_points: 18.5 },
    { name: 'Derrick Henry', position: 'RB', team: 'TEN', bye_week: 7, avg_points: 17.2 },
    { name: 'Tony Pollard', position: 'RB', team: 'DAL', bye_week: 7, avg_points: 16.9 },
    { name: 'Nick Chubb', position: 'RB', team: 'CLE', bye_week: 5, avg_points: 16.4 },
    { name: 'Josh Jacobs', position: 'RB', team: 'LV', bye_week: 13, avg_points: 15.8 },

    // Wide Receivers
    { name: 'Justin Jefferson', position: 'WR', team: 'MIN', bye_week: 13, avg_points: 20.1 },
    { name: 'Ja\'Marr Chase', position: 'WR', team: 'CIN', bye_week: 7, avg_points: 19.3 },
    { name: 'Tyreek Hill', position: 'WR', team: 'MIA', bye_week: 10, avg_points: 18.9 },
    { name: 'Davante Adams', position: 'WR', team: 'LV', bye_week: 13, avg_points: 17.6 },
    { name: 'CeeDee Lamb', position: 'WR', team: 'DAL', bye_week: 7, avg_points: 17.2 },
    { name: 'Stefon Diggs', position: 'WR', team: 'BUF', bye_week: 13, avg_points: 16.8 },
    { name: 'A.J. Brown', position: 'WR', team: 'PHI', bye_week: 14, avg_points: 16.4 },
    { name: 'Amon-Ra St. Brown', position: 'WR', team: 'DET', bye_week: 9, avg_points: 15.9 },

    // Tight Ends
    { name: 'Travis Kelce', position: 'TE', team: 'KC', bye_week: 10, avg_points: 14.8 },
    { name: 'Mark Andrews', position: 'TE', team: 'BAL', bye_week: 13, avg_points: 13.2 },
    { name: 'T.J. Hockenson', position: 'TE', team: 'MIN', bye_week: 13, avg_points: 12.1 },
    { name: 'George Kittle', position: 'TE', team: 'SF', bye_week: 9, avg_points: 11.8 },
    { name: 'Dallas Goedert', position: 'TE', team: 'PHI', bye_week: 14, avg_points: 10.5 },

    // Kickers
    { name: 'Justin Tucker', position: 'K', team: 'BAL', bye_week: 13, avg_points: 10.2 },
    { name: 'Harrison Butker', position: 'K', team: 'KC', bye_week: 10, avg_points: 9.8 },
    { name: 'Daniel Carlson', position: 'K', team: 'LV', bye_week: 13, avg_points: 9.5 },

    // Defense/Special Teams
    { name: 'San Francisco 49ers', position: 'DST', team: 'SF', bye_week: 9, avg_points: 11.3 },
    { name: 'Dallas Cowboys', position: 'DST', team: 'DAL', bye_week: 7, avg_points: 10.8 },
    { name: 'Buffalo Bills', position: 'DST', team: 'BUF', bye_week: 13, avg_points: 10.2 },
  ];

  const insertPlayer = db.prepare(`
    INSERT INTO players (id, name, position, team, sport, bye_week, avg_points, total_points, games_played)
    VALUES (?, ?, ?, ?, 'football', ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((players) => {
    for (const player of players) {
      const gamesPlayed = Math.floor(Math.random() * 5) + 10;
      insertPlayer.run(
        uuidv4(),
        player.name,
        player.position,
        player.team,
        player.bye_week,
        player.avg_points,
        player.avg_points * gamesPlayed,
        gamesPlayed
      );
    }
  });

  insertMany(players);
};

module.exports = { db, initDatabase };
