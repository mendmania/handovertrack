'use client';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearProtectedQueries } from '@handovertrack/query';
import { authClient, fence } from '../../lib/browser';
import { announceAuthChange } from '../../lib/auth-change';
export default function SignIn() {
  const client = useQueryClient();
  const [error, setError] = useState(''); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError('');
    const data = new FormData(event.currentTarget);
    try {
      await clearProtectedQueries(client, fence);
      announceAuthChange();
      const result = await authClient.signIn.email({ email: String(data.get('email')), password: String(data.get('password')) });
      if (result.error) throw new Error(result.error.message ?? 'Sign-in failed');
      announceAuthChange();
      window.location.assign('/');
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to sign in'); setPending(false); }
  }
  return <main className="signin"><div className="brand">H<span>↗</span> HANDOVERTRACK</div><section className="card"><p className="eyebrow">YOUR CREW. YOUR PROJECTS.</p><h1>Welcome back.</h1><p className="muted">Sign in with your provisioned account to view your projects.</p><form onSubmit={submit}><label>Email<input required name="email" type="email" autoComplete="username" /></label><label>Password<input required name="password" type="password" autoComplete="current-password" /></label>{error && <p role="alert" className="error">{error}</p>}<button disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button></form><p className="footnote">Local trial · Accounts are provisioned by your operator.</p></section></main>;
}
