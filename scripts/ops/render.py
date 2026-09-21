#!/usr/bin/env python3
"""Render secret-free, application-owned Kustomize base. Never contacts Kubernetes."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
NS = 'handovertrack'
IMAGE = 'handovertrack-runtime:render-only'
POSTGRES = 'postgres:18.3@sha256:7e32e9833a6fb1c92c32552794cb6ed569d51b445a54907d35fc112ef39684db'
LABEL = {'app.kubernetes.io/part-of': NS}
resources = []
def obj(kind, name, spec=None, api='v1', namespace=NS, **extra):
    x = {'apiVersion': api, 'kind': kind, 'metadata': {'name': name, 'labels': LABEL.copy()}}
    if namespace: x['metadata']['namespace'] = namespace
    if spec is not None: x['spec'] = spec
    x.update(extra); resources.append(x); return x

def labels(component): return {**LABEL, 'app.kubernetes.io/component': component}
def secret(name, key): return {'name': key, 'valueFrom': {'secretKeyRef': {'name': name, 'key': key}}}
def peer(component, namespace=NS):
    return {'namespaceSelector': {'matchLabels': {'kubernetes.io/metadata.name': namespace}}, 'podSelector': {'matchLabels': labels(component)}}
def policy(name, component, ingress=(), egress=()):
    obj('NetworkPolicy', name, {'podSelector': {'matchLabels': labels(component) if component else {}}, 'policyTypes': ['Ingress','Egress'], 'ingress': list(ingress), 'egress': list(egress)}, 'networking.k8s.io/v1')
def traffic(peers, ports, direction): return {direction: peers, 'ports': [{'protocol':'TCP','port':p} for p in ports]}
def pod(component, command, memory='512Mi', cpu='500m', media=False):
    mounts = [{'name':'tmp','mountPath':'/tmp'}]
    volumes = [{'name':'tmp','emptyDir':{'sizeLimit':'128Mi'}}]
    if media:
        mounts.append({'name':'media','mountPath':'/media'})
        volumes.append({'name':'media','persistentVolumeClaim':{'claimName':'media'}})
    c = {'name': component, 'image': IMAGE, 'imagePullPolicy':'IfNotPresent', 'command':command,
         'securityContext':{'allowPrivilegeEscalation':False,'readOnlyRootFilesystem':True,'capabilities':{'drop':['ALL']}},
         'resources':{'requests':{'cpu':'100m','memory':'256Mi','ephemeral-storage':'128Mi'},'limits':{'cpu':cpu,'memory':memory,'ephemeral-storage':'512Mi'}},
         'volumeMounts':mounts, 'envFrom':[{'configMapRef':{'name':'runtime'}}]}
    return {'metadata':{'labels':labels(component)}, 'spec':{
        'automountServiceAccountToken':False, 'serviceAccountName':'runtime',
        'securityContext':{'runAsNonRoot':True,'runAsUser':1000,'runAsGroup':1000,'fsGroup':1000,'seccompProfile':{'type':'RuntimeDefault'}},
        'nodeSelector':{'kubernetes.io/hostname':'netcupmaniaserver'},
        'terminationGracePeriodSeconds':150, 'containers':[c], 'volumes':volumes}}

ns=obj('Namespace',NS,namespace=None)
ns['metadata']['labels'].update({'pod-security.kubernetes.io/enforce':'restricted','pod-security.kubernetes.io/enforce-version':'v1.35','handovertrack.com/data-policy':'disposable-only'})
obj('StorageClass','handovertrack-local-retain',api='storage.k8s.io/v1',namespace=None, provisioner='rancher.io/local-path',reclaimPolicy='Retain',volumeBindingMode='WaitForFirstConsumer')
obj('ServiceAccount','runtime',automountServiceAccountToken=False)
obj('ResourceQuota','trial-budget',{'hard':{'requests.cpu':'1500m','limits.cpu':'4','requests.memory':'2Gi','limits.memory':'4Gi','requests.storage':'16Gi','persistentvolumeclaims':'4','pods':'8','requests.ephemeral-storage':'2Gi','limits.ephemeral-storage':'4Gi'}})
for name,size in [('database','4Gi'),('media','4Gi')]:
    obj('PersistentVolumeClaim',name,{'accessModes':['ReadWriteOnce'],'storageClassName':'handovertrack-local-retain','resources':{'requests':{'storage':size}}})
obj('ConfigMap','runtime',data={
    'NODE_ENV':'production','AUTH_BASE_URL':'https://handovertrack.com','WEB_ORIGIN':'https://handovertrack.com',
    'NEXT_PUBLIC_WEB_ORIGIN':'https://handovertrack.com','API_HOST':'0.0.0.0','API_PORT':'3301','WEB_PORT':'3300',
    'API_INTERNAL_URL':'http://api:3301','MEDIA_ROOT':'/media','MEDIA_RESERVE_BYTES':'21474836480',
    'WORKER_POLL_MS':'2000','WORKER_LEASE_MS':'60000','WORKER_HEARTBEAT_MS':'30000', 'WORKER_HEARTBEAT_FILE':'/tmp/worker-heartbeat',
    'NODE_OPTIONS':'--max-old-space-size=256','UV_THREADPOOL_SIZE':'2','MALLOC_ARENA_MAX':'2'})
obj('ConfigMap','database-init',data={'init-db.sh':(ROOT/'scripts/ops/init-db.sh').read_text()})
for name,port in [('database',5432),('api',3301),('web',3300)]:
    obj('Service',name,{'type':'ClusterIP','selector':labels(name),'ports':[{'name':'tcp','port':port,'targetPort':port}]})
# PostgreSQL official image supports its known nonroot UID and a writable owned PGDATA.
t=pod('database',['docker-entrypoint.sh','postgres','-c','shared_buffers=128MB','-c','max_connections=40'],memory='512Mi')
s=t['spec']; s['securityContext'].update(runAsUser=999,runAsGroup=999,fsGroup=999)
c=s['containers'][0]; c['image']=POSTGRES; c.pop('envFrom'); c['envFrom']=[{'secretRef':{'name':'database-admin'}}]
c['env']=[{'name':'PGDATA','value':'/var/lib/postgresql/18/docker'},{'name':'POSTGRES_USER','value':'postgres'}]
s['volumes'] += [{'name':'database','persistentVolumeClaim':{'claimName':'database'}},{'name':'init','configMap':{'name':'database-init','defaultMode':365}},{'name':'socket','emptyDir':{'sizeLimit':'16Mi'}}]
c['volumeMounts'] += [{'name':'database','mountPath':'/var/lib/postgresql'},{'name':'init','mountPath':'/docker-entrypoint-initdb.d','readOnly':True},{'name':'socket','mountPath':'/var/run/postgresql'}]
c['readinessProbe']={'exec':{'command':['pg_isready','-U','postgres']},'periodSeconds':5}
c['startupProbe']={'exec':{'command':['pg_isready','-U','postgres']},'periodSeconds':5,'failureThreshold':60}
obj('StatefulSet','database',{'serviceName':'database','replicas':1,'selector':{'matchLabels':labels('database')},'template':t},'apps/v1')
for name,command in [('api',['node','apps/api/dist/main.js']),('worker',['node','apps/worker/dist/main.js']),('web',['node','apps/web/node_modules/next/dist/bin/next','start','apps/web','--hostname','0.0.0.0','--port','3300'])]:
    t=pod(name,command,memory='768Mi' if name!='web' else '512Mi',cpu='1000m' if name!='web' else '500m',media=name!='web')
    c=t['spec']['containers'][0]
    if name!='web': c['env']=[secret('runtime','DATABASE_URL'),secret('auth','AUTH_SECRET')]
    if name=='web':
        t['spec']['volumes'].append({'name':'next-cache','emptyDir':{'sizeLimit':'64Mi'}})
        c['volumeMounts'].append({'name':'next-cache','mountPath':'/app/apps/web/.next/cache'})
    if name in ['api','web']:
        c['readinessProbe']={'httpGet':{'path':'/health/ready' if name=='api' else '/sign-in','port':3301 if name=='api' else 3300},'periodSeconds':5}
        c['startupProbe']={**c['readinessProbe'],'failureThreshold':60}
        c['livenessProbe']={'httpGet':{'path':'/health/live' if name=='api' else '/sign-in','port':3301 if name=='api' else 3300},'periodSeconds':20,'failureThreshold':6}
    else:
        probe={'exec':{'command':['node','-e',"process.exit(Date.now()-Number(require('fs').readFileSync('/tmp/worker-heartbeat','utf8'))<120000?0:1)"]},'periodSeconds':30,'failureThreshold':3}
        c['livenessProbe']=probe; c['readinessProbe']=probe
        c['startupProbe']={**probe,'periodSeconds':5,'failureThreshold':30}
    obj('Deployment',name,{'replicas':1,'strategy':{'type':'Recreate'},'selector':{'matchLabels':labels(name)},'template':t},'apps/v1')
t=pod('migrate',['node','node_modules/tsx/dist/cli.mjs','packages/db/src/migrate.ts'])
t['spec']['restartPolicy']='Never'; t['spec']['containers'][0]['env']=[secret('migration','MIGRATION_DATABASE_URL')]
obj('Job','migrate',{'backoffLimit':0,'activeDeadlineSeconds':300,'template':t},'batch/v1')
policy('default-deny',None)
obj('NetworkPolicy','dns',{'podSelector':{},'policyTypes':['Egress'],'egress':[{'to':[{'namespaceSelector':{'matchLabels':{'kubernetes.io/metadata.name':'kube-system'}},'podSelector':{'matchLabels':{'k8s-app':'kube-dns'}}}],'ports':[{'port':53,'protocol':p} for p in ['UDP','TCP']]}]},'networking.k8s.io/v1')
edge={'namespaceSelector':{'matchLabels':{'kubernetes.io/metadata.name':'edge-caddy'}},'podSelector':{'matchLabels':{'app.kubernetes.io/name':'edge-caddy','app.kubernetes.io/component':'edge'}}}
policy('database','database',[traffic([peer(c) for c in ['api','worker','migrate','provision','backup']], [5432],'from')])
policy('api','api',[traffic([edge,peer('web')],[3301],'from')],[traffic([peer('database')],[5432],'to')])
policy('web','web',[traffic([edge],[3300],'from')],[traffic([peer('api')],[3301],'to')])
for role in ['worker','migrate','provision','backup']: policy(role,role,egress=[traffic([peer('database')],[5432],'to')])
# Edge addition is separate and never applied with the application base.
edge_policy={'apiVersion':'networking.k8s.io/v1','kind':'NetworkPolicy','metadata':{'name':'handovertrack-egress','namespace':'edge-caddy','labels':LABEL},'spec':{'podSelector':edge['podSelector'],'policyTypes':['Egress'],'egress':[traffic([peer('api')],[3301],'to'),traffic([peer('web')],[3300],'to')]}}
(ROOT/'infra/edge/network-policy.json').write_text(json.dumps(edge_policy,indent=2)+'\n')
(ROOT/'infra/kubernetes/base/resources.json').write_text(json.dumps({'apiVersion':'v1','kind':'List','items':resources},indent=2)+'\n')
print(f'Rendered {len(resources)} owned resources; no cluster changes.')
