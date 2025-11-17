const request = require('supertest');
const app = require('../server/index');

describe('Players API', () => {
  describe('GET /api/players', () => {
    it('should return list of players', async () => {
      const res = await request(app)
        .get('/api/players');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.players).toBeDefined();
      expect(Array.isArray(res.body.data.players)).toBe(true);
      expect(res.body.data.count).toBeDefined();
    });

    it('should filter players by position', async () => {
      const res = await request(app)
        .get('/api/players?position=QB');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      if (res.body.data.players.length > 0) {
        res.body.data.players.forEach(player => {
          expect(player.position).toBe('QB');
        });
      }
    });

    it('should search players by name', async () => {
      const res = await request(app)
        .get('/api/players?search=Patrick');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const res = await request(app)
        .get('/api/players?limit=5');

      expect(res.status).toBe(200);
      expect(res.body.data.players.length).toBeLessThanOrEqual(5);
    });

    it('should support pagination with offset', async () => {
      const res = await request(app)
        .get('/api/players?limit=10&offset=5');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/players/top', () => {
    it('should return top players', async () => {
      const res = await request(app)
        .get('/api/players/top');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.players).toBeDefined();
      expect(res.body.data.players.length).toBeLessThanOrEqual(10);
    });

    it('should filter top players by position', async () => {
      const res = await request(app)
        .get('/api/players/top?position=RB');

      expect(res.status).toBe(200);

      if (res.body.data.players.length > 0) {
        res.body.data.players.forEach(player => {
          expect(player.position).toBe('RB');
        });
      }
    });

    it('should respect custom limit', async () => {
      const res = await request(app)
        .get('/api/players/top?limit=5');

      expect(res.status).toBe(200);
      expect(res.body.data.players.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/players/positions', () => {
    it('should return list of positions', async () => {
      const res = await request(app)
        .get('/api/players/positions');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.positions).toBeDefined();
      expect(Array.isArray(res.body.data.positions)).toBe(true);
    });
  });

  describe('GET /api/players/nfl-teams', () => {
    it('should return list of NFL teams', async () => {
      const res = await request(app)
        .get('/api/players/nfl-teams');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.teams).toBeDefined();
      expect(Array.isArray(res.body.data.teams)).toBe(true);
    });
  });

  describe('GET /api/players/:id', () => {
    let playerId;

    beforeAll(async () => {
      // Get a player ID from the list
      const res = await request(app).get('/api/players?limit=1');
      if (res.body.data.players.length > 0) {
        playerId = res.body.data.players[0].id;
      }
    });

    it('should get player details', async () => {
      if (!playerId) {
        return;
      }

      const res = await request(app)
        .get(`/api/players/${playerId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.player).toBeDefined();
      expect(res.body.data.player.id).toBe(playerId);
    });

    it('should return 404 for non-existent player', async () => {
      const res = await request(app)
        .get('/api/players/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(404);
    });

    it('should validate UUID format', async () => {
      const res = await request(app)
        .get('/api/players/invalid-id');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/players/:id/stats', () => {
    let playerId;

    beforeAll(async () => {
      const res = await request(app).get('/api/players?limit=1');
      if (res.body.data.players.length > 0) {
        playerId = res.body.data.players[0].id;
      }
    });

    it('should get player statistics', async () => {
      if (!playerId) {
        return;
      }

      const res = await request(app)
        .get(`/api/players/${playerId}/stats`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.player).toBeDefined();
      expect(res.body.data.stats).toBeDefined();
      expect(Array.isArray(res.body.data.stats)).toBe(true);
    });
  });
});
