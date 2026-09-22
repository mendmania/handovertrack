#!/usr/bin/env python3
"""Read-only preflight. Explicit kubeconfig; writes no credentials or raw ConfigMaps."""
import argparse, hashlib, json, socket, subprocess, time, urllib.request
from pathlib import Path
p=argparse.ArgumentParser(); p.add_argument('--kubeconfig',required=True); p.add_argument('--output',required=True)
p.add_argument('--existing-trial',action='store_true',help='Validate the already-active hostname instead of first-bootstrap absence')
a=p.parse_args(); k=['kubectl','--kubeconfig',a.kubeconfig,'--context','netcup-k3s-direct','--request-timeout=20s']
def get(*args): return json.loads(subprocess.check_output(k+list(args),text=True))
node=get('get','node','netcupmaniaserver','-o','json')
summary=get('get','--raw','/api/v1/nodes/netcupmaniaserver/proxy/stats/summary')['node']
edge=get('-n','edge-caddy','get','deployment','edge-caddy','-o','json')
vol=next(v for v in edge['spec']['template']['spec']['volumes'] if v['name']=='caddyfile')
cm=get('-n','edge-caddy','get','configmap',vol['configMap']['name'],'-o','json')
try: ips=sorted({x[4][0] for x in socket.getaddrinfo('handovertrack.com',443,type=socket.SOCK_STREAM)})
except socket.gaierror: ips=[]
health={}
for host in ['rruge.com','mendmania.com','typechars.com','virtualboardzone.com','tregubio.com']:
    r=subprocess.run(['curl','-sSIL','--max-time','15','-o','/dev/null','-w','%{http_code}','https://'+host],capture_output=True,text=True)
    health[host]=int(r.stdout) if r.returncode==0 else 'unreachable'
conds={x['type']:x['status'] for x in node['status']['conditions']}
pods=get('get','pods','-A','-o','json')['items']
def cpu(v): return int(v[:-1]) if v.endswith('m') else int(float(v)*1000)
cpu_requests=0
for pod in pods:
    if pod.get('status',{}).get('phase') in ['Succeeded','Failed']: continue
    spec=pod['spec']; containers=sum(cpu(c.get('resources',{}).get('requests',{}).get('cpu','0')) for c in spec['containers'])
    init=max([cpu(c.get('resources',{}).get('requests',{}).get('cpu','0')) for c in spec.get('initContainers',[])]+[0])
    cpu_requests+=max(containers,init)
checks={'node_ready':conds.get('Ready')=='True','no_pressure':all(conds.get(c)=='False' for c in ['MemoryPressure','DiskPressure','PIDPressure']),
        'disk_40GiB_spare':summary['fs']['availableBytes']>=40*1024**3,
        'inodes_1M_spare':summary['fs']['inodesFree']>=1000000,
        'memory_4GiB_spare':summary['memory']['availableBytes']>=4*1024**3,
        'cpu_1500m_schedulable':cpu(node['status']['allocatable']['cpu'])-cpu_requests>=1500,
        'dns_direct_origin':ips==['159.195.30.113'],
        'hostname_not_already_owned':'handovertrack.com' not in cm['data']['Caddyfile'],
        'existing_sites_healthy':all(v==200 for v in health.values())}
if a.existing_trial:
    del checks['hostname_not_already_owned']
    checks['trial_hostname_present']='handovertrack.com' in cm['data']['Caddyfile']
result={'at_unix':time.time(),'node':node['metadata']['name'],'architecture':node['status']['nodeInfo']['architecture'],
        'allocatable':node['status']['allocatable'],'cpu_requests_milli':cpu_requests,'node_fs':summary['fs'],'node_memory':summary['memory'],
        'dns':ips,'sites':health,'checks':checks,'edge_config':cm['metadata']['name'],
        'edge_sha256':hashlib.sha256(cm['data']['Caddyfile'].encode()).hexdigest(),
        'storage_classes':[{key:x.get(key) for key in ['provisioner','reclaimPolicy','volumeBindingMode']}|{'name':x['metadata']['name']} for x in get('get','sc','-o','json')['items']],
        'not_verified':['private registry/import access','target filesystem hardlink/fsync','decoder peak memory','independent backup and restore','native capture/upload','Cloudflare proxy mode and settings']}
Path(a.output).write_text(json.dumps(result,indent=2)+'\n'); print(json.dumps({'checks':checks,'report':a.output},indent=2))
raise SystemExit(0 if all(checks.values()) else 2)
