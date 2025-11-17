const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Player {
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM players WHERE id = ?');
    return stmt.get(id);
  }

  static findAll({ position, team, sport, status, search, limit = 100, offset = 0 } = {}) {
    let query = 'SELECT * FROM players WHERE 1=1';
    const params = [];

    if (position) {
      query += ' AND position = ?';
      params.push(position);
    }

    if (team) {
      query += ' AND team = ?';
      params.push(team);
    }

    if (sport) {
      query += ' AND sport = ?';
      params.push(sport);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY avg_points DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  static getAvailablePlayers(leagueId, { position, search, limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT p.* FROM players p
      WHERE p.id NOT IN (
        SELECT r.player_id FROM rosters r
        JOIN teams t ON r.team_id = t.id
        WHERE t.league_id = ?
      )
    `;
    const params = [leagueId];

    if (position) {
      query += ' AND p.position = ?';
      params.push(position);
    }

    if (search) {
      query += ' AND p.name LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY p.avg_points DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  static create({ name, position, team, sport, status, bye_week, avg_points }) {
    const id = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO players (id, name, position, team, sport, status, bye_week, avg_points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      name,
      position,
      team,
      sport || 'football',
      status || 'active',
      bye_week || null,
      avg_points || 0
    );

    return this.findById(id);
  }

  static update(id, data) {
    const allowedFields = ['name', 'position', 'team', 'status', 'bye_week', 'avg_points', 'total_points', 'games_played'];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE players SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return this.findById(id);
  }

  static getStats(playerId) {
    const stmt = db.prepare(`
      SELECT * FROM player_stats
      WHERE player_id = ?
      ORDER BY season DESC, week DESC
      LIMIT 20
    `);
    return stmt.all(playerId);
  }

  static recordStats(playerId, week, season, points, statsJson = null) {
    const id = uuidv4();

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO player_stats (id, player_id, week, season, points, stats_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, playerId, week, season, points, statsJson ? JSON.stringify(statsJson) : null);

    // Update player's cumulative stats
    const player = this.findById(playerId);
    if (player) {
      const newTotalPoints = player.total_points + points;
      const newGamesPlayed = player.games_played + 1;
      const newAvgPoints = newTotalPoints / newGamesPlayed;

      this.update(playerId, {
        total_points: newTotalPoints,
        games_played: newGamesPlayed,
        avg_points: Math.round(newAvgPoints * 10) / 10
      });
    }

    return this.getStats(playerId);
  }

  static getTopPlayers(position = null, limit = 10) {
    let query = 'SELECT * FROM players WHERE status = ?';
    const params = ['active'];

    if (position) {
      query += ' AND position = ?';
      params.push(position);
    }

    query += ' ORDER BY avg_points DESC LIMIT ?';
    params.push(limit);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  static getPositions() {
    const stmt = db.prepare('SELECT DISTINCT position FROM players ORDER BY position');
    return stmt.all().map(row => row.position);
  }

  static getTeams() {
    const stmt = db.prepare('SELECT DISTINCT team FROM players ORDER BY team');
    return stmt.all().map(row => row.team);
  }
}

module.exports = Player;
