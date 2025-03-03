import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Constants for token control - INCREASED LIMITS
const MAX_INPUT_TOKENS = 16000;
const MAX_OUTPUT_TOKENS = 8000;  // Increased from 4000 to 8000 for longer outputs
const TOKENS_PER_WORD = 1.3;

// Initialize OpenAI with better error handling
let openai = null;
try {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://api.openai.com/v1',
  });
  
  console.log('OpenAI client initialized successfully');
} catch (error) {
  console.error('Failed to initialize OpenAI:', error.message);
}

function countWords(text) {
  return text
    .trim()
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(word => word.length > 0)
    .length;
}

function estimateTokens(text) {
  return Math.ceil(countWords(text) * TOKENS_PER_WORD);
}

// Configure CORS to allow requests from all deployment domains
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://makeitshorterfrontend.onrender.com',
    'https://makeitshorter.onrender.com'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false // Changed to false since we're not using cookies
}));

app.use(express.json());

// Basic route to check if server is running
app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.get('/api/health', (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    aiEnabled: !!apiKey && !!openai
  });
});

app.post('/api/enhance', async (req, res) => {
  if (!openai) {
    return res.status(503).json({
      error: 'AI enhancement is currently unavailable. Please check the server configuration.'
    });
  }

  try {
    const { content, tone, targetWords, inputType } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (!targetWords || targetWords < 1) {
      return res.status(400).json({ error: 'Invalid target word count' });
    }

    const estimatedInputTokens = estimateTokens(content);
    if (estimatedInputTokens > MAX_INPUT_TOKENS) {
      return res.status(400).json({ 
        error: `Input too long. Maximum ${MAX_INPUT_TOKENS} tokens allowed.`
      });
    }

    // Significantly increased token allocation for longer outputs
    const maxOutputTokens = Math.min(
      MAX_OUTPUT_TOKENS,
      Math.max(2000, Math.ceil(targetWords * TOKENS_PER_WORD * 2.5))
    );

    // Completely redesigned prompt with extreme emphasis on exact word count
    const systemPrompt = `You are a writing assistant that rewrites text to EXACTLY the requested word count.

CRITICAL WORD COUNT REQUIREMENT:
Your output MUST contain EXACTLY ${targetWords} words - no more, no less.

Word counting rules:
1. Words are separated by spaces
2. Hyphenated terms like "state-of-the-art" count as ONE word
3. Contractions like "don't" count as ONE word
4. Acronyms like "AI" or "USA" count as ONE word
5. Numbers like "2024" count as ONE word
6. For emails, the "Subject:" line is NOT counted in the word limit

TASK:
Rewrite the following ${inputType} in ${tone} tone with EXACTLY ${targetWords} words.

FORMAT:
${inputType === 'email' 
  ? 'Subject: [Your subject line]\n\n[Your content with EXACTLY ' + targetWords + ' words]' 
  : '[Your content with EXACTLY ' + targetWords + ' words]'}

MANDATORY VERIFICATION PROCESS:
1. Write your response
2. Count the words by splitting on spaces and counting the resulting array length
3. If not EXACTLY ${targetWords} words, adjust and recount
4. Only submit when you have EXACTLY ${targetWords} words

This is a strict requirement - the exact word count is more important than preserving all details from the original text.`;

    console.log(`Processing request for EXACTLY ${targetWords} words of content...`);

    // First attempt with standard settings
    let completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content }
      ],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens: maxOutputTokens,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    let enhancedContent = completion.choices[0]?.message?.content?.trim();
    
    if (!enhancedContent) {
      throw new Error('No content received from AI');
    }

    // Verify word count in backend for accuracy
    const subjectMatch = enhancedContent.match(/^Subject:.*?\n(.*)/s);
    const textToCount = subjectMatch ? subjectMatch[1].trim() : enhancedContent.trim();
    let wordCount = countWords(textToCount);

    console.log(`First attempt: AI returned ${wordCount} words (requested ${targetWords})`);
    
    // If word count is significantly off, try again with a more explicit approach
    if (Math.abs(wordCount - targetWords) > Math.min(10, targetWords * 0.1)) {
      console.log(`Word count too far off (${wordCount} vs ${targetWords}), trying second attempt...`);
      
      // Second attempt with more explicit instructions and examples
      const retryPrompt = `You previously generated text with ${wordCount} words, but I need EXACTLY ${targetWords} words.

CRITICAL: Count words by splitting on spaces and counting. Each space-separated token is ONE word.

Examples of counting:
- "Hello world" = 2 words
- "state-of-the-art technology" = 3 words
- "don't worry about it" = 4 words
- "AI in 2024" = 3 words

Original content:
${enhancedContent}

Please adjust to EXACTLY ${targetWords} words. The exact count is critical.`;

      completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content },
          { role: "assistant", content: enhancedContent },
          { role: "user", content: retryPrompt }
        ],
        model: "gpt-3.5-turbo",
        temperature: 0.5, // Lower temperature for more precise following of instructions
        max_tokens: maxOutputTokens,
        presence_penalty: 0.2,
        frequency_penalty: 0.2,
      });

      enhancedContent = completion.choices[0]?.message?.content?.trim();
      
      // Re-verify word count
      const subjectMatch = enhancedContent.match(/^Subject:.*?\n(.*)/s);
      const textToCount = subjectMatch ? subjectMatch[1].trim() : enhancedContent.trim();
      wordCount = countWords(textToCount);
      
      console.log(`Second attempt: AI returned ${wordCount} words (requested ${targetWords})`);
    }
    
    // Final check and response
    const tolerance = Math.max(5, Math.floor(targetWords * 0.05)); // 5% tolerance
    const minWords = targetWords - tolerance;
    const maxWords = targetWords + tolerance;
    
    if (wordCount < minWords || wordCount > maxWords) {
      console.warn(`Word count still outside tolerance: requested ${targetWords}, got ${wordCount}`);
      return res.json({ 
        enhancedContent,
        wordCount,
        warning: `The AI generated ${wordCount} words. This may differ from the ${targetWords} words requested.`
      });
    }

    res.json({ 
      enhancedContent,
      wordCount
    });
  } catch (error) {
    console.error('API Error:', error);
    
    if (error.response?.status === 401) {
      res.status(401).json({ 
        error: 'Invalid API key. Please check your OpenAI API key configuration.'
      });
    } else if (error.response?.status === 429) {
      res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again in a moment.' 
      });
    } else {
      res.status(500).json({ 
        error: error.message || 'Failed to enhance content. Please try again.' 
      });
    }
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  if (!process.env.OPENAI_API_KEY) {
    console.log('\nWARNING: OpenAI API key is missing. AI features will be disabled.');
    console.log('To enable AI features, add OPENAI_API_KEY to your environment variables.\n');
  }
});