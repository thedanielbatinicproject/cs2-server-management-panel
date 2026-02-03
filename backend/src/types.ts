export interface User {
  id: string;
  username: string;
  password: string;
  role: 'superadmin' | 'admin' | 'operator' | 'viewer';
  isSuperuser?: boolean;
  permissions?: UserPermissions;
}

export interface UserPermissions {
  servers: PermissionLevel;
  maps: PermissionLevel;
  prompts: PermissionLevel;
}

export type PermissionLevel = 'none' | 'view' | 'run' | 'edit';

export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  password: string;
}

export interface GameMode {
  code: string;
  name: string;
  description: string;
}

export interface GameMap {
  id: string;
  name: string;
  gamemode: string;
  workshopId: string | null;
  serverCommands: string[];
  isDefault?: boolean;
}

export interface Prompt {
  id: string;
  name: string;
  lines: string[];
}

export interface CommandResult {
  ok: boolean;
  res?: string;
  error?: string;
}

export interface JobResult {
  results: CommandResult[];
  failed: boolean;
}

export interface BulkResult {
  serverId: string;
  results?: CommandResult[];
  failed?: boolean;
  error?: string;
}

export interface JWTPayload {
  id: string;
  username: string;
  role: string;
  isSuperuser?: boolean;
  permissions?: UserPermissions;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
