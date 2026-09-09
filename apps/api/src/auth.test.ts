import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { tokenFor } from './auth.js';

test('tokenFor includes user id and role', () => {
  process.env.JWT_SECRET = 'unit-test-only-secret-with-at-least-32-bytes';
  const token = tokenFor({ id: '8f701a00-0000-4000-8000-000000000001', role: 'admin' });
  const payload = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
  assert.equal(payload.sub, '8f701a00-0000-4000-8000-000000000001');
  assert.equal(payload.role, 'admin');
});
