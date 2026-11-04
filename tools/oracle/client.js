// Client for the fast fuzz oracle harness (DESIGN.md section 4.5.1).
// Starts one FuzzOracle JVM with child_process.spawn, sends CASE frames to
// its stdin, and reads RESULT frames from its stdout. A stdout chunk can
// hold part of a frame or more than one frame, so we keep a byte buffer and
// take a frame only when its header line and all <m> bytes are present.
// <m> counts bytes, so all framing uses Buffer, never strings. Timeouts
// belong to tools/fuzz.js: it calls kill() (SIGKILL) and starts a new
// harness process. Stderr is log only, never protocol data.
// @ts-check

import { spawn } from "node:child_process";

/** Mode flags the harness accepts. "text" means: callplot gets no flag. */
const MODE_FLAGS = new Set(["text", "-pic", "-xml", "-svg", "-vml", "-vxml", "-graffle"]);

/** One frame client. Each instance owns exactly one harness process. */
export class OracleClient {
  /**
   * @param {string} classDir Folder of .class files the harness loads per case.
   *   A fresh URLClassLoader is made for every case, so the statics (section
   *   3.6) start fresh, as in a new JVM. Do not put reference/build on -cp.
   * @param {string} mainClass Class whose static main(String[]) runs per case.
   */
  constructor(classDir, mainClass) {
    const child = spawn("java", ["-cp", "reference/build-tools", "FuzzOracle", classDir, mainClass], {
      env: { ...process.env, JAVA_TOOL_OPTIONS: "-Dfile.encoding=UTF-8" },
    });
    this.child = child;
    /** @type {Map<string, { resolve: (unknown) => void, reject: (Error) => void }>} */
    this.pending = new Map();
    this.buf = Buffer.alloc(0);
    /** Harness stderr text: for debugging only, never read as protocol data. */
    this.log = "";
    this.alive = true;
    this.closed = false;
    /** Set on a protocol break: the harness is killed and the client is dead. */
    this.protocolError = null;
    /** { code, signal } once the harness process has ended. */
    this.ended = null;
    /** Resolves when the harness process has ended (code 0 is the norm). */
    this.exitPromise = new Promise((resolve) => {
      this.exitResolve = resolve;
    });

    // EPIPE on stdin after the process dies: the exit path reports the loss.
    child.stdin.on("error", () => {
    });
    child.stdout.on("data", (chunk) => {
      this.consume(chunk);
    });
    child.stderr.on("data", (chunk) => {
      this.log += chunk.toString("utf8");
    });
    child.on("error", (err) => {
      this.alive = false;
      this.failAll(`harness spawn failed: ${err.code}`);
      this.exitResolve({ code: null, signal: null });
    });
    // "close" (not "exit"): all stdout data events fire before it.
    child.on("close", (code, signal) => {
      this.onExit(code, signal);
    });
  }

  /**
   * Sends one CASE frame and returns a Promise for its RESULT.
   * @param {string|number} id Case id, unique inside this harness process.
   * @param {string} modeFlag One of MODE_FLAGS.
   * @param {Buffer} input The case input bytes (UTF-8 text, or any bytes).
   * @returns {Promise<{ id: string, exitCode: number, stdout: Buffer }>}
   */
  send(id, modeFlag, input) {
    if (!MODE_FLAGS.has(modeFlag)) {
      throw new TypeError(`unknown mode flag: ${modeFlag}`);
    }
    if (!Buffer.isBuffer(input)) {
      throw new TypeError("input must be a Buffer");
    }
    if (this.closed || !this.alive) {
      throw new Error(`client is no longer usable: ${this.describe()}`);
    }
    const key = String(id);
    if (this.pending.has(key)) {
      throw new Error(`duplicate case id: ${key}`);
    }
    const header = Buffer.from(`CASE ${key} ${modeFlag} ${input.length}\n`, "ascii");
    this.child.stdin.write(header);
    if (input.length > 0) {
      this.child.stdin.write(input);
    }
    return new Promise((resolve, reject) => {
      this.pending.set(key, { resolve, reject });
    });
  }

  /** Closes the client: no more frames, stdin is closed, the harness exits 0.
   * @returns {Promise<{ code: number|null, signal: string|null }>} the harness exit. */
  close() {
    this.closed = true;
    this.child.stdin.end();
    return this.exitPromise;
  }

  /** Kills the harness with SIGKILL (the fuzz timeout path, section 4.5.1).
   * Pending frames are rejected; the caller retries them in a new client.
   * @returns {Promise<{ code: number|null, signal: string|null }>} the harness exit. */
  kill() {
    this.child.kill("SIGKILL");
    this.closed = true;
    return this.exitPromise;
  }

  /** One-line description of the end state, for error messages. */
  describe() {
    if (this.protocolError !== null) {
      return `protocol break: ${this.protocolError}; stderr: ${this.log}`;
    }
    if (this.ended === null) {
      return "still running";
    }
    const how = this.ended.signal !== null ? `killed by ${this.ended.signal}` : `harness exit code ${this.ended.code}`;
    return `${how}; stderr: ${this.log}`;
  }

  /** Rejects every pending frame with one message and clears the queue. */
  failAll(why) {
    for (const entry of this.pending.values()) {
      entry.reject(new Error(why));
    }
    this.pending.clear();
  }

  /** A RESULT frame is malformed or unknown: harness bug, stop the process. */
  breakProtocol(why) {
    this.protocolError = why;
    this.failAll(`harness protocol break: ${why}`);
    this.child.kill("SIGKILL");
  }

  /** Consumes one stdout chunk: appends, then takes whole frames only. */
  consume(chunk) {
    if (chunk.length === 0) {
      return;
    }
    this.buf = this.buf.length === 0 ? Buffer.from(chunk) : Buffer.concat([this.buf, chunk]);
    for (;;) {
      const nl = this.buf.indexOf(0x0a);
      if (nl < 0) {
        return; // no header line yet
      }
      const header = this.buf.subarray(0, nl).toString("ascii");
      const m = /^RESULT (\S+) (-?\d+) (\d+)$/.exec(header);
      if (m === null) {
        this.breakProtocol(`bad RESULT header: ${JSON.stringify(header)}`);
        return;
      }
      const frameEnd = nl + 1 + Number(m[3]);
      if (this.buf.length < frameEnd) {
        return; // header is here, body is not complete yet
      }
      const entry = this.pending.get(m[1]);
      if (entry === undefined) {
        this.breakProtocol(`unexpected RESULT id: ${m[1]}`);
        return;
      }
      const stdout = Buffer.from(this.buf.subarray(nl + 1, frameEnd));
      this.pending.delete(m[1]);
      entry.resolve({ id: m[1], exitCode: Number(m[2]), stdout });
      this.buf = this.buf.subarray(frameEnd);
    }
  }

  /** Harness process ended: record it, and fail frames it still owed. */
  onExit(code, signal) {
    this.alive = false;
    this.ended = { code, signal };
    if (this.protocolError !== null) {
      this.exitResolve({ code, signal });
      return;
    }
    if (signal !== null || code !== 0) {
      const why = signal !== null ? `harness killed by ${signal}` : `harness exited with code ${code}`;
      this.failAll(`${why}; stderr: ${this.log}`);
    }
    this.exitResolve({ code, signal });
  }
}
