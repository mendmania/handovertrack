#!/bin/sh
# Runs only in this application's dedicated, empty PostgreSQL data directory.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  --set=migrator_password="$MIGRATOR_PASSWORD" --set=runtime_password="$RUNTIME_PASSWORD" <<'SQL'
CREATE ROLE htrack_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'migrator_password';
CREATE ROLE htrack_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'runtime_password';
CREATE DATABASE handovertrack OWNER htrack_migrator;
REVOKE ALL ON DATABASE handovertrack FROM PUBLIC;
GRANT CONNECT ON DATABASE handovertrack TO htrack_runtime;
SQL
