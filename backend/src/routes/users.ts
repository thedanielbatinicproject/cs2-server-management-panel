import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { users } from '../db';
import { requireRole } from '../auth';
import { User, UserPermissions } from '../types';

const router = express.Router();

// List users (admin/superadmin only, passwords stripped)
router.get('/', requireRole('admin', 'superadmin'), (req: Request, res: Response) => {
  const list = (users.get('users') || []).map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    isSuperuser: u.isSuperuser || false,
    permissions: u.permissions || { servers: 'view', maps: 'view', prompts: 'view' },
  }));
  res.json(list);
});

// Create user (admin/superadmin only)
router.post('/', requireRole('admin', 'superadmin'), (req: Request, res: Response) => {
  const list = users.get('users') || [];
  const { username, password, role, permissions } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'username and password required' });
    return;
  }
  if (list.find((u) => u.username === username)) {
    res.status(400).json({ error: 'username taken' });
    return;
  }
  
  // Admins cannot create other admins or superadmins
  let userRole = role || 'viewer';
  if (req.user?.role === 'admin' && (userRole === 'admin' || userRole === 'superadmin')) {
    userRole = 'operator';
  }
  // Only superadmin can create admins
  if (userRole === 'superadmin') {
    userRole = 'admin'; // Can never create superadmin via API
  }
  
  const validRoles: Array<'admin' | 'operator' | 'viewer'> = ['admin', 'operator', 'viewer'];
  if (!validRoles.includes(userRole as any)) {
    userRole = 'viewer';
  }
  
  const id = String(Date.now());
  const hashedPw = bcrypt.hashSync(password, 8);
  const userPermissions: UserPermissions = permissions || { servers: 'view', maps: 'view', prompts: 'view' };
  
  const item: User = {
    id,
    username,
    password: hashedPw,
    role: userRole as 'admin' | 'operator' | 'viewer',
    isSuperuser: false,
    permissions: userPermissions,
  };
  list.push(item);
  users.set('users', list);
  res.json({ id, username, role: item.role, permissions: item.permissions });
});

// Update user (admin/superadmin only)
router.put('/:id', requireRole('admin', 'superadmin'), (req: Request, res: Response) => {
  const list = users.get('users') || [];
  const idx = list.findIndex((u) => u.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  
  // Cannot edit superuser
  if (list[idx].isSuperuser) {
    res.status(403).json({ error: 'Cannot modify superuser' });
    return;
  }
  
  const { username, password, role, permissions } = req.body;
  
  // Admins cannot promote to admin/superadmin
  let newRole = role;
  if (req.user?.role === 'admin' && (newRole === 'admin' || newRole === 'superadmin')) {
    newRole = list[idx].role; // Keep existing role
  }
  if (newRole === 'superadmin') {
    newRole = list[idx].role; // Never allow superadmin via API
  }
  
  if (username) list[idx].username = username;
  if (password) list[idx].password = bcrypt.hashSync(password, 8);
  if (newRole) list[idx].role = newRole;
  if (permissions) list[idx].permissions = permissions;
  
  users.set('users', list);
  res.json({
    id: list[idx].id,
    username: list[idx].username,
    role: list[idx].role,
    permissions: list[idx].permissions,
  });
});

// Delete user (admin/superadmin only)
router.delete('/:id', requireRole('admin', 'superadmin'), (req: Request, res: Response) => {
  let list = users.get('users') || [];
  const user = list.find((u) => u.id === req.params.id);
  
  // Cannot delete superuser
  if (user?.isSuperuser) {
    res.status(403).json({ error: 'Cannot delete superuser' });
    return;
  }
  
  // Admins cannot delete other admins
  if (req.user?.role === 'admin' && user?.role === 'admin') {
    res.status(403).json({ error: 'Admins cannot delete other admins' });
    return;
  }
  
  list = list.filter((u) => u.id !== req.params.id);
  users.set('users', list);
  res.json({ ok: true });
});

export default router;
