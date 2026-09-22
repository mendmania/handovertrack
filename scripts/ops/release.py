#!/usr/bin/env python3
"""Fixed server-side controller for schema-compatible application image releases.
Default: check-only. Install deliberately on the host; never execute freshly pulled scripts.
No schema, Secret, edge, PVC, StatefulSet or other namespace mutations are possible.
"""
import argparse,fcntl,json,os,re,stat,subprocess
import time
from pathlib import Path
NS='handovertrack'; COMPONENTS=('web','api','worker')
def image_ok(value): return bool(re.fullmatch(r'[a-z0-9./_-]+@sha256:[0-9a-f]{64}',value))
def image_patch(obj, image, source):
    assert obj['metadata']['namespace']==NS
    assert obj['metadata']['labels']['app.kubernetes.io/part-of']==NS
    c=obj['spec']['template']['spec']['containers']; assert len(c)==1
    assert image_ok(c[0]['image']) and image_ok(image)
    annotations=obj['spec']['template']['metadata'].get('annotations',{}).copy()
    annotations['handovertrack.com/source']=source
    return [{'op':'test','path':'/metadata/resourceVersion','value':obj['metadata']['resourceVersion']},
            {'op':'test','path':'/spec/template/spec/containers/0/image','value':c[0]['image']},
            {'op':'replace','path':'/spec/template/spec/containers/0/image','value':image},
            {'op':'add','path':'/spec/template/metadata/annotations','value':annotations}]
def main():
    # Assertions below are deployment guards, so optimized Python must fail closed.
    if not __debug__: raise SystemExit('Run without -O: release safety guards require assertions')
    p=argparse.ArgumentParser(); p.add_argument('--kubeconfig',required=True); p.add_argument('--candidate',required=True)
    p.add_argument('--policy',required=True); p.add_argument('--runtime',required=True); p.add_argument('--apply',action='store_true'); a=p.parse_args()
    policy_path=Path(a.policy)
    policy_stat=policy_path.stat()
    assert stat.S_ISREG(policy_stat.st_mode) and policy_stat.st_uid==os.geteuid(), 'Policy must be an operator-owned regular file'
    assert policy_stat.st_mode & 0o077 == 0, 'Policy must be owner-only (mode 0600)'
    candidate=json.loads(Path(a.candidate).read_text()); policy=json.loads(policy_path.read_text())
    assert policy['namespace']==NS and policy['data_policy']=='disposable-only'
    assert image_ok(candidate['image']) and re.fullmatch('[0-9a-f]{40}',candidate['source'])
    assert candidate['database_contract']==policy['database_contract'],'Schema change requires explicit migration maintenance'
    assert candidate['source']==policy['approved_source'] and candidate['image']==policy['approved_image'],'Exact reviewed candidate required'
    # The policy records a verified publication/import receipt; no package visibility changes.
    assert policy['artifact_verified'] is True
    state=Path(a.runtime); state.mkdir(mode=0o700,parents=True,exist_ok=True)
    with open(state/'release.lock','a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        k=['kubectl','--kubeconfig',a.kubeconfig,'--context','netcup-k3s-direct','-n',NS,'--request-timeout=30s']
        def run(args): return subprocess.check_output(k+args,text=True)
        ns=json.loads(run(['get','namespace',NS,'-o','json']))
        assert ns['metadata']['labels']['handovertrack.com/data-policy']=='disposable-only'
        applied=json.loads(run(['exec','database-0','--','psql','-U','postgres','-d','handovertrack','-At','-c',"SELECT coalesce(json_object_agg(name,checksum),'{}'::json) FROM schema_migrations"]))
        assert applied==candidate['database_contract'], 'Live schema contract differs; explicit migration review required'
        before={n:json.loads(run(['get','deployment',n,'-o','json'])) for n in COMPONENTS}
        assert all(x['spec']['replicas']==1 and x['status'].get('availableReplicas')==1 for x in before.values())
        patches={n:image_patch(o,candidate['image'],candidate['source']) for n,o in before.items()}
        for n,patch in patches.items(): run(['patch','deployment',n,'--type=json','-p',json.dumps(patch),'--dry-run=server'])
        if not a.apply: print('Eligible schema-compatible candidate; server dry-runs passed. No mutation.'); return
        # Review same-day preflight and consistent backup before each application maintenance window.
        evidence=json.loads(Path(policy['preflight_file']).read_text())
        assert 0<=time.time()-evidence['at_unix']<900
        assert all(evidence['checks'][n] for n in ['node_ready','no_pressure','disk_40GiB_spare','inodes_1M_spare','memory_4GiB_spare','cpu_1500m_schedulable','dns_direct_origin','existing_sites_healthy'])
        backup=json.loads(Path(policy['backup_receipt']).read_text())
        assert backup['namespace']==NS and backup['consistent'] is True and backup['hashes_verified'] is True
        assert 0<=time.time()-backup['at_unix']<3600
        assert backup['image']==before['api']['spec']['template']['spec']['containers'][0]['image']
        # For disposable-only data an on-node recovery copy is permitted; never claim DR from it.
        receipt={'at_unix':time.time(),'candidate':candidate,'before':before,'status':'applying','applied':[]}
        def save():
            temp=state/'release.tmp'; temp.write_text(json.dumps(receipt,indent=2)); os.chmod(temp,0o600); os.replace(temp,state/'release.json')
        save()
        try:
            # Recreate is deliberate, bounded application-only downtime. Patches retain config and replicas.
            for n in ('worker','api','web'):
                run(['patch','deployment',n,'--type=json','-p',json.dumps(patches[n])]); receipt['applied'].append(n); save()
                run(['rollout','status','deployment/'+n,'--timeout=180s'])
            receipt['status']='awaiting-https-smoke'; save()
            print('Owned image rollout healthy; run HTTPS/auth/media smoke before recording PASS.')
        except Exception:
            receipt['status']='failed-needs-review'; save()
            raise SystemExit('Release failed. Current/previous images retained in private receipt; no data restore or automatic rollback.')
if __name__=='__main__': main()
