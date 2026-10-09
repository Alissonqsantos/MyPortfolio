import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HERO } from './hero-copy.js';
import { createAlScene } from './al/scene.js';
import { CHAPTERS, chapterIndexFor } from './al/choreography.js';

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const heroRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [capitulo, setCapitulo] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const scene = createAlScene(canvasRef.current);
    sceneRef.current = scene;
    scene.setProgress(0);
    let st = null;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReduced(true);
    } else {
      st = ScrollTrigger.create({
        trigger: heroRef.current,
        start: 'top top',
        end: '+=400%',            // 5 telas no total
        pin: true,
        scrub: true,
        onUpdate: (self) => {
          const t = self.progress;               // 0..1 já normalizado pelo GSAP
          sceneRef.current.setProgress(t);
          setCapitulo(chapterIndexFor(t));
        },
      });
    }
    const onResize = () => {
      scene.resize();
      ScrollTrigger.refresh();
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (st) st.kill();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const cap = CHAPTERS[capitulo];

  return (
    <section className="hero" ref={heroRef}>
      <div className="hero-canvas-wrap" aria-hidden="true">
        <canvas ref={canvasRef} />
      </div>
      <div className="hero-ident">
        <h1>{HERO.nome}</h1>
        <p>{HERO.cargo}</p>
      </div>
      {reduced ? (
        <ol className="hero-chapters">
          {CHAPTERS.map((c) => (
            <li key={c.n}>
              <span className="hero-chapter-n">{c.n}</span>
              <span className="hero-chapter-word">{c.word}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="hero-chapter" aria-live="polite" key={capitulo}>
          <span className="hero-chapter-n">{cap.n}</span>
          <span className="hero-chapter-word">{cap.word}</span>
        </div>
      )}
    </section>
  );
}
