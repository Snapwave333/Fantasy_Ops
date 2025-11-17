const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Team {
  static create({ name, league_id, owner_id }) {
    const id = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO teams (id, name, league_id, owner_id)
      VALUES (?, ?, ?, ?)
    `);

    try {
      stmt.run(id, name, league_id, owner_id);
      return this.findById(id);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new Error('User already has a team in this league');
      }
      throw error;
    }
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT t.*, u.username as owner_name, l.name as league_name
      FROM teams t
      JOIN users u ON t.owner_id = u.id
      JOIN leagues l ON t.league_id = l.id
      WHERE t.id = ?
    `);
    return stmt.get(id);
  }

  static findByUser(userId) {
    const stmt = db.prepare(`
      SELECT t.*, u.username as owner_name, l.name as league_name, l.sport
      FROM teams t
      JOIN users u ON t.owner_id = u.id
      JOIN leagues l ON t.league_id = l.id
      WHERE t.owner_id = ?
      ORDER BY t.created_at DESC
    `);
    return stmt.all(userId);
  }

  static findByLeague(leagueId) {
    const stmt = db.prepare(`
      SELECT t.*, u.username as owner_name
      FROM teams t
      JOIN users u ON t.owner_id = u.id
      WHERE t.league_id = ?
      ORDER BY t.wins DESC, t.points_for DESC
    `);
    return stmt.all(leagueId);
  }

  static update(id, data) {
    const allowedFields = ['name', 'wins', 'losses', 'ties', 'points_for', 'points_against'];
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
      UPDATE teams SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return this.findById(id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM teams WHERE id = ?');
    return stmt.run(id);
  }

  static getRoster(teamId) {
    const stmt = db.prepare(`
      SELECT r.*, p.name as player_name, p.position, p.team as nfl_team,
             p.avg_points, p.total_points, p.games_played, p.status, p.bye_week
      FROM rosters r
      JOIN players p ON r.player_id = p.id
      WHERE r.team_id = ?
      ORDER BY
        CASE p.position
          WHEN 'QB' THEN 1
          WHEN 'RB' THEN 2
          WHEN 'WR' THEN 3
          WHEN 'TE' THEN 4
          WHEN 'K' THEN 5
          WHEN 'DST' THEN 6
          ELSE 7
        END,
        p.avg_points DESC
    `);
    return stmt.all(teamId);
  }

  static addPlayer(teamId, playerId, rosterPosition) {
    const id = uuidv4();

    // Check if player is already on a team in the same league
    const team = this.findById(teamId);
    if (!team) throw new Error('Team not found');

    const existingRoster = db.prepare(`
      SELECT r.id FROM rosters r
      JOIN teams t ON r.team_id = t.id
      WHERE r.player_id = ? AND t.league_id = ?
    `).get(playerId, team.league_id);

    if (existingRoster) {
      throw new Error('Player is already on a team in this league');
    }

    const stmt = db.prepare(`
      INSERT INTO rosters (id, team_id, player_id, roster_position)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, teamId, playerId, rosterPosition);
    return this.getRoster(teamId);
  }

  static removePlayer(teamId, playerId) {
    const stmt = db.prepare('DELETE FROM rosters WHERE team_id = ? AND player_id = ?');
    const result = stmt.run(teamId, playerId);

    if (result.changes === 0) {
      throw new Error('Player not found on team roster');
    }

    return this.getRoster(teamId);
  }

  static updateRosterPosition(teamId, playerId, newPosition) {
    const stmt = db.prepare(`
      UPDATE rosters SET roster_position = ? WHERE team_id = ? AND player_id = ?
    `);

    const result = stmt.run(newPosition, teamId, playerId);

    if (result.changes === 0) {
      throw new Error('Player not found on team roster');
    }

    return this.getRoster(teamId);
  }

  static getWeeklyScore(teamId, week, season) {
    const stmt = db.prepare(`
      SELECT * FROM weekly_scores
      WHERE team_id = ? AND week = ? AND season = ?
    `);
    return stmt.get(teamId, week, season);
  }

  static recordWeeklyScore(teamId, week, season, points, opponentId = null, result = null) {
    const id = uuidv4();

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO weekly_scores (id, team_id, week, season, points, opponent_id, result)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, teamId, week, season, points, opponentId, result);
    return this.getWeeklyScore(teamId, week, season);
  }
}

module.exports = Team;
