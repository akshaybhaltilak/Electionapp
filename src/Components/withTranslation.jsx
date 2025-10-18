import React, { useState, useEffect } from 'react';

const withTranslation = (WrappedComponent) => {
  return (props) => {
    const [translatedProps, setTranslatedProps] = useState(props);
    const currentLanguage = localStorage.getItem('preferredLanguage') || 'en';

    useEffect(() => {
      if (currentLanguage !== 'en') {
        translateProps(props, currentLanguage);
      }
    }, [props, currentLanguage]);

    const translateProps = async (propsToTranslate, targetLang) => {
      const translated = await translateObject(propsToTranslate, targetLang);
      setTranslatedProps(translated);
    };

    const translateObject = async (obj, targetLang) => {
      if (typeof obj === 'string') {
        return await translateText(obj, targetLang);
      }
      
      if (Array.isArray(obj)) {
        return Promise.all(obj.map(item => translateObject(item, targetLang)));
      }
      
      if (typeof obj === 'object' && obj !== null) {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = await translateObject(value, targetLang);
        }
        return result;
      }
      
      return obj;
    };

    const translateText = async (text, targetLang) => {
      if (!text || targetLang === 'en') return text;
      
      try {
        const response = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
        );
        const data = await response.json();
        return data[0][0][0] || text;
      } catch (error) {
        console.warn('Translation failed:', error);
        return text;
      }
    };

    return <WrappedComponent {...translatedProps} />;
  };
};

export default withTranslation;