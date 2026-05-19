/**
 * Packages the built extension into a Chrome Web Store-ready zip.
 * Run via `npm run release` (which builds first).
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const distDir = resolve(root, 'dist');
const releaseDir = resolve(root, 'release');

if (!existsSync(distDir)) {
  console.error('✗ dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const { name, version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

mkdirSync(releaseDir, { recursive: true });

const zipName = `${name}-${version}.zip`;
const zipPath = resolve(releaseDir, zipName);

rmSync(zipPath, { force: true });
execSync(`zip -r -q "${zipPath}" .`, { cwd: distDir });

console.log(`✓ Packaged release/${zipName}`);
