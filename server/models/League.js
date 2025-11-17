const { query, queryOne, run } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class League {
  static create({ name, description, sport, max_teams, scoring_type, draft_type, commissioner_id, season }) {
    const id = uuidv4();

    run(
      'INSERT INTO leagues (id, name, description, sport, max_teams, scoring_type, draft_type, commissioner_id, season) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        name,
        description || null,
        sport || 'football',
        max_teams || 12,
        scoring_type || 'standard',
        draft_type || 'snake',
        commissioner_id,
        season || new Date().getFullYear()
      ]
    );

    return this.findById(id);
  }

  static findById(id) {
    return queryOne(`
      SELECT l.*, u.username as commissioner_name,
             (SELECT COUNT(*) FROM teams WHERE league_id = l.id) as team_count
      FROM leagues l
      JOIN users u ON l.commissioner_id = u.id
      WHERE l.id = ?
    `, [id]);
  }

  static findAll({ sport, status, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT l.*, u.username as commissioner_name,
             (SELECT COUNT(*) FROM teams WHERE league_id = l.id) as team_count
      FROM leagues l
      JOIN users u ON l.commissioner_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (sport) {
      sql += ' AND l.sport = ?';
      params.push(sport);
    }

    if (status) {
      sql += ' AND l.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return query(sql, params);
  }

  static findByUser(userId) {
    return query(`
      SELECT DISTINCT l.*, u.username as commissioner_name,
             (SELECT COUNT(*) FROM teams WHERE league_id = l.id) as team_count
      FROM leagues l
      JOIN users u ON l.commissioner_id = u.id
      LEFT JOIN teams t ON t.league_id = l.id
      WHERE l.commissioner_id = ? OR t.owner_id = ?
      ORDER BY l.created_at DESC
    `, [userId, userId]);
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

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    run(`UPDATE leagues SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  static delete(id) {
    return run('DELETE FROM leagues WHERE id = ?', [id]);
  }

  static getTeams(leagueId) {
    return query(`
      SELECT t.*, u.username as owner_name
      FROM teams t
      JOIN users u ON t.owner_id = u.id
      WHERE t.league_id = ?
      ORDER BY t.wins DESC, t.points_for DESC
    `, [leagueId]);
  }

  static getStandings(leagueId) {
    return query(`
      SELECT t.*, u.username as owner_name,
             (t.wins * 2 + t.ties) as points,
             CASE WHEN (t.wins + t.losses + t.ties) > 0
                  THEN ROUND(CAST(t.wins AS FLOAT) / (t.wins + t.losses + t.ties), 3)
                  ELSE 0 END as win_percentage
      FROM teams t
      JOIN users u ON t.owner_id = u.id
      WHERE t.league_id = ?
      ORDER BY points DESC, win_percentage DESC, t.points_for DESC
    `, [leagueId]);
  }

  static canJoin(leagueId, userId) {
    const league = this.findById(leagueId);
    if (!league) {
      return { canJoin: false, reason: 'League not found' };
    }

    if (league.team_count >= league.max_teams) {
      return { canJoin: false, reason: 'League is full' };
    }

    const existingTeam = queryOne(
      'SELECT id FROM teams WHERE league_id = ? AND owner_id = ?',
      [leagueId, userId]
    );

    if (existingTeam) {
      return { canJoin: false, reason: 'Already in this league' };
    }

    return { canJoin: true };
  }
}

module.exports = League;
