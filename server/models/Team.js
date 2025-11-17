const { query, queryOne, run } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Team {
  static create({ name, league_id, owner_id }) {
    const id = uuidv4();

    try {
      run(
        'INSERT INTO teams (id, name, league_id, owner_id) VALUES (?, ?, ?, ?)',
        [id, name, league_id, owner_id]
      );
      return this.findById(id);
    } catch (error) {
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        throw new Error('User already has a team in this league');
      }
      throw error;
    }
  }

  static findById(id) {
    return queryOne(`
      SELECT t.*, u.username as owner_name, l.name as league_name
      FROM teams t
      JOIN users u ON t.owner_id = u.id
      JOIN leagues l ON t.league_id = l.id
      WHERE t.id = ?
    `, [id]);
  }

  static findByUser(userId) {
    return query(`
      SELECT t.*, u.username as owner_name, l.name as league_name, l.sport
      FROM teams t
      JOIN users u ON t.owner_id = u.id
      JOIN leagues l ON t.league_id = l.id
      WHERE t.owner_id = ?
      ORDER BY t.created_at DESC
    `, [userId]);
  }

  static findByLeague(leagueId) {
    return query(`
      SELECT t.*, u.username as owner_name
      FROM teams t
      JOIN users u ON t.owner_id = u.id
      WHERE t.league_id = ?
      ORDER BY t.wins DESC, t.points_for DESC
    `, [leagueId]);
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

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    run(`UPDATE teams SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  static delete(id) {
    return run('DELETE FROM teams WHERE id = ?', [id]);
  }

  static getRoster(teamId) {
    return query(`
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
    `, [teamId]);
  }

  static addPlayer(teamId, playerId, rosterPosition) {
    const id = uuidv4();

    const team = this.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const existingRoster = queryOne(`
      SELECT r.id FROM rosters r
      JOIN teams t ON r.team_id = t.id
      WHERE r.player_id = ? AND t.league_id = ?
    `, [playerId, team.league_id]);

    if (existingRoster) {
      throw new Error('Player is already on a team in this league');
    }

    run(
      'INSERT INTO rosters (id, team_id, player_id, roster_position) VALUES (?, ?, ?, ?)',
      [id, teamId, playerId, rosterPosition]
    );

    return this.getRoster(teamId);
  }

  static removePlayer(teamId, playerId) {
    const result = run('DELETE FROM rosters WHERE team_id = ? AND player_id = ?', [teamId, playerId]);

    if (result.changes === 0) {
      throw new Error('Player not found on team roster');
    }

    return this.getRoster(teamId);
  }

  static updateRosterPosition(teamId, playerId, newPosition) {
    const result = run(
      'UPDATE rosters SET roster_position = ? WHERE team_id = ? AND player_id = ?',
      [newPosition, teamId, playerId]
    );

    if (result.changes === 0) {
      throw new Error('Player not found on team roster');
    }

    return this.getRoster(teamId);
  }

  static getWeeklyScore(teamId, week, season) {
    return queryOne(
      'SELECT * FROM weekly_scores WHERE team_id = ? AND week = ? AND season = ?',
      [teamId, week, season]
    );
  }

  static recordWeeklyScore(teamId, week, season, points, opponentId = null, result = null) {
    const id = uuidv4();

    run(
      'INSERT OR REPLACE INTO weekly_scores (id, team_id, week, season, points, opponent_id, result) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, teamId, week, season, points, opponentId, result]
    );

    return this.getWeeklyScore(teamId, week, season);
  }
}

module.exports = Team;
