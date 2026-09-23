import { createApi } from '@handovertrack/contracts';
import { authClient, config } from '../auth/client';
export async function checklistTransport() {
  // Freeze credentials before dispatch. Never ask the global auth client again mid-flight.
  const cookie = await authClient.getCookie();
  return createApi({ baseUrl:config.EXPO_PUBLIC_API_ORIGIN,credentials:'omit',headers:{ Cookie:cookie,'expo-origin':'handovertrack://' } });
}
