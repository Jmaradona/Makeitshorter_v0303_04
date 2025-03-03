import React from 'react';
import { motion } from 'framer-motion';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useUserStore } from '../store/userStore';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function AuthButton() {
  const [loading, setLoading] = React.useState(false);
  const { user, setUser, preferences, setPreferences } = useUserStore();

  const handleAuth = async () => {
    if (user) {
      try {
        await signOut(auth);
        setUser(null);
      } catch (error) {
        console.error('Error signing out:', error);
      }
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);

      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (userDoc.exists()) {
        setPreferences(userDoc.data().preferences);
      } else {
        await setDoc(doc(db, 'users', result.user.uid), {
          preferences
        });
      }
    } catch (error) {
      console.error('Error signing in:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleAuth}
      disabled={loading}
      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-gray-600 dark:text-gray-300" />
      ) : user ? (
        <>
          <img
            src={user.photoURL || ''}
            alt={user.displayName || 'User'}
            className="w-6 h-6 rounded-full"
          />
          <LogOut className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </>
      ) : (
        <>
          <LogIn className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Sign In</span>
        </>
      )}
    </motion.button>
  );
}