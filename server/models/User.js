const { db } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class User {
  static async create({ username, email, password }) {
    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 12);

    try {
      const stmt = db.prepare(`
        INSERT INTO users (id, username, email, password)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(id, username.toLowerCase(), email.toLowerCase(), hashedPassword);

      return this.findById(id);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
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
    const stmt = db.prepare(`
      SELECT id, username, email, created_at, updated_at
      FROM users WHERE id = ?
    `);
    return stmt.get(id);
  }

  static findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email.toLowerCase());
  }

  static findByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username.toLowerCase());
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

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return this.findById(id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    return stmt.run(id);
  }

  static getStats(userId) {
    const teamsStmt = db.prepare('SELECT COUNT(*) as count FROM teams WHERE owner_id = ?');
    const leaguesStmt = db.prepare(`
      SELECT COUNT(DISTINCT league_id) as count
      FROM teams WHERE owner_id = ?
    `);

    return {
      totalTeams: teamsStmt.get(userId).count,
      totalLeagues: leaguesStmt.get(userId).count
    };
  }
}

module.exports = User;
