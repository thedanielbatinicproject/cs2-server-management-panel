# CS2 RCON Frontend

React + TypeScript + Bootstrap UI for CS2 server management.

## Setup (without Docker)

1. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

2. Start dev server:
   ```bash
   npm start
   ```

Opens http://localhost:3000

## Build for Production

```bash
npm run build
```

Output goes to `build/` folder.

## Configuration

Create `.env` file to set API URL:
```
REACT_APP_API_URL=http://localhost:3001/api
```

In Docker, nginx proxies `/api` to the backend automatically.
