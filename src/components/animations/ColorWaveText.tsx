interface ColorWaveTextProps {
  text: string;
  className?: string;
}

export const ColorWaveText = ({ text, className = '' }: ColorWaveTextProps) => {
  return (
    <span className={`inline-block ${className}`}>
      {text.split('').map((char, index) => (
        <span
          key={index}
          className="inline-block animate-color-wave"
          style={{
            animationDelay: `${index * 0.1}s`,
            animationDuration: '3s'
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
};
