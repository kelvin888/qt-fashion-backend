import { Request, Response, NextFunction } from 'express';

interface ErrorResponse {
  message: string;
  status: number;
  errors?: any;
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  const response: ErrorResponse = {
    message,
    status,
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  res.status(status).json(response);
};
