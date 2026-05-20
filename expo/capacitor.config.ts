import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chronomind.app',
  appName: 'ChronoMind',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
