import RconClient from './rconClient';
import { servers } from './db';
import { Server, CommandResult, JobResult } from './types';

interface QueueJob {
  commands: string[];
  resolve: (result: JobResult) => void;
  reject: (err: Error) => void;
  stopOnFail: boolean;
  delay: number;
}

interface ServerQueue {
  items: QueueJob[];
  processing: boolean;
  rejectAll: (err: Error) => void;
}

const queues = new Map<string, ServerQueue>();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getServerConfig(id: string): Server | undefined {
  const list = servers.get('servers') || [];
  console.log(`[Queue] Looking for server ${id}, found ${list.length} servers`);
  return list.find((s) => s.id === id);
}

async function processQueue(id: string): Promise<void> {
  const q = queues.get(id);
  if (!q || q.processing) {
    console.log(`[Queue] processQueue(${id}): skipped (no queue or already processing)`);
    return;
  }
  q.processing = true;
  console.log(`[Queue] processQueue(${id}): starting`);

  const cfg = getServerConfig(id);
  if (!cfg) {
    console.log(`[Queue] Server ${id} not found!`);
    q.processing = false;
    return;
  }
  console.log(`[Queue] Server config: ${cfg.host}:${cfg.port}`);

  const client = new RconClient(cfg.host, cfg.port, cfg.password);
  try {
    await client.connect();
    console.log(`[Queue] Connected to RCON`);
  } catch (e) {
    console.error(`[Queue] RCON connect failed:`, e);
    q.rejectAll(new Error('RCON connect failed: ' + e));
    queues.delete(id);
    return;
  }

  while (q.items.length > 0) {
    const job = q.items.shift()!;
    console.log(`[Queue] Processing job with ${job.commands.length} commands`);
    const results: CommandResult[] = [];
    let failed = false;

    for (const line of job.commands) {
      console.log(`[Queue] Sending: ${line}`);
      const r = await client.send(line);
      console.log(`[Queue] Result: ok=${r.ok}`);
      results.push(r);
      if (!r.ok) {
        failed = true;
        if (job.stopOnFail) break;
      }
      await sleep(job.delay);
    }

    job.resolve({ results, failed });
    console.log(`[Queue] Job completed`);
  }

  try {
    await client.disconnect();
  } catch (e) {
    // ignore
  }
  q.processing = false;
}

function ensureQueue(id: string): ServerQueue {
  if (!queues.has(id)) {
    queues.set(id, {
      items: [],
      processing: false,
      rejectAll(err: Error) {
        this.items.forEach((j) => j.reject(err));
        this.items = [];
      },
    });
  }
  return queues.get(id)!;
}

export interface EnqueueOptions {
  stopOnFail?: boolean;
  delay?: number;
}

export function enqueueCommands(
  id: string,
  commands: string[],
  opts: EnqueueOptions = {}
): Promise<JobResult> {
  return new Promise((resolve, reject) => {
    const q = ensureQueue(id);
    q.items.push({
      commands,
      resolve,
      reject,
      stopOnFail: opts.stopOnFail !== false,
      delay: opts.delay || 200,
    });
    processQueue(id).catch((err) => reject(err));
  });
}
