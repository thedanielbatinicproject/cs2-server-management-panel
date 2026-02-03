import express, { Request, Response } from 'express';
import { maps } from '../db';
import { GameMode, GameMap } from '../types';
import { requirePermission } from '../auth';

const router = express.Router();

// Default maps - cannot be deleted
const DEFAULT_MAPS: GameMap[] = [
  { id: '1', name: 'de_mirage', gamemode: 'comp', workshopId: null, serverCommands: [], isDefault: true },
  { id: '2', name: 'de_inferno', gamemode: 'comp', workshopId: null, serverCommands: [], isDefault: true },
  { id: '3', name: 'de_dust2', gamemode: 'comp', workshopId: null, serverCommands: [], isDefault: true },
  { id: '4', name: 'de_nuke', gamemode: 'comp', workshopId: null, serverCommands: [], isDefault: true },
  { id: '5', name: 'de_ancient', gamemode: 'comp', workshopId: null, serverCommands: [], isDefault: true },
  { id: '6', name: 'de_anubis', gamemode: 'comp', workshopId: null, serverCommands: [], isDefault: true },
  { id: '7', name: 'de_vertigo', gamemode: 'comp', workshopId: null, serverCommands: [], isDefault: true },
  { id: '8', name: 'de_overpass', gamemode: 'comp', workshopId: null, serverCommands: [], isDefault: true },
  { id: '9', name: 'de_train', gamemode: 'comp', workshopId: null, serverCommands: [], isDefault: true },
  { id: '10', name: 'cs_office', gamemode: 'cs', workshopId: null, serverCommands: [], isDefault: true },
  { id: '11', name: 'cs_italy', gamemode: 'cs', workshopId: null, serverCommands: [], isDefault: true },
];

// Ensure default maps exist
function ensureDefaultMaps(): void {
  const list = maps.get('maps') || [];
  let changed = false;
  
  for (const defMap of DEFAULT_MAPS) {
    const exists = list.find((m) => m.id === defMap.id && m.isDefault);
    if (!exists) {
      // Remove any old entry with same name that might have wrong ID
      const oldIdx = list.findIndex((m) => m.name === defMap.name && m.isDefault);
      if (oldIdx !== -1) {
        list.splice(oldIdx, 1);
      }
      list.push({ ...defMap });
      changed = true;
    }
  }
  
  if (changed) {
    maps.set('maps', list);
  }
}

ensureDefaultMaps();

// Gamemode definitions
const GAMEMODES: GameMode[] = [
  { code: 'de', name: 'Defuse', description: 'Bomb defusal maps' },
  { code: 'cs', name: 'Hostage', description: 'Hostage rescue maps' },
  { code: 'wm', name: 'Wingman', description: '2v2 wingman maps' },
  { code: 'ar', name: 'Arms Race', description: 'Gun game progression' },
  { code: 'dm', name: 'Deathmatch', description: 'Free-for-all deathmatch' },
  { code: 'fy', name: 'Fun/Aim', description: 'Fun yard and aim maps' },
  { code: 'gg', name: 'Gun Game', description: 'Classic gun game' },
  { code: 'surf', name: 'Surf', description: 'Surf maps' },
  { code: 'bhop', name: 'Bunny Hop', description: 'Bunny hop maps' },
  { code: 'kz', name: 'Kreedz Climbing', description: 'Climb/jump maps' },
  { code: 'retake', name: 'Retake', description: 'Retake practice maps' },
  { code: 'executes', name: 'Executes', description: 'Execute practice maps' },
  { code: 'aim', name: 'Aim Training', description: 'Aim training maps' },
  { code: 'awp', name: 'AWP', description: 'AWP-only maps' },
  { code: '1v1', name: '1v1 Arena', description: '1v1 arena maps' },
  { code: 'casual', name: 'Casual', description: 'Casual mode maps' },
  { code: 'comp', name: 'Competitive', description: 'Competitive maps' },
];

router.get('/gamemodes', (req: Request, res: Response) => {
  res.json(GAMEMODES);
});

router.get('/', (req: Request, res: Response) => {
  res.json(maps.get('maps') || []);
});

router.post('/', requirePermission('maps', 'edit'), (req: Request, res: Response) => {
  const list = maps.get('maps') || [];
  const id = String(Date.now());
  const { name, gamemode, workshopId, serverCommands } = req.body;
  const item: GameMap = {
    id,
    name: name || 'Unnamed Map',
    gamemode: gamemode || 'de',
    workshopId: workshopId || null,
    serverCommands: Array.isArray(serverCommands) ? serverCommands : [],
    isDefault: false,
  };
  list.push(item);
  maps.set('maps', list);
  res.json(item);
});

router.put('/:id', requirePermission('maps', 'edit'), (req: Request, res: Response) => {
  const list = maps.get('maps') || [];
  const idx = list.findIndex((m) => m.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  const { name, gamemode, workshopId, serverCommands } = req.body;
  
  // Default maps can only have serverCommands edited
  if (list[idx].isDefault) {
    list[idx].serverCommands = serverCommands !== undefined ? serverCommands : list[idx].serverCommands;
  } else {
    list[idx] = {
      ...list[idx],
      name: name !== undefined ? name : list[idx].name,
      gamemode: gamemode !== undefined ? gamemode : list[idx].gamemode,
      workshopId: workshopId !== undefined ? workshopId : list[idx].workshopId,
      serverCommands: serverCommands !== undefined ? serverCommands : list[idx].serverCommands,
    };
  }
  maps.set('maps', list);
  res.json(list[idx]);
});

router.delete('/:id', requirePermission('maps', 'edit'), (req: Request, res: Response) => {
  let list = maps.get('maps') || [];
  const map = list.find((m) => m.id === req.params.id);
  
  // Cannot delete default maps
  if (map?.isDefault) {
    res.status(403).json({ error: 'Cannot delete default maps' });
    return;
  }
  
  list = list.filter((m) => m.id !== req.params.id);
  maps.set('maps', list);
  res.json({ ok: true });
});

export default router;
