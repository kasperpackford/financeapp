import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useAsyncStorage<T>(key: string, initialValue: T) {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  // Stable ref so reload() doesn't depend on initialValue identity
  const initialRef = useRef(initialValue);

  const reload = useCallback(() => {
    return AsyncStorage.getItem(key)
      .then((stored) => {
        setData(stored !== null ? (JSON.parse(stored) as T) : initialRef.current);
      })
      .catch(console.error);
  }, [key]);

  useEffect(() => {
    reload()?.finally(() => setLoading(false));
  }, [reload]);

  const save = useCallback(
    async (value: T) => {
      setData(value);
      await AsyncStorage.setItem(key, JSON.stringify(value));
    },
    [key]
  );

  return { data, save, loading, reload };
}
