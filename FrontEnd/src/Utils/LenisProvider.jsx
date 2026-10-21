// src/context/LenisContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';

const LenisContext = createContext(null);

export const LenisProvider = ({ children }) => {
  const lenisRef = useRef(null);
  const [lenisInstance, setLenisInstance] = useState(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const lenis = new Lenis({
      smooth: true,
      // Visitors who ask for less motion get native, instant scrolling.
      smoothWheel: !reduceMotion,
      // Same-page "#section" links scroll through Lenis (a plain jump gets
      // overwritten by its loop), clearing the fixed header.
      anchors: { offset: -110 },
    });

    lenisRef.current = lenis;
    setLenisInstance(lenis);

    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <LenisContext.Provider value={lenisInstance}>
      {children}
    </LenisContext.Provider>
  );
};

export const useLenis = () => {
  return useContext(LenisContext);
};
