import { useState, useEffect } from 'react';

export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isSmallDevice = windowSize.width <= 768;
  const isMediumDevice = windowSize.width > 768 && windowSize.width <= 992;
  const isLargeDevice = windowSize.width > 992 && windowSize.width <= 1200;
  const isExtraLargeDevice = windowSize.width > 1200;

  return {
    isSmallDevice,
    isMediumDevice,
    isLargeDevice,
    isExtraLargeDevice,
    windowWidth: windowSize.width,
    windowHeight: windowSize.height,
  };
};

