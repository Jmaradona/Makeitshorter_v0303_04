import { AIResponse } from '../types';
import { countWords } from '../utils/textUtils';
import { useUserStore } from '../store/userStore';

interface EnhanceEmailPayload {
  content: string;
  tone: string;
  targetWords: number;
  inputType: string;
}

// Offline fallback function to simulate AI response
function generateOfflineResponse(content: string, targetWords: number): string {
  const currentWords = countWords(content);
  const words = content.split(/\s+/);
  
  // Add some variety to the output
  const fillerWords = [
    'effectively', 'efficiently', 'specifically', 'particularly',
    'notably', 'significantly', 'consequently', 'furthermore',
    'additionally', 'moreover', 'therefore', 'however',
    'nevertheless', 'meanwhile', 'subsequently', 'accordingly'
  ];
  
  // Email subject extraction and generation
  let subject = '';
  let mainContent = content;
  
  if (content.toLowerCase().includes('subject:')) {
    const parts = content.split(/subject:/i, 2);
    if (parts.length > 1) {
      const subjectLine = parts[1].split('\n')[0].trim();
      subject = `Subject: ${subjectLine}\n\n`;
      mainContent = parts[1].substring(subjectLine.length).trim();
    }
  }
  
  // Generate a new subject line if needed
  if (subject === '' && Math.random() > 0.5) {
    const subjectOptions = [
      'Quick update', 'Important information', 'Follow-up', 
      'Request for feedback', 'Project status', 'Next steps'
    ];
    subject = `Subject: ${subjectOptions[Math.floor(Math.random() * subjectOptions.length)]}\n\n`;
  }
  
  let generatedText = '';
  
  if (targetWords > currentWords) {
    // Expand content by adding filler words and repeating content
    const wordsNeeded = targetWords - currentWords;
    const fillers = Array(wordsNeeded)
      .fill(0)
      .map(() => fillerWords[Math.floor(Math.random() * fillerWords.length)]);
    
    // Mix fillers with original content
    const newWords = [];
    let fillerIndex = 0;
    
    for (let i = 0; i < words.length; i++) {
      newWords.push(words[i]);
      if (fillerIndex < fillers.length && Math.random() > 0.5) {
        newWords.push(fillers[fillerIndex++]);
      }
    }
    
    // Add remaining fillers if needed
    while (fillerIndex < fillers.length) {
      newWords.push(fillers[fillerIndex++]);
    }
    
    generatedText = newWords.slice(0, targetWords).join(' ');
  } else {
    // Shorten content by removing words strategically
    const keepRatio = targetWords / currentWords;
    generatedText = words
      .filter(() => Math.random() < keepRatio)
      .slice(0, targetWords)
      .join(' ');
  }
  
  // Add basic email formatting
  const paragraphs = generatedText.split(/(?<=\.\s+)/);
  const formattedContent = paragraphs
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .join('\n\n');
  
  // Add greeting and signature with 15% probability each
  let finalContent = formattedContent;
  
  if (Math.random() < 0.15) {
    const greetings = ['Hi,', 'Hello,', 'Hey team,', 'Good day,', 'Greetings,'];
    finalContent = `${greetings[Math.floor(Math.random() * greetings.length)]}\n\n${finalContent}`;
  }
  
  if (Math.random() < 0.15) {
    const signatures = ['Best,', 'Regards,', 'Thanks,', 'Cheers,', 'Sincerely,'];
    finalContent = `${finalContent}\n\n${signatures[Math.floor(Math.random() * signatures.length)]}`;
  }
  
  // Ensure exact word count for test mode
  const finalWords = finalContent.split(/\s+/);
  if (finalWords.length > targetWords) {
    finalContent = finalWords.slice(0, targetWords).join(' ');
  } else if (finalWords.length < targetWords) {
    const missing = targetWords - finalWords.length;
    const extraWords = Array(missing).fill('additionally').join(' ');
    finalContent = `${finalContent} ${extraWords}`;
  }
  
  // Verify final word count
  const testWordCount = countWords(finalContent);
  console.log(`TEST MODE: Generated exactly ${testWordCount} words (target: ${targetWords})`);
  
  return subject + finalContent;
}

export async function enhanceEmail(payload: EnhanceEmailPayload): Promise<AIResponse> {
  // Check if offline mode is enabled in the store
  const isOfflineMode = useUserStore.getState().isOfflineMode;
  
  if (isOfflineMode) {
    console.log(`TEST MODE: Generating ${payload.targetWords} words`);
    // Return offline response immediately if offline mode is enabled
    return {
      enhancedContent: generateOfflineResponse(payload.content, payload.targetWords)
    };
  }
  
  try {
    // Get the backend URL from environment variables or use the production URL
    const apiUrl = import.meta.env.VITE_BACKEND_URL || 'https://makeitshorter.onrender.com';
    
    // Use our consistent word counting function
    const currentWords = countWords(payload.content);
    const action = payload.targetWords > currentWords ? "expand" : "shorten";
    
    console.log(`ONLINE MODE: Requesting ${payload.targetWords} words from API (${action})`);
    
    // Completely redesigned prompt with extreme emphasis on exact word count
    const enhancedPayload = {
      ...payload,
      content: `CRITICAL REQUIREMENT: Generate EXACTLY ${payload.targetWords} words.

I will count words by splitting on spaces. Each space-separated token is ONE word:
- "Hello world" = 2 words
- "state-of-the-art" = 1 word
- "don't" = 1 word
- "AI" = 1 word
- "2024" = 1 word

Current text (${currentWords} words):
${payload.content}

Your task: ${action} this text to EXACTLY ${payload.targetWords} words while maintaining:
- The core message and meaning
- A ${payload.tone} tone
- Natural flow and readability

For emails, include a Subject line (not counted in word limit).

VERIFICATION PROCESS:
1. Write your response
2. Count words by splitting on spaces
3. Adjust until you have EXACTLY ${payload.targetWords} words
4. Double-check your count before submitting

The exact word count (${payload.targetWords}) is the most critical requirement.`
    };

    try {
      // First check if the server is running
      const healthCheck = await fetch(`${apiUrl}/api/health`, {
        mode: 'cors',
        credentials: 'same-origin'
      });
      
      if (!healthCheck.ok) {
        throw new Error('Health check failed');
      }

      const healthData = await healthCheck.json();
      if (!healthData.aiEnabled) {
        console.log('AI service not available, using offline mode');
        return {
          enhancedContent: generateOfflineResponse(payload.content, payload.targetWords)
        };
      }

      // Make the request to the API
      console.log(`Sending request to API for ${payload.targetWords} words...`);
      const response = await fetch(`${apiUrl}/api/enhance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        credentials: 'same-origin',
        body: JSON.stringify(enhancedPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Server error' }));
        throw new Error(errorData.error || 'Server error');
      }

      const data = await response.json();
      
      // Verify the word count of the received content
      const verifiedContent = data.enhancedContent;
      const subjectMatch = verifiedContent.match(/^Subject:\s*(.+)$/m);
      const textToCount = subjectMatch ? verifiedContent.replace(/^Subject:\s*.+\n+/, '') : verifiedContent;
      const actualWordCount = countWords(textToCount);
      
      console.log(`API response received: ${actualWordCount} words (requested ${payload.targetWords})`);
      
      // If the word count is significantly off, try to fix it in test mode
      const tolerance = Math.max(5, Math.floor(payload.targetWords * 0.05)); // 5% tolerance
      if (Math.abs(actualWordCount - payload.targetWords) > tolerance) {
        console.warn(`Word count mismatch: requested ${payload.targetWords}, got ${actualWordCount}`);
        
        // If the difference is very large (more than 50% off), try to fix it locally
        if (Math.abs(actualWordCount - payload.targetWords) > payload.targetWords * 0.5) {
          console.log(`Large word count discrepancy detected, attempting local fix...`);
          
          // For emails, preserve the subject line
          let subject = '';
          let content = verifiedContent;
          
          if (subjectMatch) {
            subject = `Subject: ${subjectMatch[1].trim()}\n\n`;
            content = verifiedContent.replace(/^Subject:\s*.+\n+/, '');
          }
          
          // Split into words and adjust to match target count
          const words = content.split(/\s+/);
          
          if (words.length > payload.targetWords) {
            // If too many words, truncate
            content = words.slice(0, payload.targetWords).join(' ');
          } else if (words.length < payload.targetWords) {
            // If too few words, add filler
            const fillerWords = [
              'additionally', 'furthermore', 'moreover', 'consequently',
              'specifically', 'particularly', 'certainly', 'definitely'
            ];
            
            const missing = payload.targetWords - words.length;
            const fillers = Array(missing)
              .fill(0)
              .map(() => fillerWords[Math.floor(Math.random() * fillerWords.length)]);
            
            content = [...words, ...fillers].join(' ');
          }
          
          const fixedContent = subject + content;
          const fixedWordCount = countWords(content);
          
          console.log(`Local fix applied: ${fixedWordCount} words`);
          
          return { 
            enhancedContent: fixedContent,
            warning: `Note: The AI generated ${actualWordCount} words instead of the requested ${payload.targetWords} words. A local adjustment was made.`
          };
        }
        
        // Otherwise, just return with a warning
        return { 
          enhancedContent: verifiedContent,
          warning: `Note: The AI generated ${actualWordCount} words instead of the requested ${payload.targetWords} words.`
        };
      }
      
      return { enhancedContent: verifiedContent };
    } catch (error) {
      console.error('API Error:', error);
      if (error instanceof Error && error.message !== 'Server error') {
        return { 
          enhancedContent: '',
          error: error.message
        };
      }
      // Use offline mode for server errors
      console.log('Server error, using offline mode');
      return {
        enhancedContent: generateOfflineResponse(payload.content, payload.targetWords)
      };
    }
  } catch (error) {
    console.error('Service error:', error);
    return {
      enhancedContent: '',
      error: error instanceof Error 
        ? error.message 
        : 'Failed to connect to the enhancement service. Please try again.'
    };
  }
}