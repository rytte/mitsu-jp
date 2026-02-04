import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorScreen from './src/screens/ErrorScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import { initDb } from './src/db/init';
import { getSettings } from './src/db/queries';
import { useAppStore } from './src/store/useAppStore';

export default function App() {
  const ready = useAppStore((state) => state.ready);
  const setReady = useAppStore((state) => state.setReady);
  const setSettings = useAppStore((state) => state.setSettings);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        await initDb();
        const settings = await getSettings();
        if (!active) return;
        setSettings(settings);
        setReady(true);
      } catch (err) {
        console.error('Init failed', err);
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    bootstrap();
    return () => {
      active = false;
    };
  }, [setReady, setSettings]);

  if (error) {
    return <ErrorScreen message={error} />;
  }

  if (!ready) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}

