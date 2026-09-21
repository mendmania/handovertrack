import type { ReactNode } from 'react';
import { Providers } from '../lib/providers';
import './style.css';
export const metadata = { title: 'HandoverTrack', description: 'Your crew’s projects, clearly in view.' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
