import express, { Request, Response } from 'express';
import { servers } from '../db';
import { enqueueCommands } from '../serverManager';
import { Server, BulkResult } from '../types';

const router = express.Router();

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
  if (!Array.isArray(commands)) {
    res.status(400).json({ error: 'commands must be array' });
    return;
  }
  try {
    const result = await enqueueCommands(id, commands, { delay, stopOnFail });
    res.json(result);
  } catch (e) {
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
  
  // Prefer workshop ID if provided - use host_workshop_map command
  // Otherwise use changelevel for built-in maps
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

// Bulk execute: send commands to multiple servers
router.post('/bulk/execute', async (req: Request, res: Response) => {
  const { serverIds, commands, delay, stopOnFail } = req.body;
  if (!Array.isArray(serverIds) || !Array.isArray(commands)) {
    res.status(400).json({ error: 'serverIds and commands must be arrays' });
    return;
  }
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

// Bulk change-map
router.post('/bulk/change-map', async (req: Request, res: Response) => {
  const { serverIds, map, workshopId, serverCommands } = req.body;
  if (!Array.isArray(serverIds) || (!map && !workshopId)) {
    res.status(400).json({ error: 'serverIds array and (map or workshopId) required' });
    return;
  }
  
  // Prefer workshop ID if provided - use host_workshop_map command
  // Otherwise use changelevel for built-in maps
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

export default router;
