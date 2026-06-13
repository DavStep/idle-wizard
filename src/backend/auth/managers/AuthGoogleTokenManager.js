const TOKEN_EXPIRY_SKEW_MS = 60 * 1000;

export class AuthGoogleTokenManager {
  constructor({
    clientId,
    atob = (value) => globalThis.atob(value),
    now = () => Date.now(),
    expirySkewMs = TOKEN_EXPIRY_SKEW_MS,
  } = {}) {
    this.clientId = clientId;
    this.atob = atob;
    this.now = now;
    this.expirySkewMs = expirySkewMs;
  }

  validateIdToken(token, { expectedNonce } = {}) {
    const profile = this.decodeJwtPayload(token);
    if (!profile?.sub) {
      throw new Error('Google login returned an invalid identity token.');
    }

    if (this.isTokenExpired(this.getJwtExpiresAt(token))) {
      throw new Error('Google login returned an expired identity token.');
    }

    if (!this.isExpectedAudience(profile.aud ?? profile.azp)) {
      throw new Error('Google login returned a token for another client.');
    }

    if (expectedNonce && profile.nonce !== expectedNonce) {
      throw new Error('Google login returned a token with an invalid nonce.');
    }

    return profile;
  }

  decodeJwtPayload(token) {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }

    try {
      return JSON.parse(this.decodeBase64Url(payload));
    } catch {
      return null;
    }
  }

  getJwtExpiresAt(token) {
    const expiresAtSeconds = Number(this.decodeJwtPayload(token)?.exp);
    return Number.isFinite(expiresAtSeconds) ? expiresAtSeconds * 1000 : null;
  }

  decodeBase64Url(value) {
    const base64 = value
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(value.length / 4) * 4, '=');
    return this.atob(base64);
  }

  isTokenExpired(expiresAt) {
    return !Number.isFinite(expiresAt) || this.now() + this.expirySkewMs >= expiresAt;
  }

  hasFreshUserToken(user) {
    return Boolean(user?.id_token && !this.isTokenExpired(user.expires_at));
  }

  isExpectedAudience(audience) {
    if (Array.isArray(audience)) {
      return audience.includes(this.clientId);
    }

    return audience === this.clientId;
  }
}
