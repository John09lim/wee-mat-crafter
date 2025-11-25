import { useEffect, useState } from 'react';

interface TypewriterTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export const TypewriterText = ({ text, className = '', delay = 500 }: TypewriterTextProps) => {
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTypingComplete(true);
    }, delay + 2000);
    
    return () => clearTimeout(timer);
  }, [delay]);
  
  return (
    <span 
      className={`inline-block ${!isTypingComplete ? 'typewriter' : 'typewriter-done'} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {text}
    </span>
  );
};
