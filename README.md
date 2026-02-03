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
