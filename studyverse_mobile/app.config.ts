import { ConfigContext, ExpoConfig } from '@expo/config';
import 'dotenv/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: config.name ?? 'YourAppName', // fallback if undefined
    slug: config.slug ?? 'your-app-slug', // fallback if undefined
    version: config.version ?? '1.0.0', // fallback if undefined
    // add other required fields as needed

    extra: {
      googleAuth: {
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
        clientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ?? '',
      },
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
    },
  };
};
