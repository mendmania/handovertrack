import { createUploadTask, FileSystemUploadType, FileSystemSessionType } from 'expo-file-system/legacy';
import { ApiError, createApi, type Upload } from '@handovertrack/contracts';
import { authClient, config } from '../auth/client';
import type { UploadTransport } from '../media/upload';
import { nativeCaptureFiles } from './native-files';

export async function nativeUploadTransport(): Promise<UploadTransport> {
  const cookie = await authClient.getCookie();
  const headers = { Cookie: cookie, 'expo-origin': 'handovertrack://' };
  const api = createApi({
    baseUrl: config.EXPO_PUBLIC_API_ORIGIN, credentials: 'omit', headers,
    fetch: async (input, init) => {
      const request = new Request(input, init);
      const controller = new AbortController(); const abort = () => controller.abort();
      request.signal.addEventListener('abort',abort); if (request.signal.aborted) abort();
      const timeout = setTimeout(abort,15000);
      try { return await fetch(new Request(request,{ signal: controller.signal, credentials: 'omit' })); }
      finally { clearTimeout(timeout); request.signal.removeEventListener('abort',abort); }
    },
  });
  return { api, async content(row, uploadId, signal, progress) {
    if (signal.aborted) throw new Error('Upload cancelled');
    const task = createUploadTask(`${config.EXPO_PUBLIC_API_ORIGIN}/media/organizations/${row.organizationId}/uploads/${uploadId}/content`, nativeCaptureFiles.uri(row.originalPath!), {
      httpMethod: 'PUT', uploadType: FileSystemUploadType.BINARY_CONTENT, sessionType: FileSystemSessionType.FOREGROUND,
      headers: { ...headers, 'Content-Type': 'image/jpeg', 'Content-Length': String(row.size) },
    }, (data) => progress(data.totalBytesSent));
    const abort = () => { void task.cancelAsync().catch(() => {}); };
    signal.addEventListener('abort',abort); const timeout = setTimeout(abort,120000);
    try {
      const result = await task.uploadAsync();
      if (!result || signal.aborted) throw new Error('Upload cancelled');
      const value = JSON.parse(result.body) as Upload & { code?: string };
      if (result.status !== 200) throw new ApiError(result.status,value.code ?? 'UPLOAD_FAILED');
      return value;
    } finally { clearTimeout(timeout); signal.removeEventListener('abort',abort); }
  } };
}
