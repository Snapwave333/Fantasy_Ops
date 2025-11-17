const express = require('express');
const { body, param, query } = require('express-validator');
const League = require('../models/League');
const Team = require('../models/Team');
const { validate } = require('../middleware/validation');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all leagues (public)
router.get('/', optionalAuth, [
  query('sport').optional().isString(),
  query('status').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  validate
], (req, res, next) => {
  try {
    const { sport, status, limit, offset } = req.query;

    const leagues = League.findAll({
      sport,
      status,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });

    res.json({
      success: true,
      data: { leagues }
    });
  } catch (error) {
    next(error);
  }
});

// Get user's leagues
router.get('/my', authMiddleware, (req, res, next) => {
  try {
    const leagues = League.findByUser(req.user.id);

    res.json({
      success: true,
      data: { leagues }
    });
  } catch (error) {
    next(error);
  }
});

// Create new league
router.post('/', authMiddleware, [
  body('name')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('League name must be between 3 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('sport')
    .optional()
    .isIn(['football', 'basketball', 'baseball', 'hockey'])
    .withMessage('Invalid sport type'),
  body('max_teams')
    .optional()
    .isInt({ min: 4, max: 20 })
    .withMessage('Max teams must be between 4 and 20'),
  body('scoring_type')
    .optional()
    .isIn(['standard', 'ppr', 'half_ppr'])
    .withMessage('Invalid scoring type'),
  body('draft_type')
    .optional()
    .isIn(['snake', 'auction', 'linear'])
    .withMessage('Invalid draft type'),
  body('season')
    .optional()
    .isInt({ min: 2020, max: 2030 })
    .withMessage('Season must be a valid year'),
  validate
], (req, res, next) => {
  try {
    const league = League.create({
      ...req.body,
      commissioner_id: req.user.id
    });

    res.status(201).json({
      success: true,
      data: { league }
    });
  } catch (error) {
    next(error);
  }
});

// Get league by ID
router.get('/:id', optionalAuth, [
  param('id').isUUID().withMessage('Invalid league ID'),
  validate
], (req, res, next) => {
  try {
    const league = League.findById(req.params.id);

    if (!league) {
      return res.status(404).json({
        success: false,
        error: { message: 'League not found' }
      });
    }

    const teams = League.getTeams(league.id);

    res.json({
      success: true,
      data: { league, teams }
    });
  } catch (error) {
    next(error);
  }
});

// Update league (commissioner only)
router.put('/:id', authMiddleware, [
  param('id').isUUID().withMessage('Invalid league ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('League name must be between 3 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }),
  body('max_teams')
    .optional()
    .isInt({ min: 4, max: 20 }),
  body('scoring_type')
    .optional()
    .isIn(['standard', 'ppr', 'half_ppr']),
  body('draft_type')
    .optional()
    .isIn(['snake', 'auction', 'linear']),
  body('status')
    .optional()
    .isIn(['draft', 'in_season', 'playoffs', 'offseason']),
  validate
], (req, res, next) => {
  try {
    const league = League.findById(req.params.id);

    if (!league) {
      return res.status(404).json({
        success: false,
        error: { message: 'League not found' }
      });
    }

    if (league.commissioner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only the commissioner can update the league' }
      });
    }

    const updatedLeague = League.update(req.params.id, req.body);

    res.json({
      success: true,
      data: { league: updatedLeague }
    });
  } catch (error) {
    next(error);
  }
});

// Delete league (commissioner only)
router.delete('/:id', authMiddleware, [
  param('id').isUUID().withMessage('Invalid league ID'),
  validate
], (req, res, next) => {
  try {
    const league = League.findById(req.params.id);

    if (!league) {
      return res.status(404).json({
        success: false,
        error: { message: 'League not found' }
      });
    }

    if (league.commissioner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only the commissioner can delete the league' }
      });
    }

    League.delete(req.params.id);

    res.json({
      success: true,
      data: { message: 'League deleted successfully' }
    });
  } catch (error) {
    next(error);
  }
});

// Join a league
router.post('/:id/join', authMiddleware, [
  param('id').isUUID().withMessage('Invalid league ID'),
  body('team_name')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Team name must be between 3 and 50 characters'),
  validate
], (req, res, next) => {
  try {
    const { canJoin, reason } = League.canJoin(req.params.id, req.user.id);

    if (!canJoin) {
      return res.status(400).json({
        success: false,
        error: { message: reason }
      });
    }

    const team = Team.create({
      name: req.body.team_name,
      league_id: req.params.id,
      owner_id: req.user.id
    });

    res.status(201).json({
      success: true,
      data: { team }
    });
  } catch (error) {
    next(error);
  }
});

// Get league standings
router.get('/:id/standings', [
  param('id').isUUID().withMessage('Invalid league ID'),
  validate
], (req, res, next) => {
  try {
    const league = League.findById(req.params.id);

    if (!league) {
      return res.status(404).json({
        success: false,
        error: { message: 'League not found' }
      });
    }

    const standings = League.getStandings(req.params.id);

    res.json({
      success: true,
      data: { standings }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
