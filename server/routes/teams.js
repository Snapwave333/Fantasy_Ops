const express = require('express');
const { body, param } = require('express-validator');
const Team = require('../models/Team');
const Player = require('../models/Player');
const { validate } = require('../middleware/validation');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get user's teams
router.get('/', authMiddleware, (req, res, next) => {
  try {
    const teams = Team.findByUser(req.user.id);

    res.json({
      success: true,
      data: { teams }
    });
  } catch (error) {
    next(error);
  }
});

// Get team by ID
router.get('/:id', authMiddleware, [
  param('id').isUUID().withMessage('Invalid team ID'),
  validate
], (req, res, next) => {
  try {
    const team = Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Team not found' }
      });
    }

    res.json({
      success: true,
      data: { team }
    });
  } catch (error) {
    next(error);
  }
});

// Update team
router.put('/:id', authMiddleware, [
  param('id').isUUID().withMessage('Invalid team ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Team name must be between 3 and 50 characters'),
  validate
], (req, res, next) => {
  try {
    const team = Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Team not found' }
      });
    }

    if (team.owner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'You can only update your own team' }
      });
    }

    const updatedTeam = Team.update(req.params.id, req.body);

    res.json({
      success: true,
      data: { team: updatedTeam }
    });
  } catch (error) {
    next(error);
  }
});

// Get team roster
router.get('/:id/roster', authMiddleware, [
  param('id').isUUID().withMessage('Invalid team ID'),
  validate
], (req, res, next) => {
  try {
    const team = Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Team not found' }
      });
    }

    const roster = Team.getRoster(req.params.id);

    res.json({
      success: true,
      data: { team, roster }
    });
  } catch (error) {
    next(error);
  }
});

// Add player to roster
router.post('/:id/roster', authMiddleware, [
  param('id').isUUID().withMessage('Invalid team ID'),
  body('player_id').isUUID().withMessage('Invalid player ID'),
  body('roster_position')
    .isIn(['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'FLEX', 'BENCH'])
    .withMessage('Invalid roster position'),
  validate
], (req, res, next) => {
  try {
    const team = Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Team not found' }
      });
    }

    if (team.owner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'You can only modify your own team roster' }
      });
    }

    const player = Player.findById(req.body.player_id);

    if (!player) {
      return res.status(404).json({
        success: false,
        error: { message: 'Player not found' }
      });
    }

    const roster = Team.addPlayer(req.params.id, req.body.player_id, req.body.roster_position);

    res.status(201).json({
      success: true,
      data: { roster }
    });
  } catch (error) {
    next(error);
  }
});

// Remove player from roster
router.delete('/:id/roster/:playerId', authMiddleware, [
  param('id').isUUID().withMessage('Invalid team ID'),
  param('playerId').isUUID().withMessage('Invalid player ID'),
  validate
], (req, res, next) => {
  try {
    const team = Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Team not found' }
      });
    }

    if (team.owner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'You can only modify your own team roster' }
      });
    }

    const roster = Team.removePlayer(req.params.id, req.params.playerId);

    res.json({
      success: true,
      data: { roster }
    });
  } catch (error) {
    next(error);
  }
});

// Update player roster position
router.patch('/:id/roster/:playerId', authMiddleware, [
  param('id').isUUID().withMessage('Invalid team ID'),
  param('playerId').isUUID().withMessage('Invalid player ID'),
  body('roster_position')
    .isIn(['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'FLEX', 'BENCH'])
    .withMessage('Invalid roster position'),
  validate
], (req, res, next) => {
  try {
    const team = Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Team not found' }
      });
    }

    if (team.owner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'You can only modify your own team roster' }
      });
    }

    const roster = Team.updateRosterPosition(
      req.params.id,
      req.params.playerId,
      req.body.roster_position
    );

    res.json({
      success: true,
      data: { roster }
    });
  } catch (error) {
    next(error);
  }
});

// Get available players for a team's league
router.get('/:id/available-players', authMiddleware, [
  param('id').isUUID().withMessage('Invalid team ID'),
  validate
], (req, res, next) => {
  try {
    const team = Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Team not found' }
      });
    }

    const { position, search, limit, offset } = req.query;

    const players = Player.getAvailablePlayers(team.league_id, {
      position,
      search,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });

    res.json({
      success: true,
      data: { players }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
