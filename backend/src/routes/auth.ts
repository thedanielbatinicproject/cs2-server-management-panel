import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { users } from '../db';
import { generateToken, ensureSuperuser } from '../auth';

const router = express.Router();

ensureSuperuser();

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const list = users.get('users') || [];
  const user = list.find((u) => u.username === username);
  if (!user) {
    res.status(401).json({ error: 'Invalid' });
    return;
  }
  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) {
    res.status(401).json({ error: 'Invalid' });
    return;
  }
  res.json({ token: generateToken(user) });
});

export default router;
