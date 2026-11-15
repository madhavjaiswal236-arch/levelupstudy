import { useEffect, useState } from 'react';
import { getAccessToken, refreshGoogleToken } from '../lib/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

/**
 * useAuthToken hook
 */
export function useAuthToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), async (user) => {
      if (!user) {
        setToken(null);
      } else {
        let currentToken = await getAccessToken();
        if (!currentToken) {
          currentToken = await refreshGoogleToken();
        }
        setToken(currentToken);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { token, isRefreshing: false };
}
