import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const targets = ['package.json', 'manifest.json'];
const bumpType = process.argv[2] ?? 'patch';

const bumpVersion = (version) => {
  const parts = version.split('.').map(Number);

  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    throw new Error(`Invalid semver version: ${version}`);
  }

  const [major, minor, patch] = parts;

  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Unknown bump type "${bumpType}". Use major, minor, or patch.`);
  }
};

const packagePath = resolve(root, 'package.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
const next = bumpVersion(pkg.version);

for (const target of targets) {
  const filePath = resolve(root, target);
  const json = JSON.parse(readFileSync(filePath, 'utf8'));
  json.version = next;
  writeFileSync(filePath, `${JSON.stringify(json, null, target === 'package.json' ? '\t' : 2)}\n`);
}

console.log(`Bumped version: ${pkg.version} -> ${next}`);
