# CS2 RCON Manager

Web app to manage multiple CS2 servers via RCON. Supports map changing, custom commands, user permissions, and live server stats.

## Quick Start (Docker)

Requires Docker Desktop.

1. Clone this repo
2. Run `start.bat` (Windows) or `./start.sh` (Linux/Mac)
3. Open http://localhost:8080
4. Login with `superadmin` / `superadmin123`
5. Add your CS2 server (IP, RCON port, password)

Your CS2 server needs RCON enabled: `rcon_password "your_password"`

## Manual Setup (No Docker)

Need Node.js 18+.

Backend:
```
cd backend
npm install && npm run build
```

Create `backend/.env`:
```
PORT=3015
JWT_SECRET=change-this
SUPERUSER_USERNAME=superadmin
SUPERUSER_PASSWORD=superadmin123
```

Run with `npm start`.

Frontend:
```
cd frontend
npm install && npm run build
```

Create `frontend/.env` with your API URL:
```
REACT_APP_API_URL=http://your-domain.com:3015
```

Serve the `build` folder with nginx or similar. Recommended to proxy `/api` to the backend port.

## K/D/A Stats (Optional)

Player stats require the RconStats plugin for CounterStrikeSharp.

1. Install CounterStrikeSharp on your CS2 server
2. Build the plugin: `cd cs2-plugin/RconStats && dotnet build -c Release`
3. Copy `bin/Release/net8.0/RconStats.dll` to `game/csgo/addons/counterstrikesharp/plugins/RconStats/`
4. Restart server or run `css_plugins reload`

The plugin adds a `css_playerstats` command that the web panel uses to fetch K/D/A data.
