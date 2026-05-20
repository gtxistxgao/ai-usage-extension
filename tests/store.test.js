/**
 * Release-gate tests for the `store/` directory.
 *
 * These run on `npm test` (and therefore on `npm run release`, which depends
 * on them). They enforce that everything we paste into the Chrome Web Store
 * submission form lives in version control and stays in sync with the
 * manifest.
 *
 * If you add a permission or host_permission to manifest.json, you MUST add
 * a matching `## ` heading to store/permissions.md or these tests will fail.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const read = (relPath) => readFileSync(resolve(root, relPath), 'utf8');

const headings = (markdown) =>
  markdown
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.replace(/^##\s+/, '').trim());

const sectionBody = (markdown, heading) => {
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start === -1) return '';
  const end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim();
};

const manifest = JSON.parse(read('manifest.json'));

const hostHeading = (host) => `host: ${host}`;

const expectedPermissionHeadings = [
  ...(manifest.permissions ?? []),
  ...((manifest.host_permissions ?? []).map(hostHeading)),
];

const CHROME_SHORT_DESCRIPTION_MAX = 132;
const SEO_FULL_DESCRIPTION_MIN = 600;
const PERMISSION_RATIONALE_MIN = 60;

describe('store/listing.md', () => {
  const path = 'store/listing.md';

  it('exists', () => {
    assert.ok(existsSync(resolve(root, path)), `${path} is missing`);
  });

  const listing = read(path);
  const present = new Set(headings(listing));

  for (const required of ['Name', 'Short Description', 'Full Description', 'Keywords', 'Single Purpose']) {
    it(`has the "## ${required}" section`, () => {
      assert.ok(
        present.has(required),
        `${path} must contain a "## ${required}" heading`,
      );
    });
  }

  it('Name is a single non-empty line', () => {
    const body = sectionBody(listing, 'Name');
    assert.notEqual(body.length, 0, 'Name section is empty');
    assert.ok(!body.includes('\n\n'), 'Name section should be a single line');
  });

  it(`Short Description fits in ${CHROME_SHORT_DESCRIPTION_MAX} characters`, () => {
    const body = sectionBody(listing, 'Short Description');
    assert.notEqual(body.length, 0, 'Short Description is empty');
    assert.ok(
      body.length <= CHROME_SHORT_DESCRIPTION_MAX,
      `Short Description is ${body.length} chars, max is ${CHROME_SHORT_DESCRIPTION_MAX}`,
    );
  });

  it(`Full Description is SEO-substantial (>= ${SEO_FULL_DESCRIPTION_MIN} chars)`, () => {
    const body = sectionBody(listing, 'Full Description');
    assert.ok(
      body.length >= SEO_FULL_DESCRIPTION_MIN,
      `Full Description is only ${body.length} chars; aim for >=${SEO_FULL_DESCRIPTION_MIN} for SEO`,
    );
  });

  it('Keywords lists at least 5 search terms', () => {
    const body = sectionBody(listing, 'Keywords');
    const terms = body
      .replace(/\s+/g, ' ')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    assert.ok(terms.length >= 5, `Keywords has only ${terms.length} terms (need >= 5)`);
  });
});

describe('store/permissions.md', () => {
  const path = 'store/permissions.md';

  it('exists', () => {
    assert.ok(existsSync(resolve(root, path)), `${path} is missing`);
  });

  const perms = read(path);
  const documented = new Set(headings(perms));

  for (const required of expectedPermissionHeadings) {
    it(`documents "${required}" from manifest.json`, () => {
      assert.ok(
        documented.has(required),
        `${path} is missing a "## ${required}" section. Every manifest permission and host_permission must be justified.`,
      );

      const body = sectionBody(perms, required);
      assert.ok(
        body.length >= PERMISSION_RATIONALE_MIN,
        `Rationale for "${required}" is only ${body.length} chars; write at least ${PERMISSION_RATIONALE_MIN} explaining why the extension needs it.`,
      );
    });
  }

  it('does not document permissions that the manifest no longer requests', () => {
    const expected = new Set(expectedPermissionHeadings);
    const stray = [...documented].filter((h) => !expected.has(h));
    assert.deepEqual(
      stray,
      [],
      `permissions.md documents headings that aren't in manifest.json: ${stray.join(', ')}`,
    );
  });
});

describe('store/promo/', () => {
  const promoDir = resolve(root, 'store/promo');

  it('directory exists', () => {
    assert.ok(existsSync(promoDir), 'store/promo/ is missing');
  });

  it('has the README that explains required assets', () => {
    assert.ok(existsSync(resolve(promoDir, 'README.md')), 'store/promo/README.md is missing');
  });

  // Required image assets — small/marquee tiles are optional in the README and
  // therefore not enforced. Add to this list once they are required.
  const requiredAssets = ['icon-128.png', 'screenshot-1.png', 'screenshot-2.png'];

  for (const asset of requiredAssets) {
    it(`has ${asset}`, () => {
      const p = resolve(promoDir, asset);
      assert.ok(existsSync(p), `store/promo/${asset} is missing`);
      assert.ok(statSync(p).size > 0, `store/promo/${asset} is empty`);
    });
  }
});
