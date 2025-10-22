import React, { useState, useEffect } from 'react';

interface AnimatedProgressProps {
  messages: string[];
  interval?: number;
  className?: string;
}

export const AnimatedProgress: React.FC<AnimatedProgressProps> = ({
  messages,
  interval = 3000,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (messages.length <= 1) return;

    const timer = setInterval(() => {
      setIsVisible(false);

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % messages.length);
        setIsVisible(true);
      }, 200); // Brief fade out before changing text
    }, interval);

    return () => clearInterval(timer);
  }, [messages, interval]);

  if (messages.length === 0) return null;

  return (
    <div className={`transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-50'} ${className}`}>
      <div className="flex items-center space-x-2">
        {/* Animated spinner */}
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>

        {/* Animated text */}
        <span className="text-sm text-gray-600">
          {messages[currentIndex]}
        </span>
      </div>
    </div>
  );
};
