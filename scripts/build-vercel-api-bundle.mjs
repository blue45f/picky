import { access, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entryPoint = await findApiEntryPoint();
const outfile = resolve(projectRoot, 'api/_serverless-api.js');

await build({
  absWorkingDir: projectRoot,
  entryPoints: [entryPoint],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  external: [
    '@nestjs/common',
    '@nestjs/core',
    '@nestjs/jwt',
    '@nestjs/platform-express',
    '@vercel/kv',
    'compression',
    'helmet',
    'nestjs-zod',
    'reflect-metadata',
    'rxjs',
    'zod',
  ],
});

async function findApiEntryPoint() {
  const candidates = [
    resolve(projectRoot, 'apps/api/dist/main.js'),
    resolve(projectRoot, 'apps/api/dist/src/main.js'),
    resolve(projectRoot, 'dist/apps/api/main.js'),
    resolve(projectRoot, 'dist/apps/api/src/main.js'),
  ];

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }

  const matches = [];
  await collectMainFiles(projectRoot, matches, 0);
  const match = matches.find(
    (filePath) => filePath.includes('/api/') && filePath.includes('/dist/'),
  );
  if (match) {
    return match;
  }

  throw new Error(`Could not find built API entry. Checked: ${candidates.join(', ')}`);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectMainFiles(directory, matches, depth) {
  if (depth > 6) {
    return;
  }

  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.name === '.git' ||
      entry.name === '.vercel' ||
      entry.name === 'node_modules' ||
      entry.name === 'apps/web/dist'
    ) {
      continue;
    }

    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await collectMainFiles(fullPath, matches, depth + 1);
    } else if (entry.isFile() && entry.name === 'main.js') {
      matches.push(fullPath);
    }
  }
}
