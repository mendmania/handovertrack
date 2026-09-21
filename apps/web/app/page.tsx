import { redirect } from 'next/navigation';
import { getIdentity } from '../lib/server';
export default async function Home() {
  const me = await getIdentity();
  if (me.memberships[0]) redirect(`/org/${me.memberships[0].organizationId}/projects`);
  return <main className="card"><h1>No organization access</h1><p>Your operator needs to provision a membership.</p><a href="/sign-in">Return to sign in</a></main>;
}
