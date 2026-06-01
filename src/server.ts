import express, { Application } from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import designRoutes from './routes/design.routes';
import offerRoutes from './routes/offer.routes';
import orderRoutes from './routes/order.routes';
import userRoutes from './routes/user.routes';
import tryOnRoutes from './routes/tryOn.routes';
import uploadRoutes from './routes/upload.routes';
import paymentRoutes from './routes/payment.routes';
import addressRoutes from './routes/address.routes';
import customRequestRoutes from './routes/customRequest.routes';
import payoutRoutes from './routes/payout.routes';
import notificationRoutes from './routes/notification.routes';
import eventsRoutes from './routes/events.routes';
import adminRoutes from './routes/admin.routes';
import { deadlineService } from './services/deadline.service';
import { cronService } from './services/cron.service';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin as string | undefined;
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) ?? [];

  const originAllowed =
    allowedOrigins.length === 0 || (requestOrigin != null && allowedOrigins.includes(requestOrigin));

  if (originAllowed && requestOrigin) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger API Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'QT Fashion API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  })
);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/designs', designRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/try-on', tryOnRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/custom-requests', customRequestRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/admin', adminRoutes); // Admin routes

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);

  // Start deadline monitoring service (runs every hour)
  console.log('📅 Starting deadline monitoring service...');

  // Run immediately on startup
  deadlineService.monitorDeadlines().catch((err) => {
    console.error('❌ Error in initial deadline monitoring:', err);
  });

  // Then run every hour
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(() => {
    deadlineService.monitorDeadlines().catch((err) => {
      console.error('❌ Error in scheduled deadline monitoring:', err);
    });
  }, ONE_HOUR);

  // Start cron jobs for escrow automation
  console.log('⏰ Starting escrow automation cron jobs...');
  cronService.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  cronService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  cronService.stop();
  process.exit(0);
});

export default app;
