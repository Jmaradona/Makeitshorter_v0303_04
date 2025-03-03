import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Send, Sparkles, AlertTriangle } from 'lucide-react';
import ToneSelector from './ToneSelector';
import ResizableOutput from './ResizableOutput';
import { enhanceEmail } from '../services/aiService';
import { countWords, cleanAIResponse } from '../utils/textUtils';
import { useUserStore } from '../store/userStore';
import AnimatedPlaceholder from './AnimatedPlaceholder';

interface Persona {
  style: string;
  formality: string;
  traits: string[];
  context: string;
}

interface EmailEditorProps {
  persona: Persona;
}

const MAX_INPUT_WORDS = 2000;
const BATCH_SIZE = 500;

export default function EmailEditor({ persona }: EmailEditorProps) {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [outputSubject, setOutputSubject] = useState('');
  const [selectedTone, setSelectedTone] = useState('professional');
  const [selectedLength, setSelectedLength] = useState('balanced');
  const [selectedInputType, setSelectedInputType] = useState('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [targetWordCount, setTargetWordCount] = useState<number | null>(null);
  const [processingStatus, setProcessingStatus] = useState('');
  const { isOfflineMode } = useUserStore();
  
  // Track if this is the first time we're showing output
  const [hasShownOutput, setHasShownOutput] = useState(false);
  // Flag to trigger the animation only once on first output
  const [triggerInitialAnimation, setTriggerInitialAnimation] = useState(false);
  // Track input focus state for placeholder
  const [isInputFocused, setIsInputFocused] = useState(false);
  // Track whether to show the placeholder
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastRequestRef = useRef<{
    timestamp: number;
    wordCount: number;
  } | null>(null);

  // Determine when to show the placeholder
  useEffect(() => {
    // Show placeholder when there's no text and either:
    // 1. The input isn't focused, or
    // 2. The component just mounted
    setShowPlaceholder(!inputText);
  }, [inputText, isInputFocused]);

  const calculateTargetWords = (text: string, lengthType: string): number => {
    const currentWords = countWords(text);
    console.log('Current word count:', currentWords);
    
    let targetWords;
    
    switch (lengthType) {
      case 'concise':
        targetWords = Math.max(20, Math.round(currentWords * 0.5));
        break;
      case 'balanced':
        targetWords = Math.max(currentWords, 50); // Ensure at least 50 words
        break;
      case 'detailed':
        targetWords = Math.max(20, Math.round(currentWords * 1.5));
        break;
      default:
        targetWords = currentWords;
    }
    
    // Round to nearest 25 for cleaner targets
    targetWords = Math.round(targetWords / 25) * 25;
    
    console.log('Target word count:', targetWords);
    return targetWords;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const wordCount = countWords(text);
    
    if (wordCount > MAX_INPUT_WORDS) {
      setError(`Text exceeds ${MAX_INPUT_WORDS} words limit. Please shorten your input.`);
    } else {
      setError('');
    }
    
    setInputText(text);
  };

  const processBatch = async (text: string, targetWords: number, batchNumber: number, totalBatches: number) => {
    setProcessingStatus(`Processing batch ${batchNumber} of ${totalBatches}...`);
    
    const response = await enhanceEmail({
      content: text,
      tone: `${selectedTone} with ${persona.style} style, ${persona.formality} formality, in a ${persona.context} context, emphasizing ${persona.traits.join(', ')}`,
      targetWords: Math.min(targetWords, BATCH_SIZE),
      inputType: selectedInputType,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    return cleanAIResponse(response.enhancedContent);
  };

  const handleEnhance = async (customWordCount?: number) => {
    if (!inputText.trim() || isLoading) return;

    const wordCount = countWords(inputText);
    if (wordCount > MAX_INPUT_WORDS) {
      setError(`Text exceeds ${MAX_INPUT_WORDS} words limit. Please shorten your input.`);
      return;
    }

    setIsLoading(true);
    setError('');
    setWarning('');
    setProcessingStatus('');

    try {
      const targetWords = customWordCount ?? calculateTargetWords(inputText, selectedLength);
      setTargetWordCount(targetWords);
      
      // Store this request for tracking
      lastRequestRef.current = {
        timestamp: Date.now(),
        wordCount: targetWords
      };
      
      console.log(`Enhancing text to ${targetWords} words`);

      if (targetWords <= BATCH_SIZE || isOfflineMode) {
        // Process normally for small texts or when in offline mode
        const response = await enhanceEmail({
          content: inputText,
          tone: `${selectedTone} with ${persona.style} style, ${persona.formality} formality, in a ${persona.context} context, emphasizing ${persona.traits.join(', ')}`,
          targetWords,
          inputType: selectedInputType,
        });

        if (response.error) {
          setError(response.error);
          return;
        }
        
        if (response.warning) {
          setWarning(response.warning);
        }

        const content = cleanAIResponse(response.enhancedContent);
        
        const subjectMatch = content.match(/^Subject:\s*(.+)$/m);
        if (subjectMatch) {
          setOutputSubject(subjectMatch[1].trim());
          setOutputText(content.replace(/^Subject:\s*.+\n+/, '').trim());
        } else {
          setOutputText(content.trim());
        }
        
        // Verify the word count for accuracy
        const actualWordCount = countWords(subjectMatch ? content.replace(/^Subject:\s*.+\n+/, '') : content);
        setTargetWordCount(actualWordCount);
        console.log(`Generated content with ${actualWordCount} words`);
        
        // If this is the first time we're showing output, trigger the animation
        if (!hasShownOutput) {
          // Mark that we've shown output so we don't animate on subsequent enhancements
          setHasShownOutput(true);
          // Delay animation trigger slightly to ensure content is rendered
          setTimeout(() => {
            setTriggerInitialAnimation(true);
          }, 100);
        }
      } else {
        // Process in batches for large texts (only in online mode)
        const words = inputText.split(/\s+/);
        const batchSize = BATCH_SIZE;
        const batches = [];
        let currentBatch = '';
        let currentBatchWords = 0;

        for (const word of words) {
          if (currentBatchWords >= batchSize) {
            batches.push(currentBatch.trim());
            currentBatch = '';
            currentBatchWords = 0;
          }
          currentBatch += word + ' ';
          currentBatchWords++;
        }
        if (currentBatch) {
          batches.push(currentBatch.trim());
        }

        const processedBatches = [];
        for (let i = 0; i < batches.length; i++) {
          const batchResult = await processBatch(
            batches[i],
            Math.floor(targetWords / batches.length),
            i + 1,
            batches.length
          );
          processedBatches.push(batchResult);
        }

        const combinedResult = processedBatches.join('\n\n');
        
        // Final pass to ensure exact word count
        const finalResponse = await enhanceEmail({
          content: combinedResult,
          tone: `${selectedTone} with ${persona.style} style, ${persona.formality} formality, in a ${persona.context} context, emphasizing ${persona.traits.join(', ')}. CRITICAL: Maintain the same structure but adjust to exactly ${targetWords} words.`,
          targetWords,
          inputType: selectedInputType,
        });
        
        if (finalResponse.warning) {
          setWarning(finalResponse.warning);
        }

        const content = cleanAIResponse(finalResponse.enhancedContent);
        
        const subjectMatch = content.match(/^Subject:\s*(.+)$/m);
        if (subjectMatch) {
          setOutputSubject(subjectMatch[1].trim());
          setOutputText(content.replace(/^Subject:\s*.+\n+/, '').trim());
        } else {
          setOutputText(content.trim());
        }
        
        // Update actual word count
        const actualWordCount = countWords(subjectMatch ? content.replace(/^Subject:\s*.+\n+/, '') : content);
        setTargetWordCount(actualWordCount);
        console.log(`Generated batched content with ${actualWordCount} words`);
        
        // If this is the first time we're showing output, trigger the animation
        if (!hasShownOutput) {
          // Mark that we've shown output so we don't animate on subsequent enhancements
          setHasShownOutput(true);
          // Delay animation trigger slightly to ensure content is rendered
          setTimeout(() => {
            setTriggerInitialAnimation(true);
          }, 100);
        }
      }
    } catch (err) {
      setError('Failed to enhance content. Please try again.');
    } finally {
      setIsLoading(false);
      setProcessingStatus('');
    }
  };

  const currentWordCount = countWords(inputText);
  const isOverLimit = currentWordCount > MAX_INPUT_WORDS;
  
  // Reset the animation trigger after animation completes
  const handleAnimationComplete = () => {
    setTriggerInitialAnimation(false);
  };

  // Placeholder text variants for the typing animation
  const placeholderTexts = [
    `Paste or write your ${selectedInputType} content here...`,
    `Share your ${selectedInputType} draft and we'll make it better...`,
    `Type your ${selectedInputType} here and see it transform...`,
    `Need help with your ${selectedInputType}? Start typing...`
  ];

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 p-4 pb-16 lg:p-8 lg:pb-20 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="h-full flex flex-col gap-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
              <Wand2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">Input</h2>
          </div>
          {isOfflineMode && (
            <span className="text-amber-600 dark:text-amber-400 text-sm font-medium px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              Test Mode
            </span>
          )}
        </div>

        <div className="flex-1 flex flex-col space-y-6">
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Your Content
              </label>
              <span className={`text-sm ${isOverLimit ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                {currentWordCount} / {MAX_INPUT_WORDS} words
              </span>
            </div>
            <div className="input-area flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={handleTextChange}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                className={`h-full w-full p-4 border ${
                  isOverLimit 
                    ? 'border-red-300 dark:border-red-700 focus:ring-red-200 focus:border-red-400' 
                    : 'border-gray-200 dark:border-gray-800 focus:ring-gray-400/20 focus:border-gray-400'
                } rounded-lg focus:ring-2 dark:focus:border-gray-700 transition-all resize-none text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 scrollbar-thin relative z-10`}
              />
              
              {/* Animated placeholder */}
              <AnimatedPlaceholder 
                texts={placeholderTexts}
                isVisible={showPlaceholder}
              />
            </div>
            {isOverLimit && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 flex items-center gap-2 text-red-500 text-sm"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Text exceeds {MAX_INPUT_WORDS} words limit</span>
              </motion.div>
            )}
          </div>

          <ToneSelector
            selectedTone={selectedTone}
            onToneSelect={setSelectedTone}
            selectedLength={selectedLength}
            onLengthSelect={setSelectedLength}
          />

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleEnhance()}
            data-tutorial="enhance"
            disabled={isLoading || !inputText.trim() || isOverLimit}
            className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-3 px-4 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-900 dark:disabled:hover:bg-gray-100 shadow-sm"
          >
            <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
            <span className="text-sm font-medium">
              {isLoading ? processingStatus || 'Processing...' : 'Enhance Text'}
            </span>
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="h-full flex flex-col gap-6 pt-6 lg:pt-0 lg:pl-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
              <Send className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
              Enhanced Version {targetWordCount ? `(${targetWordCount} words)` : ''}
            </h2>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col">
          {error ? (
            <div className="flex-1 p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50/50 dark:bg-red-900/10">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : outputText ? (
            <>
              {warning && (
                <div className="mb-4 p-3 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50/50 dark:bg-amber-900/10">
                  <p className="text-amber-600 dark:text-amber-400 text-sm">{warning}</p>
                </div>
              )}
              <ResizableOutput
                text={outputText}
                subject={outputSubject}
                onResize={handleEnhance}
                isLoading={isLoading}
                targetWordCount={targetWordCount}
                shouldPlayAnimation={triggerInitialAnimation}
                onAnimationComplete={handleAnimationComplete}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900">
              <p className="text-gray-400 dark:text-gray-500 text-sm">Enhanced version will appear here</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}