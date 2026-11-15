import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env.js';
import { prisma } from './db.js';
import authRoutes from './routes/auth.routes.js';
import citizenRoutes from './routes/citizen.routes.js';
import adminRoutes from './routes/admin.routes.js';
import adminSchemeRoutes from './routes/adminScheme.routes.js';
import schemeRoutes from './routes/scheme.routes.js';
import categoryRoutes from './routes/category.routes.js';
import metaRoutes from './routes/meta.routes.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY);

  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigins.length > 0 ? allowedOrigins : false,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', async (_req, res) => {
    let database: 'ok' | 'unavailable' = 'ok';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'unavailable';
    }
    res.status(database === 'ok' ? 200 : 503).json({
      ok: database === 'ok',
      service: 'GRAMA SAHAY API',
      version: '0.1.0',
      database,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api', apiLimiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/citizens', citizenRoutes);
  app.use('/api/admin/schemes', adminSchemeRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/schemes', schemeRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/meta', metaRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
