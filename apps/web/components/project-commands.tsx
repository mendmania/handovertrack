'use client';
import { useId, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiError, type Assignment, type Project, type Scope, type Worker } from '@handovertrack/contracts';
import { projectKeys, scopeKey } from '@handovertrack/query';
import { api, fence, fenced } from '../lib/browser';

type ProjectFields = Pick<Project, 'name' | 'description' | 'address' | 'status'>;
const assignmentKey = (scope: Scope, projectId: string) => [...scopeKey(scope), 'api', 'assignments', projectId] as const;
const workerKey = (scope: Scope) => [...scopeKey(scope), 'api', 'workers'] as const;
function fields(project?: Project): ProjectFields {
  return project ? { name: project.name, description: project.description, address: project.address, status: project.status } : { name: '', description: '', address: '', status: 'active' };
}

// Keep a command's key for an unchanged retry, including a lost success response.
// A consciously changed payload (including a reviewed conflict version) is a
// different command and must have a new key.
function useCommandKey() {
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  return (payload: unknown) => {
    const serialized = JSON.stringify(payload);
    if (attempt.current?.payload !== serialized) attempt.current = { payload: serialized, key: crypto.randomUUID() };
    return attempt.current.key;
  };
}
async function refreshProjects(client: QueryClient, scope: Scope, guard: () => void, projectId?: string) {
  guard();
  await client.cancelQueries({ queryKey: projectKeys.all(scope, 'api') });
  if (projectId) await client.cancelQueries({ queryKey: assignmentKey(scope, projectId) });
  guard();
  await Promise.all([
    client.invalidateQueries({ queryKey: projectKeys.all(scope, 'api') }),
    ...(projectId ? [client.invalidateQueries({ queryKey: assignmentKey(scope, projectId) })] : []),
  ]);
  guard();
}

export function ProjectEditor({ scope, project, onSaved, onCancel }: { scope: Scope; project?: Project; onSaved: (project: Project) => void; onCancel: () => void }) {
  const formId = useId();
  const client = useQueryClient();
  const [values, setValues] = useState(() => fields(project));
  const [baseVersion, setBaseVersion] = useState(project?.version);
  const [conflict, setConflict] = useState<Project | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const commandKey = useCommandKey();
  const mutation = useMutation({
    // Web commands are explicit online attempts, never an offline queue that
    // could resume after the shared cookie has changed accounts.
    networkMode: 'always', retry: false,
    mutationFn: async () => {
      const guard = fence.capture(); guard();
      const input = project ? { ...values, baseVersion: baseVersion! } : values;
      const key = commandKey(input);
      const saved = project ? await api.updateProject(scope, project.id, { ...values, baseVersion: baseVersion! }, key) : await api.createProject(scope, values, key);
      guard();
      await refreshProjects(client, scope, guard, saved.id);
      return saved;
    },
    onSuccess: (saved) => onSaved(saved),
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'VERSION_CONFLICT' && error.current && 'name' in error.current) setConflict(error.current);
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!conflict) mutation.mutate(); }
  return <section className="card editor" aria-label={project ? 'Edit project' : 'New project'}>
    <h2>{project ? 'Edit project' : 'New project'}</h2>
    <p className="muted">{project ? 'Update the details your crew sees in the field.' : 'Create a project, then choose the workers who can access it.'}</p>
    <form onSubmit={submit}>
      <fieldset disabled={mutation.isPending}>
        <label htmlFor={`${formId}-name`}>Project name</label><input id={`${formId}-name`} required maxLength={200} value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} />
        <label htmlFor={`${formId}-address`}>Address</label><input id={`${formId}-address`} maxLength={500} value={values.address} onChange={(event) => setValues({ ...values, address: event.target.value })} />
        <label htmlFor={`${formId}-description`}>Description</label><textarea id={`${formId}-description`} maxLength={4000} rows={4} value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} />
        <label htmlFor={`${formId}-status`}>Status</label><select id={`${formId}-status`} value={values.status} onChange={(event) => setValues({ ...values, status: event.target.value as Project['status'] })}><option value="active">Active</option><option value="complete">Complete</option></select>
      </fieldset>
      {conflict ? <div className="conflict" role="alert">
        <h3>This project changed while you were editing.</h3>
        <p>Your entries are preserved. Review the latest saved details before choosing to save your changes over them.</p>
        <dl aria-label="Latest saved project"><dt>Name</dt><dd>{conflict.name}</dd><dt>Address</dt><dd>{conflict.address}</dd><dt>Description</dt><dd>{conflict.description}</dd><dt>Status</dt><dd>{conflict.status}</dd></dl>
        <button type="button" className="secondary" onClick={() => { setBaseVersion(conflict.version); setConflict(null); setReviewed(true); mutation.reset(); }}>Keep my changes on latest version</button>
      </div> : mutation.error && mutation.error.name !== 'AbortError' ? <p className="error" role="alert">{mutation.error.message} Your entries are preserved. Retry with the same entries to recover this command safely.</p> : null}
      {reviewed && !conflict && <p className="muted" role="status">Your entries are ready to save over the version you reviewed.</p>}
      <div className="form-actions"><button type="submit" disabled={mutation.isPending || !!conflict}>{mutation.isPending ? 'Saving…' : project ? 'Save project' : 'Create project'}</button><button type="button" className="secondary" disabled={mutation.isPending} onClick={onCancel}>Cancel</button></div>
    </form>
  </section>;
}

export function Assignments({ scope, projectId }: { scope: Scope; projectId: string }) {
  const workers = useQuery({ queryKey: workerKey(scope), queryFn: ({ signal }) => fenced((inner) => api.workers(scope, inner))(signal) });
  const assignments = useQuery({ queryKey: assignmentKey(scope, projectId), queryFn: ({ signal }) => fenced((inner) => api.assignments(scope, projectId, inner))(signal) });
  if (workers.error || assignments.error) return <section className="card assignments"><h2>Assigned workers</h2><p className="error" role="alert">Unable to load assignments. {(workers.error ?? assignments.error)?.message}</p><button className="secondary" onClick={() => { void workers.refetch(); void assignments.refetch(); }}>Retry assignments</button></section>;
  return <section className="card assignments"><h2>Assigned workers</h2><p className="muted">Assigned workers can download this project. Removing access takes effect when their device reconnects.</p>
    {!workers.data || !assignments.data ? <p role="status">Loading workers…</p> : workers.data.length === 0 ? <p>No field workers belong to this organization.</p> : <ul className="worker-list">{workers.data.map((worker) => <AssignmentRow key={worker.accountId} scope={scope} projectId={projectId} worker={worker} assignment={assignments.data.find((item) => item.accountId === worker.accountId)} />)}</ul>}
  </section>;
}
function AssignmentRow({ scope, projectId, worker, assignment }: { scope: Scope; projectId: string; worker: Worker; assignment?: Assignment }) {
  const client = useQueryClient();
  const commandKey = useCommandKey();
  const [conflict, setConflict] = useState<{ current: Assignment; desired: boolean } | null>(null);
  const [message, setMessage] = useState('');
  const mutation = useMutation({
    networkMode: 'always', retry: false,
    mutationFn: async (input: { active: boolean; baseVersion: number }) => {
      const guard = fence.capture(); guard();
      const saved = await api.setAssignment(scope, projectId, worker.accountId, input, commandKey(input));
      guard(); await refreshProjects(client, scope, guard, projectId);
      return saved;
    },
    onSuccess: (saved) => { setConflict(null); setMessage(saved.active ? `${worker.name} assigned.` : `${worker.name} removed.`); },
    onError: (error, input) => {
      setMessage('');
      if (error instanceof ApiError && error.code === 'VERSION_CONFLICT' && error.current && 'active' in error.current) setConflict({ current: error.current, desired: input.active });
    },
  });
  return <li className="worker-row"><div className="worker-control"><div><strong>{worker.name}</strong><span className="muted">{assignment?.active ? 'Assigned' : 'Not assigned'}</span></div><button className="secondary" disabled={mutation.isPending || !!conflict || mutation.isError} aria-label={`${assignment?.active ? 'Remove' : 'Assign'} ${worker.name}`} onClick={() => { setMessage(''); mutation.mutate({ active: !assignment?.active, baseVersion: assignment?.version ?? 0 }); }}>{mutation.isPending ? 'Saving…' : assignment?.active ? 'Remove' : 'Assign'}</button></div>
    {message && <p role="status" className="success">{message}</p>}
    {conflict ? <div className="conflict" role="alert"><p>This assignment changed. {worker.name} is currently {conflict.current.active ? 'assigned' : 'not assigned'}. Your requested action is to {conflict.desired ? 'assign' : 'remove'} this worker.</p><button type="button" className="secondary" onClick={() => { const input = { active: conflict.desired, baseVersion: conflict.current.version }; setConflict(null); mutation.mutate(input); }}>Retry requested assignment change</button><button type="button" className="secondary" onClick={() => { setConflict(null); mutation.reset(); void client.invalidateQueries({ queryKey: assignmentKey(scope, projectId) }); }}>Keep current assignment</button></div> : mutation.error && mutation.error.name !== 'AbortError' ? <div role="alert"><p className="error">{mutation.error.message} Your requested action is preserved.</p><button className="secondary" onClick={() => { if (mutation.variables) mutation.mutate(mutation.variables); }}>Retry assignment change</button></div> : null}
  </li>;
}
