import { Stack } from 'expo-router';
import { Providers } from '../src/providers';
export default function Layout() { return <Providers><Stack screenOptions={{ headerStyle: { backgroundColor: '#f4f7f5' }, headerTintColor: '#17665b' }}><Stack.Screen name="index" options={{ title: 'HandoverTrack' }} /><Stack.Screen name="project/[id]" options={{ title: 'Project details' }} /><Stack.Screen name="capture/[id]" options={{ title: 'Take a project photo' }} /><Stack.Screen name="gallery" options={{ title: 'Saved photos' }} /></Stack></Providers>; }
