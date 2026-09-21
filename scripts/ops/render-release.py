#!/usr/bin/env python3
"""Materialize an immutable release from the reviewed, secret-free base."""
import argparse,hashlib,json,re
from pathlib import Path
p=argparse.ArgumentParser(); p.add_argument('--image',required=True); p.add_argument('--source',required=True); p.add_argument('--output',required=True); a=p.parse_args()
if not re.fullmatch(r'[a-z0-9./_-]+@sha256:[0-9a-f]{64}',a.image): p.error('an immutable repository@sha256 digest is required')
if not re.fullmatch(r'[0-9a-f]{40}',a.source): p.error('full source commit required; commit reviewed changes first')
root=Path(__file__).resolve().parents[2]; manifest=json.loads((root/'infra/kubernetes/base/resources.json').read_text())
contract={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted((root/'packages/db/migrations').glob('*.sql'))}
for x in manifest['items']:
    x['metadata'].setdefault('annotations',{})['handovertrack.com/source']=a.source
    if x['kind'] in ['Deployment','StatefulSet','Job']:
        t=x['spec']['template']; t['metadata'].setdefault('annotations',{})['handovertrack.com/source']=a.source
        for c in t['spec']['containers']:
            if c['image']=='handovertrack-runtime:render-only': c['image']=a.image
    if x['kind']=='Job': x['metadata']['name']='migrate-'+a.source[:12]
Path(a.output).write_text(json.dumps(manifest,indent=2)+'\n')
Path(a.output+'.release.json').write_text(json.dumps({'source':a.source,'image':a.image,'database_contract':contract,'data_policy':'disposable-only'},indent=2)+'\n')
print('Immutable release rendered; nothing applied.')
