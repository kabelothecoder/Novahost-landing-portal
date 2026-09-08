import { ReactNode } from "react";

interface PixelHeroProps {
  word1: ReactNode;
  word2: ReactNode;
  description: string;
  primaryActionText: string;
  secondaryActionText: string;
  onPrimaryClick: () => void;
  onSecondaryClick: () => void;
}

export function PixelHero({
  word1, word2, description, primaryActionText, secondaryActionText, onPrimaryClick, onSecondaryClick
}: PixelHeroProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_50%)] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center">
        <h1 className="text-6xl md:text-8xl font-bold mb-6 flex gap-4 flex-wrap justify-center items-center">
          {word1} {word2}
        </h1>
        <p className="text-lg md:text-xl text-white/50 max-w-2xl mb-12 leading-relaxed">
          {description}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={onPrimaryClick} 
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-full font-bold transition-all shadow-lg shadow-indigo-600/20"
          >
            {primaryActionText}
          </button>
          <button 
            onClick={onSecondaryClick} 
            className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-full font-bold transition-all border border-white/10 backdrop-blur-sm"
          >
            {secondaryActionText}
          </button>
        </div>
      </div>
    </div>
  );
}
