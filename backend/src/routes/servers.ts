import express, { Request, Response } from 'express';
import { servers, maps } from '../db';
import { enqueueCommands } from '../serverManager';
import { Server, BulkResult, GameMap } from '../types';
import RconClient from '../rconClient';

const router = express.Router();

// Find map name from database by workshopId or map code
function findMapFromDatabase(rawMap: string, workshopId: string | null): { name: string; workshopId: string | null } | null {
  const mapsList: GameMap[] = maps.get('maps') || [];
  
  // First try to match by workshop ID
  if (workshopId) {
    const byWorkshop = mapsList.find(m => m.workshopId === workshopId);
    if (byWorkshop) return { name: byWorkshop.name, workshopId: byWorkshop.workshopId };
  }
  
  // Try to match by map code name (e.g., de_mirage, aim_ancient)
  const mapCode = rawMap.split('/').pop() || rawMap;
  const byName = mapsList.find(m => 
    m.name.toLowerCase() === mapCode.toLowerCase() ||
    m.name.toLowerCase().replace(/\s+/g, '_') === mapCode.toLowerCase() ||
    mapCode.toLowerCase().includes(m.name.toLowerCase().replace(/\s+/g, '_'))
  );
  if (byName) return { name: byName.name, workshopId: byName.workshopId };
  
  return null;
}

// Parse css_playerstats output from RconStats plugin
// Format: "PLAYER|SteamID|Name|Kills|Deaths|Assists|Score"
function parsePlayerStats(output: string): Map<string, { kills: number; deaths: number; assists: number; score: number }> {
  const stats = new Map<string, { kills: number; deaths: number; assists: number; score: number }>();
  const lines = output.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('PLAYER|')) {
      const parts = line.split('|');
      if (parts.length >= 7) {
        const name = parts[2];
        stats.set(name, {
          kills: parseInt(parts[3], 10) || 0,
          deaths: parseInt(parts[4], 10) || 0,
          assists: parseInt(parts[5], 10) || 0,
          score: parseInt(parts[6], 10) || 0,
        });
      }
    }
  }
  
  return stats;
}

// Parse status command output
function parseStatus(output: string): any {
  const lines = output.split('\n');
  const result: any = {
    hostname: '',
    map: '',
    mapWorkshopId: null,
    mapDisplayName: null,
    players: { current: 0, max: 0, bots: 0 },
    playerList: [],
    version: '',
    steamId: '',
    ip: '',
    hibernating: false,
  };

  for (const line of lines) {
    if (line.includes('hostname')) {
      const match = line.match(/hostname\s*:\s*(.+)/);
      if (match) result.hostname = match[1].trim();
    }
    else if (line.includes('udp/ip')) {
      const match = line.match(/public ([^)]+)/);
      if (match) result.ip = match[1];
    }
    else if (line.includes('version') && line.includes(':')) {
      const match = line.match(/version\s*:\s*([^\s]+)/);
      if (match) result.version = match[1];
    }
    else if (line.includes('steamid')) {
      const match = line.match(/steamid\s*:\s*(.+)/);
      if (match) result.steamId = match[1].trim();
    }
    else if (line.includes('players') && line.includes('humans')) {
      const match = line.match(/(\d+) humans?, (\d+) bots? \((\d+) max\)/);
      if (match) {
        result.players.current = parseInt(match[1], 10);
        result.players.bots = parseInt(match[2], 10);
        result.players.max = parseInt(match[3], 10);
      }
      result.hibernating = line.includes('hibernating') && !line.includes('not hibernating');
    }
    // Parse spawngroup 1 ONLY - this is the actual map
    // Format: "loaded spawngroup(  1)  : SV:  [1: de_nuke | main lump | mapload]"
    else if (line.includes('loaded spawngroup') && line.includes('(  1)')) {
      // Match pattern: [1: mapname | ...]
      const match = line.match(/\[1:\s*([^\s|]+)/);
      if (match) {
        result.map = match[1];
        
        // Check if it's a workshop map
        const wsMatch = match[1].match(/workshop[\/\\](\d+)/i);
        if (wsMatch) {
          result.mapWorkshopId = wsMatch[1];
        }
      }
    }
    // Parse player lines - format: "[Client] 65280    03:21   25    0     active 786432 'RegentLujo'"
    // Only parse HUMAN players (has time like 03:21, not BOT or [NoChan])
    else if (line.includes("'") && !line.includes('BOT') && !line.includes('[NoChan]') && !line.includes('name')) {
      // Look for pattern: time (MM:SS), then eventually 'playername'
      const timeMatch = line.match(/(\d+:\d+)/);
      const nameMatch = line.match(/'([^']+)'/);
      
      if (timeMatch && nameMatch && nameMatch[1].trim() !== '') {
        // Extract all numbers before the name
        const parts = line.split(timeMatch[0]);
        if (parts.length >= 2) {
          const afterTime = parts[1];
          const numbers = afterTime.match(/(\d+)/g);
          
          if (numbers && numbers.length >= 3) {
            result.playerList.push({
              id: '0',
              time: timeMatch[1],
              ping: parseInt(numbers[0], 10),
              loss: parseInt(numbers[1], 10),
              state: 'active',
              name: nameMatch[1],
            });
          }
        }
      }
    }
  }

  // Look up map name from database
  const mapInfo = findMapFromDatabase(result.map, result.mapWorkshopId);
  if (mapInfo) {
    result.mapDisplayName = mapInfo.name;
    if (!result.mapWorkshopId && mapInfo.workshopId) {
      result.mapWorkshopId = mapInfo.workshopId;
    }
  } else {
    // Fallback: clean up the raw map name (remove paths like workshop/123/)
    let cleanName = result.map;
    if (cleanName.includes('/')) {
      cleanName = cleanName.split('/').pop() || cleanName;
    }
    result.mapDisplayName = cleanName;
  }

  return result;
}

// ========================================
// STATIC ROUTES (no :id parameter)
// ========================================

router.get('/', (req: Request, res: Response) => {
  res.json(servers.get('servers') || []);
});

router.post('/', (req: Request, res: Response) => {
  const list = servers.get('servers') || [];
  const id = String(Date.now());
  const { name, host, port, password } = req.body;
  const item: Server = {
    id,
    name: name || 'Unnamed Server',
    host: host || '',
    port: port || 27015,
    password: password || '',
  };
  list.push(item);
  servers.set('servers', list);
  res.json(item);
});

// PING ALL SERVERS
router.post('/ping-all', async (req: Request, res: Response) => {
  const list = servers.get('servers') || [];
  
  const results = await Promise.all(
    list.map(async (server: Server) => {
      const client = new RconClient(server.host, server.port, server.password);
      const startTime = Date.now();
      
      try {
        await client.connect();
        const ping = Date.now() - startTime;
        await client.disconnect();
        return { serverId: server.id, online: true, ping };
      } catch (e) {
        return { serverId: server.id, online: false, ping: null };
      }
    })
  );
  
  res.json({ results });
});

// BULK EXECUTE
router.post('/bulk/execute', async (req: Request, res: Response) => {
  console.log('[API] Bulk execute request');
  const { serverIds, commands, delay, stopOnFail } = req.body;
  if (!Array.isArray(serverIds) || !Array.isArray(commands)) {
    res.status(400).json({ error: 'serverIds and commands must be arrays' });
    return;
  }
  console.log(`[API] Bulk execute for servers: ${serverIds.join(', ')}`);
  const results: BulkResult[] = await Promise.all(
    serverIds.map(async (id: string) => {
      try {
        const r = await enqueueCommands(id, commands, { delay, stopOnFail });
        return { serverId: id, ...r };
      } catch (e) {
        return { serverId: id, error: String(e) };
      }
    })
  );
  res.json({ results });
});

// BULK CHANGE MAP
router.post('/bulk/change-map', async (req: Request, res: Response) => {
  console.log('[API] Bulk change-map request');
  const { serverIds, map, workshopId, serverCommands } = req.body;
  if (!Array.isArray(serverIds) || (!map && !workshopId)) {
    res.status(400).json({ error: 'serverIds array and (map or workshopId) required' });
    return;
  }
  
  const mapCommand = workshopId 
    ? `host_workshop_map ${workshopId}`
    : `changelevel ${map}`;
  
  const commands = [mapCommand];
  if (Array.isArray(serverCommands)) commands.push(...serverCommands);
  const results: BulkResult[] = await Promise.all(
    serverIds.map(async (id: string) => {
      try {
        const r = await enqueueCommands(id, commands, { delay: 500, stopOnFail: true });
        return { serverId: id, ...r };
      } catch (e) {
        return { serverId: id, error: String(e) };
      }
    })
  );
  res.json({ results });
});

// ========================================
// PARAMETERIZED ROUTES (with :id)
// These must come AFTER static routes!
// ========================================

router.get('/:id/status', async (req: Request, res: Response) => {
  const id = req.params.id;
  const list = servers.get('servers') || [];
  const server = list.find((s: Server) => s.id === id);
  
  if (!server) {
    res.status(404).json({ error: 'Server not found' });
    return;
  }

  const client = new RconClient(server.host, server.port, server.password);
  const startTime = Date.now();
  
  try {
    await client.connect();
    const ping = Date.now() - startTime;
    
    const statusResult = await client.send('status');
    const status = statusResult.ok ? parseStatus(statusResult.res || '') : null;
    
    // Try to get K/D/A stats from RconStats plugin
    if (status && status.playerList.length > 0) {
      try {
        const statsResult = await client.send('css_playerstats');
        if (statsResult.ok && statsResult.res) {
          const playerStats = parsePlayerStats(statsResult.res);
          // Merge stats into playerList
          for (const player of status.playerList) {
            const stats = playerStats.get(player.name);
            if (stats) {
              player.kills = stats.kills;
              player.deaths = stats.deaths;
              player.assists = stats.assists;
              player.score = stats.score;
            }
          }
        }
      } catch (e) {
        // Plugin not installed or command failed - ignore
      }
    }
    
    let teamScores = { ct: 0, t: 0 };
    
    await client.disconnect();
    
    res.json({
      online: true,
      ping,
      status,
      teamScores,
      timestamp: Date.now(),
    });
  } catch (e) {
    try { await client.disconnect(); } catch (x) {}
    res.json({
      online: false,
      ping: null,
      status: null,
      teamScores: null,
      error: String(e),
      timestamp: Date.now(),
    });
  }
});

router.get('/:id/ping', async (req: Request, res: Response) => {
  const id = req.params.id;
  const list = servers.get('servers') || [];
  const server = list.find((s: Server) => s.id === id);
  
  if (!server) {
    res.status(404).json({ error: 'Server not found' });
    return;
  }

  const client = new RconClient(server.host, server.port, server.password);
  const startTime = Date.now();
  
  try {
    await client.connect();
    const ping = Date.now() - startTime;
    await client.disconnect();
    res.json({ online: true, ping, serverId: id });
  } catch (e) {
    res.json({ online: false, ping: null, serverId: id, error: String(e) });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  const list = servers.get('servers') || [];
  const idx = list.findIndex((s) => s.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  const { name, host, port, password } = req.body;
  list[idx] = {
    ...list[idx],
    name: name !== undefined ? name : list[idx].name,
    host: host !== undefined ? host : list[idx].host,
    port: port !== undefined ? port : list[idx].port,
    password: password !== undefined ? password : list[idx].password,
  };
  servers.set('servers', list);
  res.json(list[idx]);
});

router.delete('/:id', (req: Request, res: Response) => {
  let list = servers.get('servers') || [];
  list = list.filter((s) => s.id !== req.params.id);
  servers.set('servers', list);
  res.json({ ok: true });
});

router.post('/:id/execute', async (req: Request, res: Response) => {
  const id = req.params.id;
  const { commands, delay, stopOnFail } = req.body;
  console.log(`[API] Execute request for server ${id}:`, commands);
  if (!Array.isArray(commands)) {
    res.status(400).json({ error: 'commands must be array' });
    return;
  }
  try {
    console.log(`[API] Calling enqueueCommands...`);
    const result = await enqueueCommands(id, commands, { delay, stopOnFail });
    console.log(`[API] Execute result:`, result);
    res.json(result);
  } catch (e) {
    console.error(`[API] Execute error:`, e);
    res.status(500).json({ error: String(e) });
  }
});

router.post('/:id/change-map', async (req: Request, res: Response) => {
  const id = req.params.id;
  const { map, workshopId, serverCommands } = req.body;
  if (!map && !workshopId) {
    res.status(400).json({ error: 'map or workshopId required' });
    return;
  }
  
  const mapCommand = workshopId 
    ? `host_workshop_map ${workshopId}`
    : `changelevel ${map}`;
  
  const commands = [mapCommand];
  if (Array.isArray(serverCommands)) commands.push(...serverCommands);
  try {
    const result = await enqueueCommands(id, commands, { delay: 500, stopOnFail: true });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
