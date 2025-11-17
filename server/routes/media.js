const express = require('express');
const { query, queryOne, run } = require('../config/database');

const router = express.Router();

// Get all media
router.get('/', (req, res, next) => {
  try {
    const { type, team_code, search, limit = 20, offset = 0 } = req.query;

    let sql = 'SELECT * FROM media WHERE 1=1';
    const params = [];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (team_code) {
      sql += ' AND team_code = ?';
      params.push(team_code);
    }

    if (search) {
      sql += ' AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const items = query(sql, params);

    res.json({
      success: true,
      data: { media: items, count: items.length }
    });
  } catch (error) {
    next(error);
  }
});

// Get images only
router.get('/images', (req, res, next) => {
  try {
    const { limit = 12, offset = 0 } = req.query;

    const images = query(
      'SELECT * FROM media WHERE type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      ['image', parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: { images }
    });
  } catch (error) {
    next(error);
  }
});

// Get videos only
router.get('/videos', (req, res, next) => {
  try {
    const { limit = 12, offset = 0 } = req.query;

    const videos = query(
      'SELECT * FROM media WHERE type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      ['video', parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: { videos }
    });
  } catch (error) {
    next(error);
  }
});

// Get single media item
router.get('/:id', (req, res, next) => {
  try {
    const item = queryOne('SELECT * FROM media WHERE id = ?', [req.params.id]);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: { message: 'Media not found' }
      });
    }

    // Increment view count
    run('UPDATE media SET views = views + 1 WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      data: { media: item }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
