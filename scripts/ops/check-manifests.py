#!/usr/bin/env python3
"""Safety invariants for deployment preparation; never substitutes for live checks."""
import copy,importlib.util,json,subprocess,tempfile
from pathlib import Path
root=Path(__file__).resolve().parents[2]
before=(root/'infra/kubernetes/base/resources.json').read_bytes()
subprocess.run(['python3',str(root/'scripts/ops/render.py')],check=True)
assert before==(root/'infra/kubernetes/base/resources.json').read_bytes(),'Regenerate committed base'
x=json.loads(before)['items']; index={(o['kind'],o['metadata']['name']):o for o in x}
assert len(index)==len(x)
for o in x:
    assert o['metadata']['labels']['app.kubernetes.io/part-of']=='handovertrack'
    assert o['metadata'].get('namespace','handovertrack')=='handovertrack'
    assert o['kind'] not in ['Secret','Ingress','ClusterRole','ClusterRoleBinding']
    if o['kind']=='Service': assert o['spec']['type']=='ClusterIP'
    if o['kind']=='StorageClass': assert o['reclaimPolicy']=='Retain'
    if o['kind'] in ['Deployment','Job','StatefulSet']:
        s=o['spec']['template']['spec']; assert s['automountServiceAccountToken'] is False
        assert s['securityContext']['runAsNonRoot'] and s['securityContext']['seccompProfile']['type']=='RuntimeDefault'
        assert s['nodeSelector']['kubernetes.io/hostname']=='netcupmaniaserver'
        assert not any(v.get('hostPath') for v in s['volumes'])
        for c in s['containers']:
            assert c['securityContext']['readOnlyRootFilesystem'] and not c['securityContext']['allowPrivilegeEscalation']
            assert c['securityContext']['capabilities']['drop']==['ALL']
            assert c['resources']['limits']['memory'] and c['resources']['requests']['cpu']
            keys=[v['name'] for v in c.get('env',[])]
            if o['kind']=='Deployment': assert 'MIGRATION_DATABASE_URL' not in keys and 'POSTGRES_PASSWORD' not in keys
            if o['metadata']['name']=='web': assert not keys
for name in ['api','worker']:
    s=index['Deployment',name]['spec']['template']['spec']
    assert any(v.get('persistentVolumeClaim',{}).get('claimName')=='media' for v in s['volumes'])
    assert any(v['mountPath']=='/media' for v in s['containers'][0]['volumeMounts'])
assert index['NetworkPolicy','default-deny']['spec']['ingress']==[]
assert index['NetworkPolicy','default-deny']['spec']['egress']==[]
assert index['ConfigMap','runtime']['data']['MEDIA_RESERVE_BYTES']=='21474836480'
spec=importlib.util.spec_from_file_location('release',root/'scripts/ops/release.py'); module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
o=copy.deepcopy(index['Deployment','api']); o['metadata']['resourceVersion']='123'; o['spec']['template']['spec']['containers'][0]['image']='local/handovertrack@sha256:'+'a'*64
patch=module.image_patch(o,'local/handovertrack@sha256:'+'b'*64,'c'*40)
assert [p['op'] for p in patch]==['test','test','replace','add']
assert not module.image_ok('local/handovertrack:latest')
o['metadata']['namespace']='rruge'
try: module.image_patch(o,'local/handovertrack@sha256:'+'b'*64,'c'*40); raise RuntimeError('Foreign resource accepted')
except AssertionError: pass
print('PASS: scope, storage, network, credential separation, resources and release concurrency invariants')
