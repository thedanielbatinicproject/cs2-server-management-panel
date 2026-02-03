import * as fs from 'fs';
import * as path from 'path';
import { User, Server, GameMap, Prompt } from './types';

function filePath(name: string): string {
  const dir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, name + '.json');
}

interface UsersStore { users: User[]; [key: string]: unknown; }
interface ServersStore { servers: Server[]; [key: string]: unknown; }
interface MapsStore { maps: GameMap[]; [key: string]: unknown; }
interface PromptsStore { prompts: Prompt[]; [key: string]: unknown; }

class JSONStore<T extends Record<string, unknown>> {
  private filePath: string;
  private data: T;

  constructor(name: string, initial: T) {
    this.filePath = filePath(name);
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify(initial, null, 2));
    }
    this.data = this.load();
  }

  private load(): T {
    const content = fs.readFileSync(this.filePath, 'utf8') || '{}';
    return JSON.parse(content) as T;
  }

  save(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.data[key];
  }

  set<K extends keyof T>(key: K, value: T[K]): T[K] {
    this.data[key] = value;
    this.save();
    return value;
  }

  reload(): void {
    this.data = this.load();
  }
}

export const users = new JSONStore<UsersStore>('users', { users: [] });
export const servers = new JSONStore<ServersStore>('servers', { servers: [] });
export const maps = new JSONStore<MapsStore>('maps', { maps: [] });
export const prompts = new JSONStore<PromptsStore>('prompts', { prompts: [] });
