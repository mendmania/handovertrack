import { renderProjectPage } from '../../../../../lib/project-page';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ organizationId: string; projectId: string }> }) {
  const { organizationId, projectId } = await params;
  return renderProjectPage(organizationId, projectId);
}
