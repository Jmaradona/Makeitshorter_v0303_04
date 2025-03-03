export function countWords(text: string): number {
  // Remove extra whitespace and split into words
  const words = text
    .trim()
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(word => word.length > 0);

  return words.length;
}

// Typography constants for more accurate word estimation
const TYPOGRAPHY = {
  // Average character width in pixels (for standard body text)
  charWidth: 8.1,
  // Standard line height in pixels (including spacing)
  lineHeight: 24,
  // Average characters per word (including space)
  charsPerWord: 6,
  // Container padding (horizontal + vertical)
  padding: {
    horizontal: 32,
    vertical: 16
  },
  // Font size in pixels
  fontSize: 16
};

export function calculateWordsFromHeight(height: number): number {
  if (height <= 0) return 0;
  
  // Calculate available content area (accounting for padding)
  const availableHeight = Math.max(0, height - TYPOGRAPHY.padding.vertical);
  
  // Approximate container width (typical column width)
  const containerWidth = 600;
  const availableWidth = containerWidth - TYPOGRAPHY.padding.horizontal;
  
  // Calculate number of characters per line based on available width
  const charsPerLine = Math.floor(availableWidth / TYPOGRAPHY.charWidth);
  
  // Calculate number of lines that can fit in the available height
  const numberOfLines = Math.floor(availableHeight / TYPOGRAPHY.lineHeight);
  
  // Calculate total characters that can fit
  const totalChars = numberOfLines * charsPerLine;
  
  // Convert characters to words
  const estimatedWords = Math.floor(totalChars / TYPOGRAPHY.charsPerWord);
  
  // Apply a density factor to account for real-world text behavior
  const densityFactor = 0.85; // Text rarely fills 100% of available space
  
  // Return rounded number (to nearest 5) with a minimum value
  return Math.max(20, Math.round((estimatedWords * densityFactor) / 5) * 5);
}

export function estimateHeightFromWords(wordCount: number): number {
  if (wordCount <= 0) return 50; // Minimum height
  
  // Convert words to characters
  const totalChars = wordCount * TYPOGRAPHY.charsPerWord;
  
  // Approximate container width
  const containerWidth = 600;
  const availableWidth = containerWidth - TYPOGRAPHY.padding.horizontal;
  
  // Calculate number of characters per line
  const charsPerLine = Math.floor(availableWidth / TYPOGRAPHY.charWidth);
  
  // Calculate number of lines needed
  const numberOfLines = Math.ceil(totalChars / charsPerLine);
  
  // Calculate required height
  const contentHeight = numberOfLines * TYPOGRAPHY.lineHeight;
  
  // Add padding
  return contentHeight + TYPOGRAPHY.padding.vertical;
}

export function cleanAIResponse(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/_{2,}/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .trim();
}

// Verify exact word count for a string
export function verifyWordCount(text: string, targetCount: number): boolean {
  const count = countWords(text);
  return count === targetCount;
}

// Adjust text to match exact word count
export function adjustTextToWordCount(text: string, targetCount: number): string {
  const words = text.split(/\s+/);
  const currentCount = words.length;
  
  if (currentCount === targetCount) {
    return text;
  }
  
  if (currentCount > targetCount) {
    // If too many words, truncate
    return words.slice(0, targetCount).join(' ');
  } else {
    // If too few words, add filler
    const fillerWords = [
      'additionally', 'furthermore', 'moreover', 'consequently',
      'specifically', 'particularly', 'certainly', 'definitely'
    ];
    
    const missing = targetCount - currentCount;
    const fillers = Array(missing)
      .fill(0)
      .map(() => fillerWords[Math.floor(Math.random() * fillerWords.length)]);
    
    return [...words, ...fillers].join(' ');
  }
}