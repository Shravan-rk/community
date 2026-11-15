import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(testDir, '..');

export default function globalSetup() {
  // Dedicated test database only. Never points at the development database.
  execFileSync('node', [path.join(serverDir, 'node_modules', 'prisma', 'build', 'index.js'), 'db', 'push', '--skip-generate', '--force-reset'], {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'pipe',
  });
}
