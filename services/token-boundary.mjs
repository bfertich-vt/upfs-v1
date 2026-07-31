/** Verify a bearer token before any tenant or organization scope is used. */
export async function verifyBearerToken(authorization, { verify } = {}) {
  if (typeof authorization !== 'string' || !/^Bearer\s+\S+$/i.test(authorization)) {
    return { status: 401, body: { code: 'authentication_required' } };
  }
  if (typeof verify !== 'function') return { status: 401, body: { code: 'authentication_required' } };
  const token = authorization.replace(/^Bearer\s+/i, '');
  try {
    const actor = await verify(token);
    if (!actor?.issuer || !actor?.subject) throw new Error('invalid token claims');
    return { status: 200, actor };
  } catch {
    return { status: 401, body: { code: 'authentication_required' } };
  }
}
