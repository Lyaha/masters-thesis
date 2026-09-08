import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRouteHandler = (
  request: Request,
  response: Response,
  next: NextFunction,
) => Promise<unknown>;

export function asyncRoute(handler: AsyncRouteHandler): RequestHandler {
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);

  if (response.headersSent) {
    return;
  }

  response.status(500).json({ error: 'Внутрішня помилка сервера' });
};
