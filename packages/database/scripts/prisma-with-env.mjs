import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgDir = path.resolve(__dirname, '..');
const rootEnvPath = path.resolve(pkgDir, '../../.env');

const env = { ...process.env };
if (fs.existsSync(rootEnvPath)) {
  for (const rawLine of fs.readFileSync(rootEnvPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && env[key] === undefined) {
      env[key] = val;
    }
  }
}

const require = createRequire(import.meta.url);
const prismaEntry = require.resolve('prisma/build/index.js');
const args = process.argv.slice(2);

const result = spawnSync(process.execPath, [prismaEntry, ...args], {
  cwd: pkgDir,
  env,
  stdio: 'inherit',
  shell: false,
});

process.exit(result.status ?? 1);
