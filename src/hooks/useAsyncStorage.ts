import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useAsyncStorage<T>(key: string, initialValue: T) {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((stored) => {
        if (stored !== null) {
          setData(JSON.parse(stored));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [key]);

  const save = useCallback(
    async (value: T) => {
      setData(value);
      await AsyncStorage.setItem(key, JSON.stringify(value));
    },
    [key]
  );

  return { data, save, loading };
}
