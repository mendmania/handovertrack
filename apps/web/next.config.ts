import type { NextConfig } from 'next';
const config: NextConfig = {
  transpilePackages: ['@handovertrack/contracts', '@handovertrack/query', '@handovertrack/config'],
  poweredByHeader: false,
  async headers(){return [{source:'/share/:path*',headers:[{key:'Referrer-Policy',value:'no-referrer'},{key:'Cache-Control',value:'private, no-store'},{key:'X-Content-Type-Options',value:'nosniff'},{key:'X-Frame-Options',value:'DENY'},{key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"}]}];},
};
export default config;
