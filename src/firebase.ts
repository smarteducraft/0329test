import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const getFirebaseConfig = () => {
  // 1. Vercel 등 배포 환경에서는 환경 변수(Environment Variables)를 우선적으로 사용합니다.
  if (import.meta.env.VITE_FIREBASE_API_KEY) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      databaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)'
    };
  }
  
  // 2. AI Studio 로컬 환경에서는 firebase-applet-config.json 파일을 사용합니다.
  // import.meta.glob을 사용하면 파일이 없을 때 빌드 에러가 나지 않습니다.
  const localConfig = import.meta.glob('../firebase-applet-config.json', { eager: true });
  const configKey = Object.keys(localConfig)[0];
  
  if (configKey) {
    const config = (localConfig[configKey] as any).default || localConfig[configKey];
    return {
      ...config,
      databaseId: config.firestoreDatabaseId || '(default)'
    };
  }
  
  console.error("Firebase 설정이 없습니다. 환경 변수를 확인해주세요.");
  return {};
};

const config = getFirebaseConfig();
const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app, config.databaseId);
