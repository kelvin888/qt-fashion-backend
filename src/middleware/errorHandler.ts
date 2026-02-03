import { Request, Response, NextFunction } from 'express';

export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', error);

  // Default error
  let statusCode = 500;
  let message = 'Internal server error';

  // Handle specific errors
  if (error.message) {
    message = error.message;

    // Set appropriate status codes based on error message
    if (message.includes('already exists')) {
      statusCode = 409;
    } else if (message.includes('not found') || message.includes('Not found')) {
      statusCode = 404;
    } else if (message.includes('Invalid') || message.includes('required')) {
      statusCode = 400;
    } else if (message.includes('Unauthorized') || message.includes('token')) {
      statusCode = 401;
    } else if (message.includes('Forbidden') || message.includes('permission')) {
      statusCode = 403;
    }
  }

  // Prisma errors
  if (error.code === 'P2002') {
    statusCode = 409;
    message = 'Resource already exists';
  } else if (error.code === 'P2025') {
    statusCode = 404;
    message = 'Resource not found';
  }

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};
