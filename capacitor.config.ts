import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.loop.journal',
  appName: 'Loop',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#000000',
  },
  server: {
    // Allow loading from Supabase and other external APIs
    allowNavigation: ['*.supabase.co'],
  },
};

export default config;
