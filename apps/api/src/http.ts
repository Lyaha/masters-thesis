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

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.status).json({ error: error.message });
    return;
  }
  const errors: Record<string, [number, string]> = {
    'entity.parse.failed': [400, 'Некоректний JSON'],
    'entity.too.large': [413, 'Набір перевищує ліміт 10 МіБ'],
    '23505': [409, 'Запис із такими даними вже існує'],
    '23503': [409, 'Запис пов’язаний з іншими даними або посилання не існує'],
    '22P02': [400, 'Некоректний ідентифікатор або значення'],
    '22003': [400, 'Число перевищує допустимий діапазон'],
    '23514': [400, 'Дані порушують обмеження'],
  };
  const known = errors[error?.type] ?? errors[error?.code];
  if (known) {
    response.status(known[0]).json({ error: known[1] });
    return;
  }
  console.error('Unhandled request error', error instanceof Error ? error.name : 'unknown');
  response.status(500).json({ error: 'Внутрішня помилка сервера' });
};
