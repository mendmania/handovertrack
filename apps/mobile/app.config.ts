import type { ExpoConfig } from 'expo/config';
const config: ExpoConfig = {
  name: 'HandoverTrack', slug: 'handovertrack', version: '0.1.0',
  scheme: 'handovertrack', // Chosen URL scheme; distinct from the registered bundle ID.
  orientation: 'portrait', userInterfaceStyle: 'light',
  ios: { bundleIdentifier: 'com.gementis.handovertrack', supportsTablet: true },
  plugins: ['expo-router', 'expo-sqlite', 'expo-secure-store', ['expo-camera', {
    cameraPermission: 'Allow HandoverTrack to take project photos saved privately on this device.',
    microphonePermission: false, recordAudioAndroid: false, barcodeScannerEnabled: false,
  }]],
  // No Android identity, Apple team, EAS ID or paid service is invented.
};
export default config;
