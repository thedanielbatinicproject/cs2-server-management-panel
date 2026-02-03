# CS2 RCON Manager

A web application to control multiple Counter-Strike 2 servers via RCON.

## Features

- Multi-server management
- Map changer with Workshop support
- Reusable command prompts
- User management with permissions
- Docker deployment

## Quick Start

### Requirements
- Docker Desktop installed and running

### Steps

1. **Clone/download** this repository

2. **Edit `.env`** (optional) - set your superuser credentials:
   ```
   SUPERUSER_USERNAME=superadmin
   SUPERUSER_PASSWORD=superadmin123
   ```

3. **Run the app:**
   - Windows: double-click `start.bat`
   - Linux/Mac: `./start.sh`

4. **Open** http://localhost:8080

5. **Login** with superuser credentials (default: `superadmin` / `superadmin123`)

6. **Add your CS2 server:**
   - Host: your server IP (e.g., `123.45.67.89`)
   - Port: RCON port (usually `27015`)
   - Password: your RCON password

## CS2 Server Requirements

Your CS2 server must have RCON enabled:
```
rcon_password "your_password"
```

## Project Structure

```
├── backend/      # Node.js + Express + TypeScript API
├── frontend/     # React + TypeScript + Bootstrap UI
├── docker-compose.yml
├── start.bat     # Windows startup script
└── start.sh      # Linux/Mac startup script
```

**Frontend:**

```bash
cd frontend
npm install
npm start
```

## Environment Variables

### Backend (`.env`)

```env
PORT=3001
JWT_SECRET=change-me-to-a-secure-random-string
```

### Frontend (`.env`)

```env
REACT_APP_API_URL=http://localhost:3001/api
```

## Default Login

- **Username:** `admin`
- **Password:** `admin`

Change this immediately via the users API or by editing `backend/data/users.json`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Get JWT token |
| GET/POST | `/api/servers` | List / create servers |
| PUT/DELETE | `/api/servers/:id` | Update / delete server |
| POST | `/api/servers/:id/execute` | Execute commands on one server |
| POST | `/api/servers/:id/change-map` | Change map on one server |
| POST | `/api/servers/bulk/execute` | Execute commands on multiple servers |
| POST | `/api/servers/bulk/change-map` | Change map on multiple servers |
| GET/POST | `/api/maps` | List / create maps |
| GET | `/api/maps/gamemodes` | List available gamemodes |
| PUT/DELETE | `/api/maps/:id` | Update / delete map |
| GET/POST | `/api/prompts` | List / create prompts |
| PUT/DELETE | `/api/prompts/:id` | Update / delete prompt |
| GET/POST | `/api/users` | List / create users (admin only) |
| PUT/DELETE | `/api/users/:id` | Update / delete user (admin only) |

## Data Model

### Server
```json
{ "id": "...", "name": "My Server", "host": "192.168.1.10", "port": 27015, "password": "rcon_pass" }
```

### Map
```json
{
  "id": "...",
  "name": "de_dust2",
  "gamemode": "de",
  "workshopId": "123456789",
  "serverCommands": ["mp_warmup_end", "mp_restartgame 1"]
}
```

### Prompt
```json
{ "id": "...", "name": "Warmup End", "lines": ["mp_warmup_end", "mp_restartgame 1"] }
```

## Architecture

```
┌──────────────┐       ┌──────────────┐
│   Frontend   │──────▶│   Backend    │
│  (React/BS)  │ REST  │  (Express)   │
└──────────────┘       └──────┬───────┘
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
         ┌─────────┐    ┌─────────┐    ┌─────────┐
         │ CS2 #1  │    │ CS2 #2  │    │ CS2 #N  │
         │  RCON   │    │  RCON   │    │  RCON   │
         └─────────┘    └─────────┘    └─────────┘
```

- **Per-server command queues** ensure commands are sent sequentially
- Commands sent line-by-line with configurable delay
- Responses collected per command; failures flagged

## Scaling Notes

- Replace JSON files with PostgreSQL/MongoDB for production
- Add Redis for session store and pub/sub for real-time updates
- Use WebSockets for live command output streaming
- Deploy behind reverse proxy (nginx/traefik) with HTTPS

## License

MIT
