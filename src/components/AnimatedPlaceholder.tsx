import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedPlaceholderProps {
  texts: string[];
  isVisible: boolean;
  speed?: number;
  delayBetweenTexts?: number;
}

export default function AnimatedPlaceholder({ 
  texts, 
  isVisible, 
  speed = 15, // Increased from 10ms to 15ms for slightly slower typing
  delayBetweenTexts = 750 // Increased from 500ms to 750ms
}: AnimatedPlaceholderProps) {
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Reset animation when visibility changes
  useEffect(() => {
    if (isVisible && !isInitialized) {
      setIsInitialized(true);
      setCurrentText('');
      setCharIndex(0);
      setIsTyping(true);
    }
    
    if (!isVisible) {
      // Clean up when hiding
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
    }
  }, [isVisible, isInitialized]);

  // Handle typing animation
  useEffect(() => {
    if (!isVisible) return;

    const runAnimation = () => {
      if (isTyping) {
        // Typing forward - process characters for a smoother effect
        if (charIndex < texts[textIndex].length) {
          // Process up to 2 characters at once when typing (reduced from 3)
          const charsToAdd = Math.min(2, texts[textIndex].length - charIndex);
          const nextChars = texts[textIndex].substring(charIndex, charIndex + charsToAdd);
          setCurrentText(prev => prev + nextChars);
          setCharIndex(prev => prev + charsToAdd);
          animationRef.current = setTimeout(runAnimation, speed);
        } else {
          // Finished typing, pause before deleting
          animationRef.current = setTimeout(() => {
            setIsTyping(false);
            runAnimation();
          }, delayBetweenTexts);
        }
      } else {
        // Erasing - more controlled deletion for smoothness
        if (charIndex > 0) {
          // Delete up to 3 characters at once (reduced from 5)
          const charsToRemove = Math.min(3, charIndex);
          setCurrentText(prev => prev.substring(0, prev.length - charsToRemove));
          setCharIndex(prev => prev - charsToRemove);
          animationRef.current = setTimeout(runAnimation, speed / 2); // Slower deletion (changed from speed/3)
        } else {
          // Move to next text
          setTextIndex(prev => (prev + 1) % texts.length);
          setIsTyping(true);
          animationRef.current = setTimeout(runAnimation, 300); // Increased from 200ms
        }
      }
    };

    // Start animation if not already running
    if (!animationRef.current) {
      animationRef.current = setTimeout(runAnimation, 200); // Increased from 100ms
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isVisible, charIndex, textIndex, isTyping, texts, speed, delayBetweenTexts]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }} // Increased from 0.2s to 0.3s for smoother fade
          className="absolute inset-0 flex items-start pointer-events-none p-4 text-gray-500 dark:text-gray-400 z-20"
        >
          <div className="flex items-center">
            <span>{currentText}</span>
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }} // Slower cursor blinking (increased from 0.5s)
              className="inline-block w-[2px] h-[18px] bg-gray-500 dark:bg-gray-400 ml-[1px]"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}