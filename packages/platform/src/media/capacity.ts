import { AccessError } from '@handovertrack/backend';

// Leave room for the original, staging/partial files and derivatives of work
// already accepted. files=0 means this filesystem does not report inode limits.
export function assertStorageCapacity(info: { bavail: number; bsize: number; files: number; ffree: number }, bytes: number, reserveBytes: number) {
  if (info.bavail * info.bsize < reserveBytes + bytes || (info.files > 0 && info.ffree < 1024)) throw new AccessError('STORAGE_FULL', 507);
}
