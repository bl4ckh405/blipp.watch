'use client';

import React, { useState, useCallback } from 'react';
import { generateVideoIdea } from '../services/geminiService';
import { VideoIdea } from '../types';
import { SparklesIcon, CloseIcon, LoadingIcon } from './Icons';

interface CreatorStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreatorStudioModal: React.FC<CreatorStudioModalProps> = ({ isOpen, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateIdeas = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setIdeas([]);
    try {
      const generatedIdeas = await generateVideoIdea(prompt);
      setIdeas(generatedIdeas);
    } catch (e) {
      setError('Failed to generate ideas. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [prompt]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-2xl p-8 relative transform transition-all duration-300 scale-95 animate-scale-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
          <CloseIcon className="w-6 h-6" />
        </button>
        <div className="flex items-center space-x-3 mb-6">
          <SparklesIcon className="w-8 h-8 text-emerald-400" />
          <h2 className="text-3xl font-bold">Creator Studio AI</h2>
        </div>
        <p className="text-zinc-400 mb-6">
          Unleash your creativity. Describe your topic, and our AI will brainstorm engaging video ideas for you.
        </p>

        <div className="flex space-x-2 mb-6">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'a funny video about cats'"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={isLoading}
          />
          <button
            onClick={handleGenerateIdeas}
            disabled={isLoading || !prompt.trim()}
            className="flex items-center justify-center bg-emerald-500 text-black font-bold px-6 py-3 rounded-lg hover:bg-emerald-600 transition-colors disabled:bg-zinc-600 disabled:cursor-not-allowed"
          >
            {isLoading ? <LoadingIcon className="w-6 h-6 animate-spin" /> : 'Generate'}
          </button>
        </div>

        <div className="space-y-4 h-64 overflow-y-auto pr-2">
            {error && <p className="text-red-500 text-center">{error}</p>}
            {ideas.map((idea, index) => (
                <div key={index} className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
                    <h3 className="font-bold text-emerald-400 text-lg">{idea.title}</h3>
                    <p className="text-zinc-300 mt-1">{idea.description}</p>
                </div>
            ))}
             {!isLoading && ideas.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                    <p>Your generated ideas will appear here.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};


