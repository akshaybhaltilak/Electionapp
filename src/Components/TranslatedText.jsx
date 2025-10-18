import React, { useState, useEffect } from 'react';
import useAutoTranslate from '../hooks/useAutoTranslate';

const TranslatedText = ({ children, className = '' }) => {
  const [translatedText, setTranslatedText] = useState(children);
  const { currentLanguage, translateText, translating } = useAutoTranslate();

  useEffect(() => {
    const translate = async () => {
      if (currentLanguage !== 'en' && children) {
        const translated = await translateText(children, currentLanguage);
        setTranslatedText(translated);
      } else {
        setTranslatedText(children);
      }
    };

    translate();
  }, [children, currentLanguage, translateText]);

  return (
    <span className={className}>
      {translating && currentLanguage !== 'en' ? 'Translating...' : translatedText}
    </span>
  );
};

export default TranslatedText;