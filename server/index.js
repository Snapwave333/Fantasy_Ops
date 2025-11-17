require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const leagueRoutes = require('./routes/leagues');
const teamRoutes = require('./routes/teams');
const playerRoutes = require('./routes/players');
const newsRoutes = require('./routes/news');
const mediaRoutes = require('./routes/media');

const app = express();
const PORT = process.env.PORT || 3000;

// Will be initialized async
let dbInitialized = false;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/media', mediaRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: require('../package.json').version
  });
});

// Serve frontend for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Initialize database (async for sql.js)
    await initDatabase();
    dbInitialized = true;
    console.log('Database initialized successfully');

    const server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════╗
║         Fantasy Ops Server Started         ║
╠════════════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(36)}║
║  Mode: ${(process.env.NODE_ENV || 'development').padEnd(36)}║
║  Time: ${new Date().toISOString().padEnd(36)}║
╚════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
