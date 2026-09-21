import { renderProjectPage } from '../../../../lib/project-page';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ organizationId: string }> }) {
  return renderProjectPage((await params).organizationId);
}
