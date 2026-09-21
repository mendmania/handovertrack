'use client';
export const AUTH_CHANGE_KEY = 'handovertrack.auth-change';
export function announceAuthChange() {
  // No credentials or identity are broadcast. Other tabs hide protected content
  // and restart against the authoritative session before displaying it again.
  localStorage.setItem(AUTH_CHANGE_KEY, crypto.randomUUID());
}
