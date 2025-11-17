# Fantasy Ops

A comprehensive Fantasy Sports Operations Management System.

## Features

- **User Management**: Registration, authentication, and profile management
- **League Management**: Create and manage fantasy leagues
- **Team Management**: Build and manage fantasy teams
- **Player Database**: Comprehensive player statistics and information
- **Draft System**: Conduct player drafts for your leagues
- **Scoring System**: Automated scoring based on real-world performance
- **Trade System**: Propose and accept trades between teams
- **Waiver Wire**: Claim available players

## Quick Start

### Prerequisites

- Node.js >= 16.0.0
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Fantasy_Ops

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the server
npm start

# Or for development with auto-reload
npm run dev
```

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

#### Leagues
- `GET /api/leagues` - List all leagues
- `POST /api/leagues` - Create new league
- `GET /api/leagues/:id` - Get league details
- `PUT /api/leagues/:id` - Update league
- `DELETE /api/leagues/:id` - Delete league
- `POST /api/leagues/:id/join` - Join a league

#### Teams
- `GET /api/teams` - List user's teams
- `POST /api/teams` - Create new team
- `GET /api/teams/:id` - Get team details
- `PUT /api/teams/:id` - Update team
- `GET /api/teams/:id/roster` - Get team roster

#### Players
- `GET /api/players` - List all players (with filters)
- `GET /api/players/:id` - Get player details
- `GET /api/players/stats/:id` - Get player statistics

#### Scoring
- `GET /api/scoring/league/:leagueId` - Get league standings
- `GET /api/scoring/team/:teamId/week/:week` - Get team score for week

## Project Structure

```
Fantasy_Ops/
├── server/
│   ├── index.js              # Application entry point
│   ├── config/
│   │   └── database.js       # Database configuration
│   ├── middleware/
│   │   ├── auth.js           # Authentication middleware
│   │   ├── errorHandler.js   # Error handling
│   │   └── validation.js     # Request validation
│   ├── models/
│   │   ├── User.js           # User model
│   │   ├── League.js         # League model
│   │   ├── Team.js           # Team model
│   │   └── Player.js         # Player model
│   ├── routes/
│   │   ├── auth.js           # Auth routes
│   │   ├── leagues.js        # League routes
│   │   ├── teams.js          # Team routes
│   │   └── players.js        # Player routes
│   └── services/
│       └── scoring.js        # Scoring calculations
├── public/
│   ├── index.html            # Frontend entry
│   ├── css/
│   │   └── styles.css        # Styles
│   └── js/
│       └── app.js            # Frontend logic
├── tests/
│   ├── auth.test.js          # Auth tests
│   ├── leagues.test.js       # League tests
│   └── teams.test.js         # Team tests
├── data/                     # Database files
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage
```

## Development

```bash
# Run linting
npm run lint

# Run full build (lint + tests)
npm run build
```

## Configuration

Edit `.env` file to customize:
- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - Token expiration time
- `DB_PATH` - SQLite database location

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
