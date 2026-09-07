import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.341d77b40704400fa9b49616acbcd549',
  appName: 'NovaHost',
  webDir: 'dist',
  server: {
    url: 'http://192.168.10.134:8080',
    cleartext: true,
  },
};

export default config;
