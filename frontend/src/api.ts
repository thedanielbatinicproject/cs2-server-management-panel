import axios, { AxiosInstance } from 'axios';
import {
  Server,
  GameMap,
  GameMode,
  Prompt,
  User,
  UserPermissions,
  LoginResponse,
  BulkExecuteResponse,
} from './types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api: AxiosInstance = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const auth = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { username, password }),
};

export const servers = {
  list: () => api.get<Server[]>('/servers'),
  create: (data: Partial<Server>) => api.post<Server>('/servers', data),
  update: (id: string, data: Partial<Server>) => api.put<Server>(`/servers/${id}`, data),
  remove: (id: string) => api.delete(`/servers/${id}`),
  execute: (id: string, commands: string[], opts?: { delay?: number; stopOnFail?: boolean }) =>
    api.post(`/servers/${id}/execute`, { commands, ...opts }),
  changeMap: (id: string, map: string, workshopId?: string | null, serverCommands?: string[]) =>
    api.post(`/servers/${id}/change-map`, { map, workshopId, serverCommands }),
  bulkExecute: (
    serverIds: string[],
    commands: string[],
    opts?: { delay?: number; stopOnFail?: boolean }
  ) => api.post<BulkExecuteResponse>('/servers/bulk/execute', { serverIds, commands, ...opts }),
  bulkChangeMap: (serverIds: string[], map: string, workshopId?: string | null, serverCommands?: string[]) =>
    api.post<BulkExecuteResponse>('/servers/bulk/change-map', { serverIds, map, workshopId, serverCommands }),
};

export const maps = {
  list: () => api.get<GameMap[]>('/maps'),
  gamemodes: () => api.get<GameMode[]>('/maps/gamemodes'),
  create: (data: Partial<GameMap>) => api.post<GameMap>('/maps', data),
  update: (id: string, data: Partial<GameMap>) => api.put<GameMap>(`/maps/${id}`, data),
  remove: (id: string) => api.delete(`/maps/${id}`),
};

export const prompts = {
  list: () => api.get<Prompt[]>('/prompts'),
  create: (data: Partial<Prompt>) => api.post<Prompt>('/prompts', data),
  update: (id: string, data: Partial<Prompt>) => api.put<Prompt>(`/prompts/${id}`, data),
  remove: (id: string) => api.delete(`/prompts/${id}`),
};

export const users = {
  list: () => api.get<User[]>('/users'),
  create: (data: { username: string; password: string; role?: string; permissions?: UserPermissions }) =>
    api.post<User>('/users', data),
  update: (id: string, data: Partial<{ username: string; password: string; role: string; permissions: UserPermissions }>) =>
    api.put<User>(`/users/${id}`, data),
  remove: (id: string) => api.delete(`/users/${id}`),
};

export default api;
