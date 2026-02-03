# CS2 RCON Backend

Express + TypeScript API for CS2 server management.

## Setup (without Docker)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build TypeScript:
   ```bash
   npm run build
   ```

3. Start server:
   ```bash
   npm start
   ```

Server runs on http://localhost:3001

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | API port |
| JWT_SECRET | (random) | Token signing secret |
| SUPERUSER_USERNAME | superadmin | Superuser login |
| SUPERUSER_PASSWORD | superadmin123 | Superuser password |

## Data Storage

JSON files stored in `data/` folder:
- `users.json`
- `servers.json`
- `maps.json`
- `prompts.json`
