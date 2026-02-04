import { Rcon } from 'rcon-client';
import { CommandResult } from './types';

export class RconClientWrapper {
  private host: string;
  private port: number;
  private password: string;
  private client: Rcon | null = null;

  constructor(host: string, port: number, password: string) {
    this.host = host;
    this.port = port;
    this.password = password;
    console.log(`[RCON] Created client for ${host}:${port}`);
  }

  async connect(): Promise<void> {
    if (this.client) {
      console.log('[RCON] Already connected');
      return;
    }
    console.log(`[RCON] Connecting to ${this.host}:${this.port}...`);
    this.client = await Rcon.connect({
      host: this.host,
      port: this.port,
      password: this.password,
      timeout: 5000,
    });
    console.log('[RCON] Connected successfully');
  }

  async send(command: string): Promise<CommandResult> {
    console.log(`[RCON] Sending command: ${command}`);
    try {
      if (!this.client) await this.connect();
      const res = await this.client!.send(command);
      console.log(`[RCON] Response received (${res.length} chars)`);
      return { ok: true, res };
    } catch (err) {
      console.error(`[RCON] Error: ${err}`);
      return { ok: false, error: String(err) };
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.end();
      } catch (e) {
        // ignore
      }
      this.client = null;
    }
  }
}

export default RconClientWrapper;
