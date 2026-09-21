import type { NextConfig } from 'next';
const config: NextConfig = {
  transpilePackages: ['@handovertrack/contracts', '@handovertrack/query', '@handovertrack/config'],
  poweredByHeader: false,
};
export default config;
