const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class League {
  static create({ name, description, sport, max_teams, scoring_type, draft_type, commissioner_id, season }) {
    const id = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO leagues (id, name, description, sport, max_teams, scoring_type, draft_type, commissioner_id, season)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      name,
      description || null,
      sport || 'football',
      max_teams || 12,
      scoring_type || 'standard',
      draft_type || 'snake',
      commissioner_id,
      season || new Date().getFullYear()
    );

    return this.findById(id);
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT l.*, u.username as commissioner_name,
             (SELECT COUNT(*) FROM teams WHERE league_id = l.id) as team_count
      FROM leagues l
      JOIN users u ON l.commissioner_id = u.id
      WHERE l.id = ?
    `);
    return stmt.get(id);
  }

  static findAll({ sport, status, limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT l.*, u.username as commissioner_name,
             (SELECT COUNT(*) FROM teams WHERE league_id = l.id) as team_count
      FROM leagues l
      JOIN users u ON l.commissioner_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (sport) {
      query += ' AND l.sport = ?';
      params.push(sport);
    }

    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }

    query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  static findByUser(userId) {
    const stmt = db.prepare(`
      SELECT DISTINCT l.*, u.username as commissioner_name,
             (SELECT COUNT(*) FROM teams WHERE league_id = l.id) as team_count
      FROM leagues l
      JOIN users u ON l.commissioner_id = u.id
      LEFT JOIN teams t ON t.league_id = l.id
      WHERE l.commissioner_id = ? OR t.owner_id = ?
      ORDER BY l.created_at DESC
    `);
    return stmt.all(userId, userId);
  }

  static update(id, data) {
    const allowedFields = ['name', 'description', 'max_teams', 'scoring_type', 'draft_type', 'status'];
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
      UPDATE leagues SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return this.findById(id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM leagues WHERE id = ?');
    return stmt.run(id);
  }

  static getTeams(leagueId) {
    const stmt = db.prepare(`
      SELECT t.*, u.username as owner_name
      FROM teams t
      JOIN users u ON t.owner_id = u.id
      WHERE t.league_id = ?
      ORDER BY t.wins DESC, t.points_for DESC
    `);
    return stmt.all(leagueId);
  }

  static getStandings(leagueId) {
    const stmt = db.prepare(`
      SELECT t.*, u.username as owner_name,
             (t.wins * 2 + t.ties) as points,
             CASE WHEN (t.wins + t.losses + t.ties) > 0
                  THEN ROUND(CAST(t.wins AS FLOAT) / (t.wins + t.losses + t.ties), 3)
                  ELSE 0 END as win_percentage
      FROM teams t
      JOIN users u ON t.owner_id = u.id
      WHERE t.league_id = ?
      ORDER BY points DESC, win_percentage DESC, t.points_for DESC
    `);
    return stmt.all(leagueId);
  }

  static canJoin(leagueId, userId) {
    const league = this.findById(leagueId);
    if (!league) return { canJoin: false, reason: 'League not found' };

    if (league.team_count >= league.max_teams) {
      return { canJoin: false, reason: 'League is full' };
    }

    const existingTeam = db.prepare(
      'SELECT id FROM teams WHERE league_id = ? AND owner_id = ?'
    ).get(leagueId, userId);

    if (existingTeam) {
      return { canJoin: false, reason: 'Already in this league' };
    }

    return { canJoin: true };
  }
}

module.exports = League;
