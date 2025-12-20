
'use client';

import {
  useEffect,
  useState,
} from 'react';
import type { FirebaseApp } from 'firebase/app';
import {
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  onSnapshot,
  doc,
  type Firestore,
  type DocumentData,
} from 'firebase/firestore';

import { useFirebase } from './provider';

export { FirebaseProvider, useFirebase } from './provider';
export { FirebaseClientProvider } from './client-provider';


// Custom hook for user auth state
type UseUserValue = {
  user: User | null;
  userProfile: DocumentData | null;
  loading: boolean;
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
};

export function useUser(): UseUserValue {
  const firebaseContext = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseContext) return;
    const { auth } = firebaseContext;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [firebaseContext]);

  useEffect(() => {
    if (user && firebaseContext) {
      const { db } = firebaseContext;
      const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        if (doc.exists()) {
          setUserProfile(doc.data());
        }
        setLoading(false);
      });
      return () => unsub();
    } else {
      setLoading(false);
      setUserProfile(null);
    }
  }, [user, firebaseContext]);

  return {
    user,
    userProfile,
    loading,
    app: firebaseContext?.app ?? null,
    auth: firebaseContext?.auth ?? null,
    db: firebaseContext?.db ?? null,
  };
}
