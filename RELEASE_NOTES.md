# Fantasy Ops v1.0.0 Release

## Download

- **Windows**: Download `fantasy-ops.exe` from the releases page
- **Source**: Clone the repository and run `npm install && npm start`

## Features

### Complete Fantasy Sports Management
- User registration and authentication with JWT
- Create and manage fantasy leagues
- Team roster management
- Player database with 30+ NFL players
- League standings and scoring

### Technical Stack
- **Backend**: Node.js + Express.js
- **Database**: SQLite (sql.js - pure JavaScript)
- **Frontend**: Single-page application (vanilla JavaScript)
- **Authentication**: JWT with bcrypt password hashing

## Installation

### Option 1: Windows Executable
1. Download `fantasy-ops.exe`
2. Create a folder for the application
3. Place the executable in the folder
4. Run the executable
5. Open browser to `http://localhost:3000`

### Option 2: From Source
```bash
git clone <repository-url>
cd Fantasy_Ops
npm install
cp .env.example .env
npm start
```

## Configuration

Create a `.env` file (optional):
```
PORT=3000
JWT_SECRET=your-secret-key
DB_PATH=./data/fantasy_ops.db
```

## System Requirements

- **Windows**: Windows 10 or later (64-bit)
- **Node.js**: v16+ (if running from source)
- **RAM**: 512MB minimum
- **Disk**: 100MB for executable + database

## Known Limitations

1. Single server instance (no clustering)
2. Local database (no cloud sync)
3. No real-time player statistics updates
4. Basic UI without mobile optimization

## What's Included

- Full REST API with validation
- Secure authentication system
- Pre-seeded NFL player database
- Responsive web interface
- SQLite database with automatic persistence

## API Endpoints

- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/leagues` - List leagues
- `POST /api/leagues` - Create league
- `POST /api/leagues/:id/join` - Join league
- `GET /api/teams` - List user's teams
- `GET /api/teams/:id/roster` - Get team roster
- `GET /api/players` - List players
- `GET /api/health` - Health check

## Building from Source

To build your own executable:
```bash
npm install -g pkg
npm run package:win      # Windows
npm run package:linux    # Linux
npm run package:mac      # macOS
npm run package:all      # All platforms
```

## License

MIT License
