
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
      // If there's no user, we can stop loading.
      // If there IS a user, we'll wait for the profile to load.
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
        } else {
          // Handle case where user exists in Auth but not in Firestore.
          setUserProfile(null);
        }
        // Only stop loading after we've attempted to fetch the profile.
        setLoading(false);
      });
      return () => unsub();
    } else {
      // This handles the case where the user is logged out.
      // We already set loading to false in the auth listener.
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
