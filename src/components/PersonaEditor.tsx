import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User2, X, Save, Sparkles, Briefcase, Coffee, Zap } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const styles = [
  { id: 'gen-z', label: 'Gen Z', icon: Zap },
  { id: 'millennial', label: 'Millennial', icon: Coffee },
  { id: 'professional', label: 'Professional', icon: Briefcase },
];

const formalities = [
  { id: 'casual', label: 'Casual' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'formal', label: 'Formal' },
];

const traits = [
  'Emoji-friendly 😊',
  'Tech-savvy',
  'Concise',
  'Engaging',
  'Data-driven',
  'Collaborative',
  'Innovative',
  'Results-oriented',
  'Authentic',
];

const contexts = [
  'Startup',
  'Corporate',
  'Creative Agency',
  'Tech Company',
  'Remote-first',
];

interface PersonaEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: any) => void;
}

export default function PersonaEditor({ isOpen, onClose, onSave }: PersonaEditorProps) {
  const { user, preferences } = useUserStore();
  const [localPreferences, setLocalPreferences] = React.useState(preferences);

  React.useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  const handleSave = async () => {
    onSave(localPreferences);
    
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          preferences: localPreferences
        });
      } catch (error) {
        console.error('Error saving preferences:', error);
      }
    }
    
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 p-2 rounded-lg">
                    <User2 className="w-4 h-4" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your Persona</h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </motion.button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Communication Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {styles.map(({ id, label, icon: Icon }) => (
                      <motion.button
                        key={id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setLocalPreferences({ ...localPreferences, style: id })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          localPreferences.style === id
                            ? 'border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800'
                            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Icon className={`w-5 h-5 ${localPreferences.style === id ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`} />
                          <span className={`text-sm font-medium ${localPreferences.style === id ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>{label}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Formality Level</label>
                  <div className="flex gap-2">
                    {formalities.map(({ id, label }) => (
                      <motion.button
                        key={id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setLocalPreferences({ ...localPreferences, formality: id })}
                        className={`flex-1 py-2 px-4 rounded-lg transition-all ${
                          localPreferences.formality === id
                            ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Communication Traits</label>
                  <div className="flex flex-wrap gap-2">
                    {traits.map((trait) => (
                      <motion.button
                        key={trait}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const newTraits = localPreferences.traits.includes(trait)
                            ? localPreferences.traits.filter((t: string) => t !== trait)
                            : [...localPreferences.traits, trait];
                          setLocalPreferences({ ...localPreferences, traits: newTraits });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                          localPreferences.traits.includes(trait)
                            ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {trait}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Work Context</label>
                  <div className="flex flex-wrap gap-2">
                    {contexts.map((context) => (
                      <motion.button
                        key={context}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setLocalPreferences({ ...localPreferences, context })}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                          localPreferences.context === context
                            ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {context}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-3 px-4 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2 group"
              >
                <Save className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                <span className="text-sm font-medium">Save Persona</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}