import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { prefereReduzirMovimento } from './al/webgl.js';

gsap.registerPlugin(ScrollTrigger);

// Scroll suave do portfólio — receita portfolio-alisson:
// Lenis + ScrollTrigger.update + ticker.raf, lagSmoothing 0.
// Off total sob reduced-motion (retorna null → fallback nativo).
export default function useLenis() {
  const lenisRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (prefereReduzirMovimento()) return;
    const lenis = new Lenis({ lagSmoothing: 0 });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (t) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return lenisRef;
}
