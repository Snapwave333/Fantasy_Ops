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

  // News table
  db.run(`
    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      video_url TEXT,
      category TEXT DEFAULT 'general',
      author TEXT DEFAULT 'Fantasy Ops Staff',
      featured INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Media gallery table
  db.run(`
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      thumbnail_url TEXT,
      player_id TEXT,
      team_code TEXT,
      tags TEXT,
      views INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL
    )
  `);

  // Create indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_rosters_team ON rosters(team_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_rosters_player ON rosters(player_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_players_position ON players(position)');
  db.run('CREATE INDEX IF NOT EXISTS idx_news_category ON news(category)');
  db.run('CREATE INDEX IF NOT EXISTS idx_news_featured ON news(featured)');
  db.run('CREATE INDEX IF NOT EXISTS idx_media_type ON media(type)');

  // Check if we need to seed players
  const result = db.exec('SELECT COUNT(*) as count FROM players');
  const count = result.length > 0 ? result[0].values[0][0] : 0;

  if (count === 0) {
    seedSamplePlayers();
  }

  // Seed news if empty
  const newsResult = db.exec('SELECT COUNT(*) as count FROM news');
  const newsCount = newsResult.length > 0 ? newsResult[0].values[0][0] : 0;

  if (newsCount === 0) {
    seedSampleNews();
  }

  // Seed media if empty
  const mediaResult = db.exec('SELECT COUNT(*) as count FROM media');
  const mediaCount = mediaResult.length > 0 ? mediaResult[0].values[0][0] : 0;

  if (mediaCount === 0) {
    seedSampleMedia();
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

const seedSampleNews = () => {
  const news = [
    {
      title: 'Patrick Mahomes Leads Chiefs to Victory with 4 TDs',
      summary: 'Kansas City quarterback throws four touchdowns in dominant performance',
      content: 'Patrick Mahomes put on a clinic Sunday afternoon, throwing for 342 yards and four touchdowns as the Kansas City Chiefs dominated their opponents. Fantasy owners who started Mahomes were rewarded handsomely with over 30 fantasy points in standard scoring.',
      image_url: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800',
      video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      category: 'highlights',
      author: 'Mike Johnson',
      featured: 1
    },
    {
      title: 'Breaking: Christian McCaffrey Out 2-3 Weeks with Injury',
      summary: 'Star running back suffers hamstring strain in practice',
      content: 'The San Francisco 49ers announced that star running back Christian McCaffrey will miss 2-3 weeks with a hamstring injury suffered during Wednesday practice. Fantasy managers should immediately look to the waiver wire for replacements. Elijah Mitchell is expected to see increased workload.',
      image_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800',
      category: 'injuries',
      author: 'Sarah Williams',
      featured: 1
    },
    {
      title: 'Week 12 Waiver Wire: Top Pickups',
      summary: 'Best available players to target this week',
      content: 'With bye weeks and injuries piling up, here are the top waiver wire targets for Week 12: 1. Tank Bigsby (JAX) - RB seeing increased snaps. 2. Rashid Shaheed (NO) - WR with big play potential. 3. Chig Okonkwo (TEN) - TE with growing target share. Make these moves before your competition!',
      image_url: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800',
      category: 'analysis',
      author: 'Tom Bradley',
      featured: 0
    },
    {
      title: 'Trade Deadline Recap: Winners and Losers',
      summary: 'Analyzing the biggest fantasy impacts from recent trades',
      content: 'The NFL trade deadline brought several moves that will impact fantasy football. DeAndre Hopkins to the Titans boosts his value significantly. Calvin Ridley trade to the Jaguars creates a crowded receiver room. We break down each trade and what it means for your fantasy team.',
      image_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
      video_url: 'https://www.youtube.com/embed/L_jWHffIx5E',
      category: 'trades',
      author: 'Chris Martin',
      featured: 0
    },
    {
      title: 'Justin Jefferson Sets Single Game Receiving Record',
      summary: 'Vikings star catches 13 passes for 289 yards',
      content: 'Justin Jefferson put up one of the greatest receiving performances in NFL history, hauling in 13 catches for 289 yards and 2 touchdowns. Fantasy owners lucky enough to have him in their lineup enjoyed a massive 45+ point day. Jefferson now leads the league in receiving yards.',
      image_url: 'https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?w=800',
      category: 'highlights',
      author: 'Lisa Chen',
      featured: 1
    },
    {
      title: 'Start/Sit Week 13: Must-Start Sleepers',
      summary: 'Under-the-radar plays for your fantasy lineup',
      content: 'Week 13 brings favorable matchups for several under-owned players. START: Gus Edwards vs weak run defense, Romeo Doubs in high-scoring game script, Jake Ferguson with Dak return. SIT: Derrick Henry on short rest, Mike Evans vs top corner, Pat Freiermuth in run-heavy game plan.',
      image_url: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800',
      category: 'analysis',
      author: 'David Park',
      featured: 0
    },
    {
      title: 'Rookie Running Backs Making Fantasy Impact',
      summary: 'First-year RBs proving their worth in fantasy football',
      content: 'The 2024 rookie class of running backs is making waves in fantasy football. Bijan Robinson leads the pack with consistent RB1 numbers. Jahmyr Gibbs is flashing elite receiving ability. Devon Achane brings explosive plays weekly. These rookies are building dynasty value.',
      image_url: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800',
      category: 'rookies',
      author: 'Amanda Foster',
      featured: 0
    },
    {
      title: 'Fantasy Playoff Outlook: Teams to Target',
      summary: 'NFL teams with easiest fantasy playoff schedules',
      content: 'As fantasy playoffs approach (Weeks 15-17), schedule matters more than ever. Teams with favorable matchups: Miami Dolphins face weak pass defenses. Detroit Lions have plus matchups for all skill positions. Dallas Cowboys offense should thrive. Plan your moves now!',
      image_url: 'https://images.unsplash.com/photo-1461896836934- voices?w=800',
      category: 'strategy',
      author: 'Robert Taylor',
      featured: 1
    }
  ];

  for (const article of news) {
    db.run(
      'INSERT INTO news (id, title, summary, content, image_url, video_url, category, author, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), article.title, article.summary, article.content, article.image_url || null, article.video_url || null, article.category, article.author, article.featured]
    );
  }
};

const seedSampleMedia = () => {
  const media = [
    {
      title: 'Patrick Mahomes - Season Highlights',
      description: 'Best plays from Patrick Mahomes this season',
      type: 'video',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnail_url: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400',
      team_code: 'KC',
      tags: 'mahomes,chiefs,quarterback,highlights'
    },
    {
      title: 'Justin Jefferson Spectacular Catch',
      description: 'Incredible one-handed grab for touchdown',
      type: 'video',
      url: 'https://www.youtube.com/embed/L_jWHffIx5E',
      thumbnail_url: 'https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?w=400',
      team_code: 'MIN',
      tags: 'jefferson,vikings,receiver,catch'
    },
    {
      title: 'Christian McCaffrey Training Camp',
      description: 'CMC working out before the season',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200',
      thumbnail_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400',
      team_code: 'SF',
      tags: 'mccaffrey,49ers,running back,training'
    },
    {
      title: 'NFL Stadium Aerial View',
      description: 'Beautiful shot of football stadium',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200',
      thumbnail_url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=400',
      tags: 'stadium,nfl,football,aerial'
    },
    {
      title: 'Top 10 Plays of Week 11',
      description: 'Best fantasy performances from last week',
      type: 'video',
      url: 'https://www.youtube.com/embed/ScMzIvxBSi4',
      thumbnail_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400',
      tags: 'highlights,weekly,top plays'
    },
    {
      title: 'Fantasy Draft Strategy Guide',
      description: 'Expert tips for your fantasy draft',
      type: 'video',
      url: 'https://www.youtube.com/embed/1234567890',
      thumbnail_url: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=400',
      tags: 'draft,strategy,tips,guide'
    },
    {
      title: 'Football Action Shot',
      description: 'Intense game moment capture',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1200',
      thumbnail_url: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=400',
      tags: 'action,game,football,intensity'
    },
    {
      title: 'Touchdown Celebration',
      description: 'Players celebrating after scoring',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1200',
      thumbnail_url: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400',
      tags: 'celebration,touchdown,team,joy'
    }
  ];

  for (const item of media) {
    db.run(
      'INSERT INTO media (id, title, description, type, url, thumbnail_url, player_id, team_code, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), item.title, item.description, item.type, item.url, item.thumbnail_url, item.player_id || null, item.team_code || null, item.tags]
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
