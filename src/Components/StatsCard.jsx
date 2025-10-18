import React, { useState, useEffect, useRef } from 'react';
import TranslatedText from './TranslatedText';

const StatsCard = ({ icon: Icon, label, value, color, subtitle, animated = false }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !animated) {
      setDisplayValue(value);
      return;
    }

    const duration = 1500; // 1.5 seconds
    const startValue = 0;
    const increment = value / (duration / 16); // 60fps

    const animate = (timestamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const progress = timestamp - startTimeRef.current;
      const currentValue = Math.min(startValue + increment * (progress / 16), value);

      setDisplayValue(Math.floor(currentValue));

      if (progress < duration) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [value, isVisible, animated]);

  const gradientClass = 
    color === 'text-orange-600' ? 'from-orange-50 to-orange-100' :
    color === 'text-blue-600' ? 'from-blue-50 to-blue-100' :
    'from-green-50 to-green-100';

  return (
    <div 
      ref={cardRef}
      className="group bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-white/40 hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
      role="region"
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-600 truncate mb-1">
            <TranslatedText>{label}</TranslatedText>
          </p>
          <p className={`text-2xl font-bold ${color} mb-1 truncate`}>
            {displayValue.toLocaleString()}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 opacity-80">
              <TranslatedText>{subtitle}</TranslatedText>
            </p>
          )}
        </div>
        <div 
          className={`p-3 rounded-xl bg-gradient-to-br ${gradientClass} ml-3 flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon className={`text-xl ${color}`} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;