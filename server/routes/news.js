const express = require('express');
const { query, queryOne, run } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all news articles
router.get('/', (req, res, next) => {
  try {
    const { category, featured, limit = 20, offset = 0 } = req.query;

    let sql = 'SELECT * FROM news WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (featured !== undefined) {
      sql += ' AND featured = ?';
      params.push(featured === 'true' ? 1 : 0);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const articles = query(sql, params);

    res.json({
      success: true,
      data: { articles, count: articles.length }
    });
  } catch (error) {
    next(error);
  }
});

// Get featured news
router.get('/featured', (req, res, next) => {
  try {
    const articles = query(
      'SELECT * FROM news WHERE featured = 1 ORDER BY created_at DESC LIMIT 5'
    );

    res.json({
      success: true,
      data: { articles }
    });
  } catch (error) {
    next(error);
  }
});

// Get news categories
router.get('/categories', (req, res, next) => {
  try {
    const results = query('SELECT DISTINCT category FROM news ORDER BY category');
    const categories = results.map(row => row.category);

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    next(error);
  }
});

// Get single news article
router.get('/:id', (req, res, next) => {
  try {
    const article = queryOne('SELECT * FROM news WHERE id = ?', [req.params.id]);

    if (!article) {
      return res.status(404).json({
        success: false,
        error: { message: 'Article not found' }
      });
    }

    // Increment view count
    run('UPDATE news SET views = views + 1 WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      data: { article }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
