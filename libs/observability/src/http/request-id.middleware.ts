import type { NextFunction, Request, Response } from 'express';
import {
  ANONYMOUS_ACTOR,
  runWithCorrelation,
} from '../correlation/correlation-context';
import { REQUEST_ID_HEADER, resolveRequestId } from '../correlation/request-id';

export function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const requestId = resolveRequestId(request.headers[REQUEST_ID_HEADER]);
  request.headers[REQUEST_ID_HEADER] = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);
  runWithCorrelation({ requestId, actor: { ...ANONYMOUS_ACTOR } }, () => {
    next();
  });
}
