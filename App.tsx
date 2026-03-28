import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { initDatabase } from './src/db/init';
import { RootNavigator } from './src/navigation/RootNavigator';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const [fontsLoaded, fontError] = useFonts({
    NotoSerifDevanagari:  require('./assets/fonts/NotoSerifDevanagari-Regular.ttf'),
    NotoSerif:            require('./assets/fonts/NotoSerif-Regular.ttf'),
    NotoSerif_700Bold:    require('./assets/fonts/NotoSerif-Bold.ttf'),
    NotoSans:             require('./assets/fonts/NotoSans-Regular.ttf'),
  });

  useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch((err) => setDbError(err.message));
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if ((fontsLoaded || fontError) && (dbReady || dbError)) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, dbReady, dbError]);

  const ready = (fontsLoaded || fontError) && (dbReady || dbError);

  if (!ready) return null;

  if (dbError) {
    return (
      <View style={styles.err}>
        <Text style={styles.errText}>DB init failed: {dbError}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <RootNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  err: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errText: { color: 'red', fontSize: 14, textAlign: 'center' },
});