import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import measurementRoutes from './routes/measurement.routes';
import designRoutes from './routes/design.routes';
import tryOnRoutes from './routes/tryOn.routes';
import orderRoutes from './routes/order.routes';
import migrationRoutes from './routes/migration.routes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files as static
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'QT Fashion API Documentation',
  })
);

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'QT Fashion API is running' });
});

// Mock auth endpoint for testing without database
app.post('/api/auth/mock-login', (req, res) => {
  const { email, password } = req.body;

  // Mock user response
  res.json({
    message: 'Login successful (MOCK MODE)',
    user: {
      id: 'mock-user-123',
      email: email || 'test@example.com',
      name: 'Test User',
      role: 'CUSTOMER',
    },
    token: 'mock-jwt-token-12345',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/api/designs', designRoutes);
app.use('/api/try-on', tryOnRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/migration', migrationRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
});

export default app;
