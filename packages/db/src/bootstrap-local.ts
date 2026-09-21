import pg from 'pg';
// Dedicated local Compose bootstrap only; never point this at shared infrastructure.
if (process.env.NODE_ENV === 'production' || !process.env.POSTGRES_PASSWORD || !process.env.MIGRATOR_PASSWORD || !process.env.RUNTIME_PASSWORD) throw new Error('Private local credentials required');
const client = new pg.Client({ host: '127.0.0.1', port: Number(process.env.POSTGRES_PORT ?? 55432), user: 'postgres', password: process.env.POSTGRES_PASSWORD, database: 'postgres' });
await client.connect();
try {
  for (const [role, password] of [['htrack_migrator', process.env.MIGRATOR_PASSWORD], ['htrack_runtime', process.env.RUNTIME_PASSWORD]] as const) {
    if (!(await client.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [role])).rowCount) {
      await client.query(`CREATE ROLE ${pg.escapeIdentifier(role)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD ${pg.escapeLiteral(password)}`);
    }
  }
  for (const database of ['handovertrack', 'handovertrack_test']) {
    if (!(await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [database])).rowCount) await client.query(`CREATE DATABASE ${pg.escapeIdentifier(database)} OWNER htrack_migrator`);
    await client.query(`REVOKE ALL ON DATABASE ${pg.escapeIdentifier(database)} FROM PUBLIC`);
    await client.query(`GRANT CONNECT ON DATABASE ${pg.escapeIdentifier(database)} TO htrack_runtime`);
  }
  console.log('Owned local databases and least-privilege roles ready; existing passwords preserved.');
} finally { await client.end(); }
