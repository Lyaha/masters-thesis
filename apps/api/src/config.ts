export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32 || /development-only|replace-this/i.test(secret)) {
    throw new Error('JWT_SECRET must contain at least 32 bytes of random secret data');
  }
  return secret;
}
