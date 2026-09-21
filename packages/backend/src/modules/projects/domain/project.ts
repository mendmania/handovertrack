export interface Project {
  id: string; organizationId: string; name: string; description: string;
  address: string; status: 'active' | 'complete'; updatedAt: string; version: number;
}
export const SNAPSHOT_CAP = 200;
