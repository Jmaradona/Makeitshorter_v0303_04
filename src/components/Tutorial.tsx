import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User2, MoveVertical, Sparkles, Wand2 } from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ElementType;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const steps: TutorialStep[] = [
  {
    title: 'Customize Your Persona',
    description: 'Click here to set your communication style, formality level, and work context. This helps tailor the output to your needs.',
    icon: User2,
    target: '[data-tutorial="persona"]',
    position: 'bottom'
  },
  {
    title: 'Input Your Text',
    description: 'Paste or type your content here. You can enter emails, messages, or any text you want to enhance.',
    icon: Wand2,
    target: '.input-area',
    position: 'right'
  },
  {
    title: 'Adjust Length',
    description: 'After generating content, drag this handle up or down to make your text longer or shorter. The AI will maintain the same style and tone.',
    icon: MoveVertical,
    target: '.re-resizable',
    position: 'left'
  },
  {
    title: 'Enhance Your Text',
    description: 'Click this button to transform your text. The AI will consider your persona settings and selected tone.',
    icon: Sparkles,
    target: '[data-tutorial="enhance"]',
    position: 'top'
  }
];

interface TutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Tutorial({ isOpen, onClose }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isOpen) return;
    
    const updatePosition = () => {
      const target = document.querySelector(steps[currentStep].target);
      if (!target || !tooltipRef.current) {
        setHighlightedElement(null);
        return;
      }
      
      const targetRect = target.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      setTargetRect(targetRect);
      setHighlightedElement(target);
      
      // Add highlight class to target
      target.classList.add('tutorial-highlight');
      
      let top = 0;
      let left = 0;
      
      switch (steps[currentStep].position) {
        case 'top':
          top = targetRect.top - tooltipRect.height - 16;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = targetRect.bottom + 16;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.left - tooltipRect.width - 16;
          break;
        case 'right':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.right + 16;
          break;
      }
      
      // Ensure tooltip stays within viewport
      const padding = 16;
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));
      
      setTooltipPosition({ top, left });
    };
    
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    return () => {
      // Clean up highlight when tutorial closes
      if (highlightedElement) {
        highlightedElement.classList.remove('tutorial-highlight');
      }
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, currentStep]);
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleClose = () => {
    setCurrentStep(0);
    if (highlightedElement) {
      highlightedElement.classList.remove('tutorial-highlight');
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/5 backdrop-blur-none z-[60]"
            onClick={handleClose}
          >
          </motion.div>
          
          {/* Tutorial content */}
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[70] w-80"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))'
            }}
          >
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
                      {React.createElement(steps[currentStep].icon, {
                        className: "w-5 h-5 text-gray-700 dark:text-gray-300"
                      })}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {steps[currentStep].title}
                    </h3>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {steps[currentStep].description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {steps.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentStep
                            ? 'bg-gray-900 dark:bg-gray-100'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    {currentStep > 0 && (
                      <button
                        onClick={handleBack}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        Back
                      </button>
                    )}
                    <button
                      onClick={handleNext}
                      className="px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                    >
                      {currentStep === steps.length - 1 ? 'Got it!' : 'Next'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}