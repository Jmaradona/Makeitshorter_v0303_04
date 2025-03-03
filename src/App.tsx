import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import EmailEditor from './components/EmailEditor';
import PersonaEditor from './components/PersonaEditor';
import Tutorial from './components/Tutorial';
import AuthButton from './components/AuthButton';
import { ScanText, User2, Moon, Sun, Wifi, WifiOff, HelpCircle } from 'lucide-react';
import { useUserStore } from './store/userStore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function App() {
  const [isPersonaEditorOpen, setIsPersonaEditorOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const { 
    user, 
    setUser, 
    preferences, 
    setPreferences, 
    isDarkMode, 
    toggleDarkMode,
    isOfflineMode,
    toggleOfflineMode
  } = useUserStore();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubAuth();
  }, [setUser]);

  useEffect(() => {
    if (!user) return;

    const unsubPrefs = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setPreferences(doc.data().preferences);
      }
    });

    return () => unsubPrefs();
  }, [user, setPreferences]);

  return (
    <div className={`h-screen flex flex-col ${isDarkMode ? 'dark' : ''}`}>
      <nav className="border-b border-gray-200 dark:border-gray-800 px-6 h-16 flex items-center justify-between flex-shrink-0 bg-[rgb(var(--bg-primary))] backdrop-blur-sm transition-colors">
        <div className="flex items-center space-x-2.5">
          <div className="bg-gray-900 dark:bg-gray-100 text-gray-100 dark:text-gray-900 p-1.5 rounded-lg">
            <ScanText className="w-5 h-5" />
          </div>
          <span className="font-semibold text-[rgb(var(--text-primary))]">Make it shorter!!!</span>
        </div>
        
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsTutorialOpen(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Show tutorial"
          >
            <HelpCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleDarkMode}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-gray-100" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleOfflineMode}
            className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${
              isOfflineMode 
                ? "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100" 
                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            }`}
            title={isOfflineMode ? "Switch to online mode" : "Switch to test mode (fallback)"}
          >
            {isOfflineMode ? (
              <WifiOff className="w-5 h-5" />
            ) : (
              <Wifi className="w-5 h-5" />
            )}
            <span className="text-sm font-medium hidden sm:inline">
              {isOfflineMode ? "Test Mode" : "Online Mode"}
            </span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsPersonaEditorOpen(true)}
            data-tutorial="persona"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2 relative z-[65] backdrop-filter-none"
          >
            <User2 className="w-5 h-5 text-[rgb(var(--text-secondary))]" />
            <span className="text-sm font-medium text-[rgb(var(--text-secondary))]">Edit Persona</span>
          </motion.button>
          <AuthButton />
        </div>
      </nav>

      <main className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
        <EmailEditor persona={preferences} />
      </main>

      <PersonaEditor
        isOpen={isPersonaEditorOpen}
        onClose={() => setIsPersonaEditorOpen(false)}
        onSave={setPreferences}
      />
      
      <Tutorial
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </div>
  );
}