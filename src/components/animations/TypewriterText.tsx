import { useEffect, useState } from 'react';

interface TypewriterTextProps {
  text: string;
  className?: string;
  delay?: number;
  typingSpeed?: number;
}

export const TypewriterText = ({ 
  text, 
  className = '', 
  delay = 500,
  typingSpeed = 100 
}: TypewriterTextProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  
  useEffect(() => {
    // Start typing after initial delay
    const startTimer = setTimeout(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      } else if (!isTypingComplete) {
        setIsTypingComplete(true);
        // Hide cursor after typing is complete
        setTimeout(() => setShowCursor(false), 500);
      }
    }, currentIndex === 0 ? delay : typingSpeed);
    
    return () => clearTimeout(startTimer);
  }, [currentIndex, text, delay, typingSpeed, isTypingComplete]);
  
  return (
    <span className={`inline-block ${className}`}>
      {displayedText}
      {showCursor && (
        <span className="inline-block w-0.5 h-[1em] bg-primary ml-1 animate-blink-caret" />
      )}
    </span>
  );
};
