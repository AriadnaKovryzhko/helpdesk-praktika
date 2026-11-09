import { AsyncLocalStorage } from 'async_hooks';
import { NextFunction, Request, Response } from 'express';

interface RequestContext {
  ip: string | null;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function requestContextMiddleware(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  storage.run({ ip: request.ip ?? null }, next);
}

export const currentRequestIp = (): string | null => storage.getStore()?.ip ?? null;
