import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'it.studiopfc.portale',
  appName: 'Portale PFC',
  webDir: 'out',
  server: {
    // In development, point to the local dev server
    // In production, the static files are bundled in 'out'
    // url: 'http://localhost:3000',
    // cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: {
        badge: true,
        sound: true,
        alert: true,
      },
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#047857',
      showSpinner: false,
      spinnerColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#047857',
    },
  },
};

export default config;
