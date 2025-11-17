const { query, queryOne, run } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Player {
  static findById(id) {
    return queryOne('SELECT * FROM players WHERE id = ?', [id]);
  }

  static findAll({ position, team, sport, status, search, limit = 100, offset = 0 } = {}) {
    let sql = 'SELECT * FROM players WHERE 1=1';
    const params = [];

    if (position) {
      sql += ' AND position = ?';
      params.push(position);
    }

    if (team) {
      sql += ' AND team = ?';
      params.push(team);
    }

    if (sport) {
      sql += ' AND sport = ?';
      params.push(sport);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY avg_points DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return query(sql, params);
  }

  static getAvailablePlayers(leagueId, { position, search, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT p.* FROM players p
      WHERE p.id NOT IN (
        SELECT r.player_id FROM rosters r
        JOIN teams t ON r.team_id = t.id
        WHERE t.league_id = ?
      )
    `;
    const params = [leagueId];

    if (position) {
      sql += ' AND p.position = ?';
      params.push(position);
    }

    if (search) {
      sql += ' AND p.name LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY p.avg_points DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return query(sql, params);
  }

  static create({ name, position, team, sport, status, bye_week, avg_points }) {
    const id = uuidv4();

    run(
      'INSERT INTO players (id, name, position, team, sport, status, bye_week, avg_points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, position, team, sport || 'football', status || 'active', bye_week || null, avg_points || 0]
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

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    run(`UPDATE players SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  static getStats(playerId) {
    return query(
      'SELECT * FROM player_stats WHERE player_id = ? ORDER BY season DESC, week DESC LIMIT 20',
      [playerId]
    );
  }

  static recordStats(playerId, week, season, points, statsJson = null) {
    const id = uuidv4();

    run(
      'INSERT OR REPLACE INTO player_stats (id, player_id, week, season, points, stats_json) VALUES (?, ?, ?, ?, ?, ?)',
      [id, playerId, week, season, points, statsJson ? JSON.stringify(statsJson) : null]
    );

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
    let sql = 'SELECT * FROM players WHERE status = ?';
    const params = ['active'];

    if (position) {
      sql += ' AND position = ?';
      params.push(position);
    }

    sql += ' ORDER BY avg_points DESC LIMIT ?';
    params.push(limit);

    return query(sql, params);
  }

  static getPositions() {
    const results = query('SELECT DISTINCT position FROM players ORDER BY position');
    return results.map(row => row.position);
  }

  static getTeams() {
    const results = query('SELECT DISTINCT team FROM players ORDER BY team');
    return results.map(row => row.team);
  }
}

module.exports = Player;
