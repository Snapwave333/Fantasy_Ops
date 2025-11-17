const request = require('supertest');
const app = require('../server/index');

describe('Leagues API', () => {
  let authToken;
  let userId;
  let leagueId;

  beforeAll(async () => {
    // Register and login a user
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'leagueuser',
        email: 'league@example.com',
        password: 'password123'
      });

    authToken = res.body.data.token;
    userId = res.body.data.user.id;
  });

  describe('GET /api/leagues', () => {
    it('should return empty list initially', async () => {
      const res = await request(app)
        .get('/api/leagues');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.leagues).toBeDefined();
      expect(Array.isArray(res.body.data.leagues)).toBe(true);
    });

    it('should support filtering by sport', async () => {
      const res = await request(app)
        .get('/api/leagues?sport=football');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/leagues?limit=10&offset=0');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/leagues', () => {
    it('should create a new league', async () => {
      const res = await request(app)
        .post('/api/leagues')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test League',
          description: 'A test league',
          sport: 'football',
          max_teams: 10,
          scoring_type: 'ppr',
          draft_type: 'snake'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.league).toBeDefined();
      expect(res.body.data.league.name).toBe('Test League');
      expect(res.body.data.league.commissioner_id).toBe(userId);

      leagueId = res.body.data.league.id;
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/leagues')
        .send({
          name: 'Unauthorized League'
        });

      expect(res.status).toBe(401);
    });

    it('should validate league name length', async () => {
      const res = await request(app)
        .post('/api/leagues')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'AB'
        });

      expect(res.status).toBe(400);
    });

    it('should validate max_teams range', async () => {
      const res = await request(app)
        .post('/api/leagues')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Teams League',
          max_teams: 100
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/leagues/:id', () => {
    it('should get league details', async () => {
      const res = await request(app)
        .get(`/api/leagues/${leagueId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.league).toBeDefined();
      expect(res.body.data.teams).toBeDefined();
      expect(res.body.data.league.id).toBe(leagueId);
    });

    it('should return 404 for non-existent league', async () => {
      const res = await request(app)
        .get('/api/leagues/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(404);
    });

    it('should validate UUID format', async () => {
      const res = await request(app)
        .get('/api/leagues/invalid-id');

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/leagues/:id', () => {
    it('should update league as commissioner', async () => {
      const res = await request(app)
        .put(`/api/leagues/${leagueId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated League Name',
          status: 'in_season'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.league.name).toBe('Updated League Name');
      expect(res.body.data.league.status).toBe('in_season');
    });

    it('should reject update from non-commissioner', async () => {
      // Register another user
      const newUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'otheruser',
          email: 'other@example.com',
          password: 'password123'
        });

      const otherToken = newUserRes.body.data.token;

      const res = await request(app)
        .put(`/api/leagues/${leagueId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          name: 'Unauthorized Update'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/leagues/:id/join', () => {
    it('should allow user to join league', async () => {
      // Register a new user to join
      const newUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'joiner',
          email: 'joiner@example.com',
          password: 'password123'
        });

      const joinerToken = newUserRes.body.data.token;

      const res = await request(app)
        .post(`/api/leagues/${leagueId}/join`)
        .set('Authorization', `Bearer ${joinerToken}`)
        .send({
          team_name: 'Joining Team'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.team).toBeDefined();
      expect(res.body.data.team.name).toBe('Joining Team');
    });

    it('should prevent duplicate joins', async () => {
      const res = await request(app)
        .post(`/api/leagues/${leagueId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          team_name: 'Duplicate Team'
        });

      // Should fail because user is already commissioner (implicit team owner)
      // or the league validation should catch duplicate user
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/leagues/:id/standings', () => {
    it('should get league standings', async () => {
      const res = await request(app)
        .get(`/api/leagues/${leagueId}/standings`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.standings).toBeDefined();
      expect(Array.isArray(res.body.data.standings)).toBe(true);
    });
  });
});
