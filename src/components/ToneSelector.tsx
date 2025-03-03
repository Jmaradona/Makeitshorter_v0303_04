import React from 'react';
import { motion } from 'framer-motion';
import { ScanLine } from 'lucide-react';

interface ToneSelectorProps {
  selectedTone: string;
  onToneSelect: (tone: string) => void;
  selectedLength: string;
  onLengthSelect: (length: string) => void;
}

const tones = [
  { id: 'professional', label: 'Professional', description: 'Formal and business-appropriate' },
  { id: 'friendly', label: 'Friendly', description: 'Warm and conversational' },
  { id: 'confident', label: 'Confident', description: 'Strong and assertive' },
  { id: 'empathetic', label: 'Empathetic', description: 'Understanding and supportive' },
  { id: 'neutral', label: 'Neutral', description: 'Balanced and objective' },
  { id: 'persuasive', label: 'Persuasive', description: 'Convincing and influential' },
];

const lengths = [
  { id: 'concise', label: 'Shorter', description: '50% shorter than original', adjustment: 50 },
  { id: 'balanced', label: 'Same Length', description: 'Keep original length', adjustment: 100 },
  { id: 'detailed', label: 'Longer', description: 'Expanded with rich details', adjustment: 400 },
];

export default function ToneSelector({ selectedTone, onToneSelect, selectedLength, onLengthSelect }: ToneSelectorProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Tone
        </label>
        <div className="flex flex-wrap gap-2">
          {tones.map((tone) => (
            <motion.button
              key={tone.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onToneSelect(tone.id)}
              className={`tag-button ${
                selectedTone === tone.id
                  ? 'tag-button-selected'
                  : 'tag-button-unselected'
              }`}
              title={tone.description}
            >
              {tone.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <ScanLine className="w-4 h-4" />
          Target Length
        </label>
        <div className="flex flex-wrap gap-2">
          {lengths.map((length) => (
            <motion.button
              key={length.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onLengthSelect(length.id)}
              className={`tag-button ${
                selectedLength === length.id
                  ? 'tag-button-selected'
                  : 'tag-button-unselected'
              }`}
              title={`${length.description}`}
            >
              {length.label}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}