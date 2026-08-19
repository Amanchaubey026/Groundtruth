import type { Response } from "express";

export interface SseStream {
  send: (event: string, data: unknown) => void;
  close: () => void;
}

export function openSse(res: Response): SseStream {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.socket?.setNoDelay?.(true);

  return {
    send(event: string, data: unknown) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    close() {
      res.end();
    },
  };
}
