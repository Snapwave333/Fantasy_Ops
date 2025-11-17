const express = require('express');
const { param, query } = require('express-validator');
const Player = require('../models/Player');
const { validate } = require('../middleware/validation');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all players
router.get('/', optionalAuth, [
  query('position').optional().isString(),
  query('team').optional().isString(),
  query('sport').optional().isString(),
  query('status').optional().isString(),
  query('search').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 500 }),
  query('offset').optional().isInt({ min: 0 }),
  validate
], (req, res, next) => {
  try {
    const { position, team, sport, status, search, limit, offset } = req.query;

    const players = Player.findAll({
      position,
      team,
      sport,
      status,
      search,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0
    });

    res.json({
      success: true,
      data: { players, count: players.length }
    });
  } catch (error) {
    next(error);
  }
});

// Get top players
router.get('/top', optionalAuth, [
  query('position').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate
], (req, res, next) => {
  try {
    const { position, limit } = req.query;

    const players = Player.getTopPlayers(
      position || null,
      limit ? parseInt(limit) : 10
    );

    res.json({
      success: true,
      data: { players }
    });
  } catch (error) {
    next(error);
  }
});

// Get available positions
router.get('/positions', (req, res, next) => {
  try {
    const positions = Player.getPositions();

    res.json({
      success: true,
      data: { positions }
    });
  } catch (error) {
    next(error);
  }
});

// Get NFL teams
router.get('/nfl-teams', (req, res, next) => {
  try {
    const teams = Player.getTeams();

    res.json({
      success: true,
      data: { teams }
    });
  } catch (error) {
    next(error);
  }
});

// Get player by ID
router.get('/:id', optionalAuth, [
  param('id').isUUID().withMessage('Invalid player ID'),
  validate
], (req, res, next) => {
  try {
    const player = Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        error: { message: 'Player not found' }
      });
    }

    res.json({
      success: true,
      data: { player }
    });
  } catch (error) {
    next(error);
  }
});

// Get player statistics
router.get('/:id/stats', optionalAuth, [
  param('id').isUUID().withMessage('Invalid player ID'),
  validate
], (req, res, next) => {
  try {
    const player = Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        error: { message: 'Player not found' }
      });
    }

    const stats = Player.getStats(req.params.id);

    res.json({
      success: true,
      data: { player, stats }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
