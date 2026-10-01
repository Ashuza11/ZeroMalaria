import { describe, expect, it } from 'vitest';
import { verifyPassword } from '../src/auth';

const DEMO_HASH =
  'pbkdf2$zeromalaria-demo-2026$635be184cd7954b4f28f64c037453a1c85d00c7e6e864c2be4afb3d8c6e30365';

describe('Worker password verification', () => {
  it('accepts the seeded demo password', async () => {
    await expect(verifyPassword('demo1234', DEMO_HASH)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    await expect(verifyPassword('wrong-password', DEMO_HASH)).resolves.toBe(false);
  });
});
