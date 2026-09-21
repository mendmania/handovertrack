'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Me, Scope } from '@handovertrack/contracts';
import { clearProtectedQueries, projectListOptions, projectDetailOptions } from '@handovertrack/query';
import { api, authClient, fence, fenced } from '../lib/browser';
import { announceAuthChange } from '../lib/auth-change';
import { Assignments, ProjectEditor } from './project-commands';

export function ProjectScreen({ me, scope, projectId }: { me: Me; scope: Scope; projectId?: string }) {
  const client = useQueryClient();
  const [leaving, setLeaving] = useState(false); const [error, setError] = useState('');
  const membership = me.memberships.find((item) => item.organizationId === scope.organizationId);
  async function leave(destination: string, logout = false) {
    setLeaving(true); setError('');
    await clearProtectedQueries(client, fence);
    if (logout) announceAuthChange();
    try {
      if (logout) { const result = await authClient.signOut(); if (result.error) throw new Error('Sign out failed. Try again while connected.'); announceAuthChange(); }
      window.location.assign(destination);
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to leave account'); }
  }
  if (leaving) return <main className="card"><p>{error || 'Closing this project session…'}</p>{error && <button onClick={() => void leave('/sign-in', true)}>Retry sign out</button>}</main>;
  const manager = membership?.role === 'manager';
  return <><header><Link href="/" className="brand">H<span>↗</span> HANDOVERTRACK</Link><div className="account"><span>{me.name}</span><button className="secondary" onClick={() => void leave('/sign-in', true)}>Sign out</button></div></header><main className="workspace"><div className="toolbar"><div><p className="eyebrow">PROJECT WORKSPACE</p><h1>{membership?.organizationName}</h1><p className="muted">{manager ? 'Manage projects and your field crew' : 'Your assigned projects · Read only'}</p></div><label className="org-select">Organization<select aria-label="Organization" value={scope.organizationId} onChange={(event) => void leave(`/org/${event.target.value}/projects`)}>{me.memberships.map((item) => <option key={item.organizationId} value={item.organizationId}>{item.organizationName}</option>)}</select></label></div>{projectId ? <Detail key={projectId} scope={scope} id={projectId} manager={manager} /> : <List scope={scope} manager={manager} />}</main></>;
}
function Failure({ error, retry }: { error: Error; retry: () => void }) {
  return <section className="card" role="alert"><h2>Projects unavailable</h2><p>{error.message}</p><button onClick={retry}>Try again</button> <Link href="/">Check account access</Link></section>;
}
function List({ scope, manager }: { scope: Scope; manager: boolean }) {
  const [creating, setCreating] = useState(false);
  const [saved, setSaved] = useState('');
  const query = useQuery(projectListOptions(scope, 'api', fenced((signal) => api.list(scope, signal))));
  if (query.error) return <Failure error={query.error} retry={() => void query.refetch()} />;
  if (!query.data) return <p role="status">Loading projects…</p>;
  return <section><div className="section-title"><h2>Projects <span className="count">{query.data.length}</span></h2><div className="form-actions"><button className="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}>{query.isFetching ? 'Refreshing…' : 'Refresh'}</button>{manager && !creating && <button onClick={() => { setSaved(''); setCreating(true); }}>New project</button>}</div></div>{saved && <p role="status" className="success">Project created: {saved}</p>}{creating && <ProjectEditor scope={scope} onCancel={() => setCreating(false)} onSaved={(project) => { setCreating(false); setSaved(project.name); }} />}{query.data.length === 0 ? <div className="card"><h3>No projects available</h3><p>{manager ? 'Create a project to get your crew started.' : 'Your assigned projects will appear here.'}</p></div> : <div className="projects">{query.data.map((project) => <Link prefetch={false} className="project card" key={project.id} href={`/org/${scope.organizationId}/projects/${project.id}`}><div className="project-mark">↗</div><span className="status">{project.status}</span><h3>{project.name}</h3><p>{project.address}</p><span className="open">View project →</span></Link>)}</div>}</section>;
}
function Detail({ scope, id, manager }: { scope: Scope; id: string; manager: boolean }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const query = useQuery(projectDetailOptions(scope, 'api', id, fenced((signal) => api.detail(scope, id, signal))));
  if (query.error) return <Failure error={query.error} retry={() => void query.refetch()} />;
  if (!query.data) return <p role="status">Loading project…</p>;
  const project = query.data;
  return <><Link href={`/org/${scope.organizationId}/projects`}>← All projects</Link>{saved && <p role="status" className="success">Project saved.</p>}<article className="card detail"><div className="section-title"><span className="status">{project.status}</span>{manager && !editing && <button className="secondary" onClick={() => { setSaved(false); setEditing(true); }}>Edit project</button>}</div><h2>{project.name}</h2><p className="address">{project.address}</p><hr /><h3>Project overview</h3><p>{project.description}</p><p className="footnote">Updated {new Date(project.updatedAt).toISOString().slice(0, 10)} · Version {project.version}</p></article>{manager && editing && <ProjectEditor scope={scope} project={project} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); setSaved(true); }} />}{manager && <Assignments scope={scope} projectId={id} />}</>;
}
