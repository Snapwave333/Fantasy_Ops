const { query, queryOne, run } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class User {
  static async create({ username, email, password }) {
    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 12);

    try {
      run(
        'INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)',
        [id, username.toLowerCase(), email.toLowerCase(), hashedPassword]
      );
      return this.findById(id);
    } catch (error) {
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        if (error.message.includes('username')) {
          throw new Error('Username already exists');
        }
        if (error.message.includes('email')) {
          throw new Error('Email already exists');
        }
      }
      throw error;
    }
  }

  static findById(id) {
    return queryOne(
      'SELECT id, username, email, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
  }

  static findByEmail(email) {
    return queryOne('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  }

  static findByUsername(username) {
    return queryOne('SELECT * FROM users WHERE username = ?', [username.toLowerCase()]);
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static update(id, data) {
    const allowedFields = ['username', 'email'];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(field === 'email' ? data[field].toLowerCase() : data[field]);
      }
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  static delete(id) {
    return run('DELETE FROM users WHERE id = ?', [id]);
  }

  static getStats(userId) {
    const teamsResult = queryOne('SELECT COUNT(*) as count FROM teams WHERE owner_id = ?', [userId]);
    const leaguesResult = queryOne('SELECT COUNT(DISTINCT league_id) as count FROM teams WHERE owner_id = ?', [userId]);

    return {
      totalTeams: teamsResult ? teamsResult.count : 0,
      totalLeagues: leaguesResult ? leaguesResult.count : 0
    };
  }
}

module.exports = User;
