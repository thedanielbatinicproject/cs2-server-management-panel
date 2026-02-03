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
  }

  async connect(): Promise<void> {
    if (this.client) return;
    this.client = await Rcon.connect({
      host: this.host,
      port: this.port,
      password: this.password,
      timeout: 5000,
    });
  }

  async send(command: string): Promise<CommandResult> {
    try {
      if (!this.client) await this.connect();
      const res = await this.client!.send(command);
      return { ok: true, res };
    } catch (err) {
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
