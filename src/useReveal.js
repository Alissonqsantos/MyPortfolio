import { useEffect } from 'react';

// Reveals on-scroll — receita Olha do DS alisson: IO threshold .18,
// classe .reveal → .reveal-visivel com al-rise .8s no easing --al-roll.
// Sem GSAP: só observa e marca. Off em reduced-motion (CSS resolve).
export default function useReveal(ref, seletor = '.reveal') {
  useEffect(() => {
    const raiz = ref.current;
    if (!raiz || typeof IntersectionObserver === 'undefined') return;
    const els = raiz.querySelectorAll(seletor);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('reveal-visivel');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ref, seletor]);
}
