import express, { Request, Response } from 'express';
import { servers } from '../db';
import { enqueueCommands } from '../serverManager';
import { Server, BulkResult } from '../types';
import RconClient from '../rconClient';

const router = express.Router();

// Parse status command output
function parseStatus(output: string): any {
  const lines = output.split('\n');
  const result: any = {
    hostname: '',
    map: '',
    mapWorkshopId: null,
    players: { current: 0, max: 0, bots: 0 },
    playerList: [],
    version: '',
    steamId: '',
    ip: '',
    hibernating: false,
  };

  for (const line of lines) {
    if (line.startsWith('hostname')) {
      result.hostname = line.split(':').slice(1).join(':').trim();
    }
    else if (line.startsWith('udp/ip')) {
      const match = line.match(/public ([^)]+)/);
      if (match) result.ip = match[1];
    }
    else if (line.startsWith('version')) {
      result.version = line.split(':').slice(1).join(':').trim();
    }
    else if (line.startsWith('steamid')) {
      result.steamId = line.split(':').slice(1).join(':').trim();
    }
    else if (line.startsWith('players')) {
      const match = line.match(/(\d+) humans?, (\d+) bots? \((\d+) max\)/);
      if (match) {
        result.players.current = parseInt(match[1], 10);
        result.players.bots = parseInt(match[2], 10);
        result.players.max = parseInt(match[3], 10);
      }
      result.hibernating = line.includes('hibernating') && !line.includes('not hibernating');
    }
    else if (line.includes('loaded spawngroup')) {
      const match = line.match(/\[\d+: ([^\s|]+)/);
      if (match) result.map = match[1];
      const wsMatch = line.match(/workshop[\/\\](\d+)/i);
      if (wsMatch) result.mapWorkshopId = wsMatch[1];
    }
    else if (/^\s*\d+\s+\d+:\d+/.test(line.trim())) {
      const match = line.match(/^\s*(\d+)\s+(\d+:\d+)\s+(\d+)\s+(\d+)\s+(\w+)\s+\d+\s+([^\s]+)\s+'([^']+)'/);
      if (match) {
        result.playerList.push({
          id: match[1],
          time: match[2],
          ping: parseInt(match[3], 10),
          loss: parseInt(match[4], 10),
          state: match[5],
          address: match[6],
          name: match[7],
        });
      }
    }
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
