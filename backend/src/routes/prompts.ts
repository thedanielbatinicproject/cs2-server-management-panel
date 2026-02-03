import express, { Request, Response } from 'express';
import { prompts } from '../db';
import { Prompt } from '../types';
import { requirePermission } from '../auth';

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
  res.json(prompts.get('prompts') || []);
});

router.post('/', requirePermission('prompts', 'edit'), (req: Request, res: Response) => {
  const list = prompts.get('prompts') || [];
  const id = String(Date.now());
  const { name, lines } = req.body;
  const item: Prompt = {
    id,
    name: name || 'Unnamed Prompt',
    lines: Array.isArray(lines)
      ? lines
      : typeof lines === 'string'
      ? lines.split('\n').filter((l: string) => l.trim())
      : [],
  };
  list.push(item);
  prompts.set('prompts', list);
  res.json(item);
});

router.put('/:id', requirePermission('prompts', 'edit'), (req: Request, res: Response) => {
  const list = prompts.get('prompts') || [];
  const idx = list.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  const { name, lines } = req.body;
  list[idx] = {
    ...list[idx],
    name: name !== undefined ? name : list[idx].name,
    lines:
      lines !== undefined
        ? Array.isArray(lines)
          ? lines
          : lines.split('\n').filter((l: string) => l.trim())
        : list[idx].lines,
  };
  prompts.set('prompts', list);
  res.json(list[idx]);
});

router.delete('/:id', requirePermission('prompts', 'edit'), (req: Request, res: Response) => {
  let list = prompts.get('prompts') || [];
  list = list.filter((p) => p.id !== req.params.id);
  prompts.set('prompts', list);
  res.json({ ok: true });
});

export default router;
