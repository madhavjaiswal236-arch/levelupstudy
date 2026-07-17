import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

/**
 * useAuthToken hook
 */
export function useAuthToken() {
 const [token, setToken] = useState<string | null>(null);

 useEffect(() => {
 const fetchInitialToken = async () => {
 const currentToken = await getAccessToken();
 setToken(currentToken);
 };
 fetchInitialToken();

 const unsubscribe = onAuthStateChanged(getAuth(), async (user) => {
 if (!user) {
 setToken(null);
 } else {
 const currentToken = await getAccessToken();
 setToken(currentToken);
 }
 });

 return () => {
 unsubscribe();
 };
 }, []);

 return { token, isRefreshing: false };
}
