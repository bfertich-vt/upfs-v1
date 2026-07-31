/** Deny-by-default boundary; a real OIDC verifier is injected at composition time. */
export function verifyToken(token, verifier) {
  if (typeof token !== 'string' || token.length === 0 || typeof verifier !== 'function') return { ok: false, reason: 'authentication_required' };
  const claims = verifier(token);
  if (!claims?.issuer || !claims.subject) return { ok: false, reason: 'invalid_token' };
  return { ok: true, claims };
}
