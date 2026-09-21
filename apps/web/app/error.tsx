'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="card"><h1>Unable to load this workspace</h1><p>Check the API connection and try again.</p><button onClick={reset}>Try again</button></main>;
}
