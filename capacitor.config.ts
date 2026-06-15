import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.trixsistemas.fiscalizafogos',
  appName: 'Fiscaliza Fogos',
  webDir: 'dist',
  server: {
    url: 'https://fiscalizacaodefogos.lovable.app',
    cleartext: false,
  },
};

export default config;
