interface ColorWaveTextProps {
  text: string;
  className?: string;
}
export const ColorWaveText = ({
  text,
  className = ''
}: ColorWaveTextProps) => {
  return <span className={`inline-block ${className}`}>
      {text.split('').map((char, index) => <span key={index} style={{
      animationDelay: `${index * 0.1}s`,
      animationDuration: '3s'
    }} className="inline-block animate-color-wave text-6xl">
          {char === ' ' ? '\u00A0' : char}
        </span>)}
    </span>;
};