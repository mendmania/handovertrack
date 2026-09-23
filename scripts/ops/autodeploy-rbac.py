#!/usr/bin/env python3
"""Render dedicated HandoverTrack operator permissions. No credentials in output."""
import json
NS = 'handovertrack'
LABELS = {'app.kubernetes.io/part-of': NS, 'app.kubernetes.io/managed-by': 'handovertrack-autodeploy'}


def resource(kind, name, namespace=None, **body):
    return {'apiVersion': 'v1' if kind in ('ServiceAccount', 'Secret') else 'rbac.authorization.k8s.io/v1',
            'kind': kind, 'metadata': {'name': name, 'labels': LABELS, **({'namespace':namespace} if namespace else {})}, **body}


def manifests():
    subject = [{'kind':'ServiceAccount','name':'autodeploy','namespace':NS}]
    objects = [resource('ServiceAccount','autodeploy',NS,automountServiceAccountToken=False),
        resource('Role','autodeploy',NS,rules=[
            {'apiGroups':['apps'],'resources':['deployments'],'resourceNames':['api','web','worker'],'verbs':['get','patch','watch']},
            {'apiGroups':['apps'],'resources':['deployments/scale'],'resourceNames':['api','web','worker'],'verbs':['get','update','patch']},
            {'apiGroups':[''],'resources':['pods'],'verbs':['get','list','watch','create','delete']},
            {'apiGroups':[''],'resources':['pods/exec'],'verbs':['create']},
            {'apiGroups':[''],'resources':['secrets'],'resourceNames':['database-admin','runtime','migration','auth','trial-accounts'],'verbs':['get']},
            {'apiGroups':[''],'resources':['configmaps'],'resourceNames':['runtime','database-init'],'verbs':['get']}]),
        resource('RoleBinding','autodeploy',NS,subjects=subject,roleRef={'apiGroup':'rbac.authorization.k8s.io','kind':'Role','name':'autodeploy'}),
        resource('ClusterRole','handovertrack-autodeploy-preflight',rules=[
            {'apiGroups':[''],'resources':['namespaces'],'resourceNames':[NS],'verbs':['get']},
            {'apiGroups':[''],'resources':['nodes','nodes/proxy'],'resourceNames':['netcupmaniaserver'],'verbs':['get']},
            {'apiGroups':[''],'resources':['pods'],'verbs':['list']},
            {'apiGroups':['storage.k8s.io'],'resources':['storageclasses'],'verbs':['list']}]),
        resource('ClusterRoleBinding','handovertrack-autodeploy-preflight',subjects=subject,roleRef={'apiGroup':'rbac.authorization.k8s.io','kind':'ClusterRole','name':'handovertrack-autodeploy-preflight'}),
        resource('Role','handovertrack-preflight','edge-caddy',rules=[
            {'apiGroups':['apps'],'resources':['deployments'],'resourceNames':['edge-caddy'],'verbs':['get']},
            {'apiGroups':[''],'resources':['configmaps'],'verbs':['get']}]),
        resource('RoleBinding','handovertrack-preflight','edge-caddy',subjects=subject,roleRef={'apiGroup':'rbac.authorization.k8s.io','kind':'Role','name':'handovertrack-preflight'})]
    token = resource('Secret','autodeploy-token',NS,type='kubernetes.io/service-account-token')
    token['metadata']['annotations'] = {'kubernetes.io/service-account.name':'autodeploy'}
    return {'apiVersion':'v1','kind':'List','items':objects + [token]}


if __name__ == '__main__':
    print(json.dumps(manifests(), indent=2))
