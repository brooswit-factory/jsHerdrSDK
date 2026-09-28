import { Socket } from "node:net";
import { LineSplitter } from "./line-splitter.js";
import { socketEndpoint } from "./socket-path.js";
import { HerdrTransportError } from "../protocol/error.js";

export interface ConnectionHandlers {
  onLine(line: string): void;
  onClose(): void;
  onError(err: unknown): void;
}

/**
 * A single connection that delivers newline-delimited frames: a Unix-domain
 * socket on Linux/macOS, a named pipe on Windows (see `socketEndpoint`).
 * Knows nothing about JSON or the protocol; that is one layer up.
 */
export class Connection {
  private constructor(private readonly sock: Socket) {}

  static open(path: string, h: ConnectionHandlers): Promise<Connection> {
    const split = new LineSplitter();
    return new Promise<Connection>((resolve, reject) => {
      let connected = false;
      const sock = new Socket();
      // Listeners must be attached before `connect()` — it can fail (e.g. ENOENT)
      // before this call returns, and a socket with no "error" listener yet throws.
      sock.once("connect", () => { connected = true; resolve(new Connection(sock)); });
      sock.on("data", (d) => { for (const l of split.push(d.toString())) h.onLine(l); });
      sock.on("close", () => { if (connected) h.onClose(); });
      sock.on("error", (e) => {
        if (connected) h.onError(e);
        else reject(new HerdrTransportError(`cannot connect to herdr socket at ${path}`, e));
      });
      sock.connect(socketEndpoint(path));
    });
  }

  writeLine(line: string): void { this.sock.write(line + "\n"); }
  close(): void { this.sock.end(); }
}
