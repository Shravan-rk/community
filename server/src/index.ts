import { createApp } from './app.js';
import { env } from './env.js';
import { prisma } from './db.js';
import { startMonitoringScheduler, stopMonitoringScheduler } from './lib/monitoringScheduler.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`\n  GRAMA SAHAY API running on http://localhost:${env.PORT}`);
  console.log(`  Environment: ${env.NODE_ENV}`);
  console.log(`  Health:      http://localhost:${env.PORT}/api/health\n`);
  startMonitoringScheduler();
});

async function shutdown(signal: string) {
  console.log(`\n[server] ${signal} received, shutting down...`);
  stopMonitoringScheduler();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
