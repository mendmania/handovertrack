import { describe, it, expect } from 'vitest';
import { assertStorageCapacity } from './capacity';
describe('intake reserve', () => {
  const disk = { bavail: 1024, bsize: 4096, files: 100000, ffree: 1024 };
  it('rejects byte pressure and recovers without consuming pending intent', () => {
    expect(() => assertStorageCapacity(disk, 4096, 1024 * 4096)).toThrow('STORAGE_FULL');
    expect(() => assertStorageCapacity(disk, 4096, 1023 * 4096)).not.toThrow();
  });
  it('rejects inode pressure even with free bytes, accepts restored headroom', () => {
    expect(() => assertStorageCapacity({ ...disk, ffree: 1023 }, 0, 0)).toThrow('STORAGE_FULL');
    expect(() => assertStorageCapacity(disk, 0, 0)).not.toThrow();
  });
  it('does not mistake unreported inode capacity for exhaustion', () => {
    expect(() => assertStorageCapacity({ ...disk, files: 0, ffree: 0 }, 0, 0)).not.toThrow();
  });
});
