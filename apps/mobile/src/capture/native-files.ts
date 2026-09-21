import { Directory, File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import type { CaptureFiles, OriginalInfo } from '../media/types';

const MAX_BYTES = 50 * 1024 * 1024;
function relativePath(value: string) {
  const parts = value.split('/');
  if (parts[0] !== 'captures' || parts.some((part) => !part || part === '.' || part === '..' || !/^[a-zA-Z0-9._-]+$/.test(part))) throw new Error('Invalid private photo path');
  return value;
}
const file = (path: string) => new File(Paths.document, relativePath(path));
function cameraFile(uri: string) {
  // Only native camera output in this application's cache is an eligible source.
  const source = new URL(uri); const cache = new URL(Paths.cache.uri);
  if (source.protocol !== 'file:' || !decodeURIComponent(source.pathname).startsWith(decodeURIComponent(cache.pathname))) throw new Error('Invalid camera file');
  return new File(uri);
}
async function inspect(value: File): Promise<OriginalInfo> {
  if (!value.exists || value.size <= 0 || value.size > MAX_BYTES) throw new Error('Photo is missing, empty or exceeds the 50 MB local limit');
  const size = value.size;
  const bytes = await value.bytes();
  if (bytes.byteLength !== size) throw new Error('Photo changed while being read');
  const hash = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  return { size, sha256: Array.from(new Uint8Array(hash), (part) => part.toString(16).padStart(2, '0')).join('') };
}
export const nativeCaptureFiles: CaptureFiles = {
  randomUUID: () => Crypto.randomUUID(), now: () => new Date().toISOString(),
  async ensureDirectory(path) { new Directory(Paths.document, relativePath(path)).create({ intermediates: true, idempotent: true }); },
  async writeManifest(path, text) {
    const destination = file(path);
    if (destination.exists) {
      if (await destination.text() !== text) throw new Error('Capture manifest already exists with different content');
      return;
    }
    // Immutable reservation/manifest names avoid Expo's overwrite implementation,
    // which removes the old destination before moving. Interrupted temp files are
    // retained; the final manifest appears only after a complete write + rename.
    const temporary = file(`${path}.tmp.${Crypto.randomUUID()}`);
    temporary.create(); temporary.write(text);
    await temporary.move(destination); // Never overwrite an original or manifest.
  },
  async readText(path) {
    const value = file(path);
    if (value.size > 16_384) throw new Error('Invalid capture manifest size');
    return value.text();
  },
  async listCaptureDirectories() {
    const root = new Directory(Paths.document, 'captures'); if (!root.exists) return [];
    const results: string[] = [];
    for (const account of root.list()) {
      if (!(account instanceof Directory)) continue;
      for (const organization of account.list()) {
        if (!(organization instanceof Directory)) continue;
        for (const capture of organization.list()) if (capture instanceof Directory) results.push(`captures/${account.name}/${organization.name}/${capture.name}`);
      }
    }
    return results;
  },
  async exists(path) { return file(path).exists; },
  async copyFromCamera(uri, path) {
    const source = cameraFile(uri); const size = source.size;
    if (!source.exists || size <= 0 || size > MAX_BYTES) throw new Error('Photo is missing, empty or too large');
    const free = Paths.availableDiskSpace;
    if (!Number.isFinite(free) || free < size * 2 + 20 * 1024 * 1024) throw new Error('Not enough free storage. Free some space and check saved photos again.');
    await source.copy(file(path)); // No overwrites; every capture has a stable ID.
  },
  async move(from, to) { await file(from).move(file(to)); },
  inspect: (path) => inspect(file(path)), inspectCamera: (uri) => inspect(cameraFile(uri)),
  uri: (path) => file(path).uri,
};
