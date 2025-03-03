import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, MoveVertical, Loader2, ZoomIn, ChevronsUpDown } from 'lucide-react';
import { Resizable } from 're-resizable';
import { countWords, calculateWordsFromHeight } from '../utils/textUtils';

interface ResizableOutputProps {
  text: string;
  subject?: string;
  onResize: (words: number) => void;
  isLoading: boolean;
  targetWordCount: number | null;
  shouldPlayAnimation?: boolean;
  onAnimationComplete?: () => void;
}

export default function ResizableOutput({ 
  text, 
  subject, 
  onResize,
  isLoading,
  targetWordCount,
  shouldPlayAnimation = false,
  onAnimationComplete
}: ResizableOutputProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [currentHeight, setCurrentHeight] = useState(0);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const [size, setSize] = useState({ width: '100%', height: 'auto' });
  const [maxHeight, setMaxHeight] = useState(800);
  const [actualWordCount, setActualWordCount] = useState(0);
  const [estimatedWordCount, setEstimatedWordCount] = useState(0);
  const [sizeRatio, setSizeRatio] = useState(1);
  const [isShowingDragHint, setIsShowingDragHint] = useState(false);
  const [hasUserDragged, setHasUserDragged] = useState(false);
  
  // Constants for maintaining handle visibility
  const HANDLE_MARGIN = 60; // Increased space below container for handle
  const MINIMUM_BOX_HEIGHT = 80; // Minimum allowed box height
  const LINE_HEIGHT = 24; // Approximate line height in pixels
  
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();
  const measureRef = useRef<HTMLDivElement>(null);
  const originalHeightRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();
  const animationInProgressRef = useRef(false);
  const initialTextLengthRef = useRef<number>(0);
  const contentInitializedRef = useRef(false);
  const draggedWordCountRef = useRef(0);
  const lastRequestedWordCountRef = useRef(0);

  // Calculate available height in the viewport with buffer for handle
  const calculateMaxHeight = () => {
    if (containerRef.current) {
      const container = containerRef.current;
      const containerTop = container.getBoundingClientRect().top;
      const viewportHeight = window.innerHeight;
      // Add fixed buffer for the handle plus more extra space
      const offset = 140 + HANDLE_MARGIN;
      return Math.max(MINIMUM_BOX_HEIGHT, viewportHeight - containerTop - offset);
    }
    return 800 - HANDLE_MARGIN; // Default fallback with handle margin
  };

  // Calculate the height needed to fit content
  const calculateFitToContentHeight = () => {
    if (!measureRef.current || !text) return originalHeightRef.current || 0;
    
    // Force a reflow to get accurate measurements
    measureRef.current.style.height = 'auto';
    measureRef.current.style.width = containerRef.current?.clientWidth ? (containerRef.current.clientWidth - 2) + 'px' : '100%';
    
    // Get the exact content height (including padding)
    const actualTextHeight = measureRef.current.scrollHeight;
    
    // Ensure minimum height for the content box
    return Math.max(MINIMUM_BOX_HEIGHT, actualTextHeight);
  };

  // Calculate and set the exact height needed for the content
  const updateHeight = () => {
    if (!measureRef.current || !text) return;
    
    // Calculate the maximum available height first
    const availableMaxHeight = calculateMaxHeight();
    setMaxHeight(availableMaxHeight);
    
    // Get the height needed to fit content
    const fitHeight = calculateFitToContentHeight();
    
    // Determine if we need scrolling or not
    const finalHeight = Math.min(fitHeight, availableMaxHeight);
    
    // Store initial text length on first content initialization
    if (!contentInitializedRef.current) {
      initialTextLengthRef.current = text.length;
      originalHeightRef.current = finalHeight;
      contentInitializedRef.current = true;
    }
    
    setSize(prev => ({ ...prev, height: finalHeight }));
    setCurrentHeight(finalHeight);
    
    // Update actual word count
    const words = countWords(text);
    setActualWordCount(words);
    
    // Calculate estimated words based on the container size
    const estimated = calculateWordsFromHeight(finalHeight);
    setEstimatedWordCount(estimated);
    
    // Update size ratio
    if (originalHeightRef.current > 0) {
      setSizeRatio(finalHeight / originalHeightRef.current);
    }
  };

  // Animation for resizing the output box - Apple-inspired subtle animation
  const animateResize = () => {
    // Don't animate if already resizing or another animation is in progress
    if (isResizing || animationInProgressRef.current) return;

    // Make sure we have all the references and measurements we need
    if (!containerRef.current || !text || currentHeight <= 0) return;

    console.log("Starting animation");
    animationInProgressRef.current = true;
    setIsShowingDragHint(true);

    // Calculate target heights for animation
    const startHeight = currentHeight;
    const maxExpansion = Math.min(startHeight + (6 * LINE_HEIGHT), maxHeight);
    const minContraction = Math.max(startHeight - (3 * LINE_HEIGHT), MINIMUM_BOX_HEIGHT);
    
    // Always ensure we can get back to at least the content-fit height
    const contentFitHeight = calculateFitToContentHeight();
    
    // Waypoints for a subtle, professional animation
    const waypoints = [
      startHeight,                   // Start
      startHeight * 1.05,            // Subtle initial expansion
      maxExpansion * 0.96,           // Approaching max
      maxExpansion,                  // Max expansion
      maxExpansion * 0.98,           // Slight contraction
      minContraction * 1.04,         // Moving toward contraction
      minContraction,                // Min contraction
      minContraction * 1.02,         // Slight expansion
      contentFitHeight * 0.98,       // Approaching original
      contentFitHeight               // Return to content fit height
    ];
    
    // Animation timing - more professional pacing
    const totalDuration = 2800; // ms - shorter duration for more subtle effect
    
    // More natural time distribution
    const segmentDurations = [
      totalDuration * 0.12,    // Initial movement
      totalDuration * 0.13,    // Approach max
      totalDuration * 0.10,    // Reach max
      totalDuration * 0.12,    // Hold briefly
      totalDuration * 0.15,    // Begin contraction
      totalDuration * 0.10,    // Reach min 
      totalDuration * 0.08,    // Hold briefly
      totalDuration * 0.09,    // Begin return
      totalDuration * 0.11     // Complete return
    ];
    
    let currentSegment = 0;
    let segmentStartTime = performance.now();
    let segmentStartHeight = startHeight;
    let segmentTargetHeight = waypoints[1];
    let segmentDuration = segmentDurations[0];
    
    // Animation frame function with Apple-inspired easing
    const animate = (time: number) => {
      const elapsed = time - segmentStartTime;
      
      if (elapsed < segmentDuration) {
        // Calculate progress (0 to 1) for current segment
        const progress = elapsed / segmentDuration;
        
        // Custom cubic-bezier ease function for Apple-like feel
        let easedProgress = cubicBezier(0.25, 0.1, 0.25, 1.0, progress);
        
        // For specific segments, use different cubic-bezier curves
        if (currentSegment === 0) {
          // Initial movement - ease out
          easedProgress = cubicBezier(0.33, 0, 0.67, 1, progress);
        } else if (currentSegment === 3 || currentSegment === 6) {
          // At extremes - more linear
          easedProgress = cubicBezier(0.33, 0.1, 0.67, 1, progress);
        } else if (currentSegment === 8) {
          // Final return - ease in out
          easedProgress = cubicBezier(0.4, 0, 0.2, 1, progress);
        }
        
        // Calculate current height with easing
        const newHeight = segmentStartHeight + (segmentTargetHeight - segmentStartHeight) * easedProgress;
        
        // Update size state
        setSize(prev => ({ ...prev, height: newHeight }));
        setCurrentHeight(newHeight);
        
        // Continue animation
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Move to next segment
        currentSegment++;
        
        if (currentSegment < waypoints.length - 1) {
          // Set up next segment
          segmentStartTime = time;
          segmentStartHeight = waypoints[currentSegment];
          segmentTargetHeight = waypoints[currentSegment + 1];
          segmentDuration = segmentDurations[currentSegment];
          
          // Update display to exact height for this stage
          setSize(prev => ({ ...prev, height: segmentStartHeight }));
          setCurrentHeight(segmentStartHeight);
          
          // Continue to next segment
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Animation complete - ensure we're at least at content-fit height
          const finalHeight = Math.max(calculateFitToContentHeight(), MINIMUM_BOX_HEIGHT);
          setSize(prev => ({ ...prev, height: finalHeight }));
          setCurrentHeight(finalHeight);
          
          // Clean up
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          
          // Reset animation state
          animationInProgressRef.current = false;
          
          // Notify parent that animation is complete
          if (onAnimationComplete) {
            onAnimationComplete();
          }
          
          console.log("Animation completed");
        }
      }
    };
    
    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);
  };
  
  // Apple-inspired cubic bezier easing function implementation
  const cubicBezier = (x1: number, y1: number, x2: number, y2: number, t: number): number => {
    // Precision for t parameter
    const epsilon = 1e-6;
    
    // Newton-Raphson iterations for finding accurate t value
    let tGuess = t;
    
    // Only a few iterations needed for good accuracy
    for (let i = 0; i < 4; i++) {
      const currentX = calcBezier(x1, x2, tGuess);
      const derivative = calcBezierDerivative(x1, x2, tGuess);
      if (Math.abs(currentX - t) < epsilon) break;
      tGuess -= (currentX - t) / derivative;
    }
    
    return calcBezier(y1, y2, tGuess);
  };
  
  // Calculate value at point t for a cubic bezier
  const calcBezier = (a1: number, a2: number, t: number): number => {
    return (((1 - t) ** 3) * 0) + 
           (3 * ((1 - t) ** 2) * t * a1) + 
           (3 * (1 - t) * (t ** 2) * a2) + 
           ((t ** 3) * 1);
  };
  
  // Calculate the derivative at point t to use in Newton-Raphson
  const calcBezierDerivative = (a1: number, a2: number, t: number): number => {
    return 3 * (1 - t) * (1 - t) * a1 + 
           6 * (1 - t) * t * (a2 - a1) + 
           3 * t * t * (1 - a2);
  };

  // Update actual word count whenever text changes
  useEffect(() => {
    if (text) {
      const count = countWords(text);
      setActualWordCount(count);
      
      // Check if this is a response to our last resize request
      if (!isResizing && lastRequestedWordCountRef.current > 0) {
        const requestedCount = lastRequestedWordCountRef.current;
        const diff = Math.abs(count - requestedCount);
        const tolerance = Math.max(5, Math.floor(requestedCount * 0.1)); // 10% tolerance
        
        console.log(`Word count check: requested=${requestedCount}, actual=${count}, diff=${diff}, tolerance=${tolerance}`);
        
        // Reset the last requested count
        lastRequestedWordCountRef.current = 0;
      }
    }
  }, [text, isResizing]);

  // Effect to update dimensions when text changes
  useEffect(() => {
    if (text) {
      const timer = setTimeout(updateHeight, 10);
      return () => clearTimeout(timer);
    }
  }, [text]);
  
  // Effect for animation trigger
  useEffect(() => {
    // Only run animation when shouldPlayAnimation is true, loading is done, and we have text
    if (shouldPlayAnimation && !isLoading && text && contentInitializedRef.current) {
      console.log("Animation trigger received, running after delay");
      
      let hintTimeout: NodeJS.Timeout;
      
      // Give a short delay to make sure all content is fully rendered and measured
      const animationTimer = setTimeout(() => {
        animateResize();
      }, 300);
      
      return () => {
        clearTimeout(animationTimer);
        clearTimeout(hintTimeout);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationInProgressRef.current = false;
        }
      };
    }
  }, [shouldPlayAnimation, isLoading, text]);
  
  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Update height on window resize
  useEffect(() => {
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(updateHeight, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleResizeStart = () => {
    setIsResizing(true);
    setIsShowingDragHint(false);
    setHasUserDragged(true);
    
    // Stop any running animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationInProgressRef.current = false;
    }
  };

  const handleResize = (_: any, __: any, ref: HTMLElement) => {
    const newHeight = ref.clientHeight;
    setCurrentHeight(newHeight);
    setSize(prev => ({ ...prev, height: newHeight }));
    
    // Update estimated word count in real time
    const newEstimatedWordCount = calculateWordsFromHeight(newHeight);
    draggedWordCountRef.current = newEstimatedWordCount;
    setEstimatedWordCount(newEstimatedWordCount);
    
    // Update size ratio
    if (originalHeightRef.current > 0) {
      setSizeRatio(newHeight / originalHeightRef.current);
    }
  };

  const handleResizeStop = () => {
    setIsResizing(false);
    
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    // Use the final dragged word count directly for more precision
    const finalWordCount = draggedWordCountRef.current || estimatedWordCount;
    
    // Round to nearest 25 for cleaner targets
    const roundedWordCount = Math.max(25, Math.round(finalWordCount / 25) * 25);
    
    console.log(`Resize stopped. Requesting ${roundedWordCount} words (from ${finalWordCount} estimated)`);
    
    // Store the requested word count for later verification
    lastRequestedWordCountRef.current = roundedWordCount;
    
    // Delay slightly to ensure UI feels responsive
    resizeTimeoutRef.current = setTimeout(() => {
      // Send the rounded word count to parent
      onResize(roundedWordCount);
    }, 300);
  };

  const handleCopy = async (content: string, type: 'subject' | 'content') => {
    try {
      await navigator.clipboard.writeText(content);
      if (type === 'subject') {
        setCopiedSubject(true);
        setTimeout(() => setCopiedSubject(false), 2000);
      } else {
        setCopiedContent(true);
        setTimeout(() => setCopiedContent(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Format size ratio for display
  const formatRatio = (ratio: number) => {
    if (ratio === 1) return '100%';
    return `${Math.round(ratio * 100)}%`;
  };

  // Get word count display text
  const getWordDisplay = () => {
    if (!hasUserDragged && isShowingDragHint) {
      return "Drag to adjust length";
    }
    if (isResizing) {
      // Round to nearest 25 for cleaner display
      const rounded = Math.max(25, Math.round(estimatedWordCount / 25) * 25);
      return `Target: ${rounded} words`;
    }
    return `${actualWordCount} words`;
  };

  // Calculate space utilization as a percentage
  const spaceUtilization = Math.min(100, Math.round((actualWordCount / (estimatedWordCount || 1)) * 100));

  // Determine if content needs scrolling
  const contentHeight = measureRef.current?.scrollHeight || 0;
  const needsScrolling = contentHeight > currentHeight;
  
  // Animation variants for the wiggle effect
  const wiggleAnimation = {
    wiggle: {
      rotate: [0, -3, 3, -2, 2, -1, 1, 0],
      scale: [1, 1.02, 1, 1.015, 1, 1.01, 1],
      transition: {
        duration: 1.2,
        times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
        ease: "easeInOut",
        repeat: true,
        repeatType: "mirror"
      }
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="flex-1 flex flex-col space-y-4 relative"
      style={{ paddingBottom: HANDLE_MARGIN + 'px' }}
    >
      {/* Background resize text indicator */}
      <div className="absolute bottom-[50%] left-1/2 -translate-x-1/2 flex items-center gap-2 text-gray-200 dark:text-gray-700 pointer-events-none select-none z-0 transition-none">
        <ChevronsUpDown className="w-5 h-5" />
        <span className="text-sm font-medium">Drag to adjust length</span>
        <ChevronsUpDown className="w-5 h-5" />
      </div>
      
      {/* Hidden measurement div with exact same styling */}
      <div 
        ref={measureRef}
        aria-hidden="true"
        className="absolute invisible w-full whitespace-pre-wrap break-words"
        style={{ 
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: 1.5,
          padding: '8px 16px'
        }}
      >
        {text}
      </div>

      {subject && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.4, 0.0, 0.2, 1] } }}
          className="flex flex-col space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCopy(subject, 'subject')}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Copy subject"
            >
              {copiedSubject ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              )}
            </motion.button>
          </div>
          <input
            type="text"
            value={subject}
            readOnly
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
          />
        </motion.div>
      )}

      <div className="flex-1 relative z-10">
        <Resizable
          size={size}
          onResizeStart={handleResizeStart}
          onResize={handleResize}
          onResizeStop={handleResizeStop}
          enable={{ bottom: true }}
          minHeight={MINIMUM_BOX_HEIGHT}
          maxHeight={maxHeight}
          grid={[1, 1]}
          handleStyles={{
            bottom: {
              bottom: '-18px', // Position the handle closer to the box (was -24px)
              height: '24px',
              cursor: 'row-resize'
            }
          }}
          handleComponent={{
            bottom: (
              <motion.div 
                className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-ns-resize"
                animate={isResizing ? "wiggle" : undefined}
                variants={wiggleAnimation}
                style={{ 
                  transformOrigin: "50% -10px",
                  filter: isResizing ? "drop-shadow(0 0 3px rgba(0,0,0,0.1))" : "none"
                }}
              >
                <motion.div 
                  className="w-20 h-2 bg-gray-300 dark:bg-gray-600 rounded-full transition-all duration-200"
                  animate={isResizing ? {
                    width: 28,
                    height: 3,
                    backgroundColor: "rgb(var(--text-primary))"
                  } : {
                    width: 20,
                    height: 2,
                    backgroundColor: "rgb(209 213 219)"
                  }}
                  transition={{ duration: 0.2 }}
                />
                
                <motion.div 
                  className="absolute mt-5 px-3 py-1 bg-gray-900/90 dark:bg-white/90 text-white dark:text-gray-900 text-xs font-medium rounded-md shadow-sm flex items-center gap-1.5 whitespace-nowrap transition-all duration-200"
                  initial={{ opacity: 0 }}
                  animate={isResizing ? {
                    opacity: 1,
                    scale: 1.05,
                    y: 0
                  } : {
                    opacity: 1,
                    scale: 1,
                    y: 2
                  }}
                  transition={{
                    duration: 0.2,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                >
                  {isLoading ? (
                    <Loader2  className="w-3 h-3 animate-spin" />
                  ) : (
                    !hasUserDragged && isShowingDragHint ? (
                      <ChevronsUpDown className="w-3 h-3" />
                    ) : (
                      <MoveVertical className="w-3 h-3" />
                    )
                  )}
                  {getWordDisplay()}
                </motion.div>
              </motion.div>
            )
          }}
        >
          <div className="absolute right-2 top-2 z-10 flex gap-1">
            <button
              onClick={() => handleCopy(text, 'content')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors shadow-sm bg-white dark:bg-gray-800"
              title="Copy content"
            >
              {copiedContent ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              )}
            </button>
          </div>
          
          <div 
            ref={contentRef}
            className={`h-full border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 transition-opacity duration-200 ${
              isLoading ? 'opacity-50' : 'opacity-100'
            } ${needsScrolling ? 'overflow-auto scrollbar-thin' : 'overflow-hidden'}`}
          >
            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-[1.5] px-4 py-2">
              {text}
            </p>
          </div>
        </Resizable>
      </div>

      {isResizing && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.4, 0.0, 0.2, 1] } }}
          exit={{ opacity: 0, y: 5, transition: { duration: 0.15, ease: [0.4, 0.0, 1, 1] } }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-gray-900/90 dark:bg-white/90 text-white dark:text-gray-900 px-4 py-2 rounded-md shadow-sm backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <ZoomIn className="w-4 h-4 opacity-80" />
              <span className="text-sm font-medium whitespace-nowrap">
                {formatRatio(sizeRatio)} of original size
              </span>
            </div>
            <div className="w-full bg-gray-700/50 dark:bg-gray-300/50 h-1 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500/80 rounded-full transition-all duration-200"
                style={{ 
                  width: `${spaceUtilization}%`,
                  transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              />
            </div>
            <div className="text-xs opacity-70">
              {estimatedWordCount} word capacity • {spaceUtilization}% utilized
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}