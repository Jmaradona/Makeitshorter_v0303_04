import React from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, MessageCircle } from 'lucide-react';

interface InputTypeSelectorProps {
  selectedType: string;
  onTypeSelect: (type: string) => void;
}

const inputTypes = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'teams', label: 'Teams', icon: MessageSquare },
  { id: 'text', label: 'Text', icon: MessageCircle },
];

export default function InputTypeSelector({ selectedType, onTypeSelect }: InputTypeSelectorProps) {
  return (
    <div className="flex gap-1">
      {inputTypes.map((type) => {
        const Icon = type.icon;
        const isSelected = selectedType === type.id;
        
        return (
          <motion.button
            key={type.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => onTypeSelect(type.id)}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              isSelected
                ? 'bg-gray-900 text-white shadow-md scale-105'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            title={`${type.label} message`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm">{type.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}