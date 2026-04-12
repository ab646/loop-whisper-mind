import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.loop.journal',
  appName: 'Loop',
  webDir: 'dist',
  ios: {
    preferredContentMode: 'mobile',
    backgroundColor: '#000000',
  },
  server: {
    // Allow loading from Supabase and other external APIs
    // SEC-29: Narrow to specific Supabase subdomain (was *.supabase.co)
    allowNavigation: ['kcyifzayxgsogdkxmykm.supabase.co', 'loop-whisper-mind.lovable.app'],
  },
};

export default config;
