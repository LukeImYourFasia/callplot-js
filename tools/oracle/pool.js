// Harness task dispatcher (DESIGN.md 4.5.1 and 5.3.1 W19e).
// Starts a pool of OracleClients and hands tasks to them. A task with no
// RESULT in timeoutMs kills that client with SIGKILL, records exit code
// 124 for the case, and continues in a new harness process (4.5.1:
// timeouts belong to the fuzz runner, not to the harness).
// @ts-check

import { OracleClient } from "./client.js";

/** Resolves after ms; clear() cancels the pending timer. */
function waitMs(ms) {
  let handle = null;
  const promise = new Promise((resolve) => {
    handle = setTimeout(resolve, ms);
  });
  return {
    promise,
    clear: () => {
      if (handle !== null) {
        clearTimeout(handle);
      }
    },
  };
}

/**
 * Runs all tasks through a pool of harness processes.
 * @param {{ classDir: string, mainClass: string }} what each case runs.
 * @param {{ key: string, flag: string, input: Buffer }[]} tasks; flags are
 *   harness mode flags ("text" or -pic ... -graffle).
 * @param {{ clients?: number, timeoutMs?: number }} pool size, timeout.
 * @returns {Promise<Map<string, { exitCode: number, stdout: Buffer, timedOut?: boolean, error?: string }>>}
 */
export async function runHarnessTasks({ classDir, mainClass }, tasks, { clients = 8, timeoutMs = 5000 } = {}) {
  const results = new Map();
  const next = [0]; // shared queue cursor

  async function worker() {
    let client = new OracleClient(classDir, mainClass);
    while (next[0] < tasks.length) {
      const task = tasks[next[0]];
      next[0] += 1;
      let lost = null;
      try {
        const p = client.send(task.key, task.flag, task.input);
        const timer = waitMs(timeoutMs);
        try {
          const won = await Promise.race([
            p.then((v) => ({ frame: v })),
            timer.promise.then(() => ({ timeout: true })),
          ]);
          timer.clear();
          if (won.timeout !== undefined) {
            await client.kill();
            try {
              await p;
            } catch {
            }
            results.set(task.key, { exitCode: 124, stdout: Buffer.alloc(0), timedOut: true });
            client = new OracleClient(classDir, mainClass);
            continue;
          }
          results.set(task.key, won.frame);
        } catch (err) {
          lost = String(err);
        }
        if (lost !== null) {
          // The harness died mid-run (bad arguments or a harness error):
          // record it and start a fresh process for the remaining tasks.
          results.set(task.key, { exitCode: 124, stdout: Buffer.alloc(0), error: lost });
          client = new OracleClient(classDir, mainClass);
        }
      } catch {
        results.set(task.key, { exitCode: 124, stdout: Buffer.alloc(0), error: "send failed" });
        client = new OracleClient(classDir, mainClass);
      }
    }
    // Close stdin: the harness exits 0 once its buffered frames are done.
    await client.close();
  }

  const jobs = [];
  for (let i = 0; i < Math.min(clients, tasks.length); i += 1) {
    jobs.push(worker());
  }
  await Promise.all(jobs);
  return results;
}
