import { readServerConfig } from '@handovertrack/config/server';
import { createApp } from './app';
const config = readServerConfig(process.env);
const app = createApp(config);
await app.listen({ host: config.API_HOST, port: config.API_PORT });
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, async () => { await app.close(); process.exit(0); });
