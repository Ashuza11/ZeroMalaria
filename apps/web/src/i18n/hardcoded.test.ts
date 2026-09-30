import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('no TODO_REVIEW_RW in critical UI sources', () => {
  const files = [
    join(root, 'components/ui/index.tsx'),
    join(root, 'pages/LoginPage.tsx'),
  ];

  for (const file of files) {
    it(file.replace(/\\/g, '/').split('/src/')[1] ?? file, () => {
      const src = readFileSync(file, 'utf8');
      expect(src.includes('TODO_REVIEW_RW')).toBe(false);
    });
  }
});
