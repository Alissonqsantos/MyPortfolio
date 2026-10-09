import { useEffect, useRef } from 'react';
import { HERO } from './hero-copy.js';
import { createAlScene } from './al/scene.js';
import { CHAPTERS } from './al/choreography.js';

export default function Hero() {
  const heroRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    const scene = createAlScene(canvasRef.current);
    sceneRef.current = scene;
    scene.setProgress(0);
    const onResize = () => scene.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const cap = CHAPTERS[0];

  return (
    <section className="hero" ref={heroRef}>
      <div className="hero-canvas-wrap" aria-hidden="true">
        <canvas ref={canvasRef} />
      </div>
      <div className="hero-ident">
        <h1>{HERO.nome}</h1>
        <p>{HERO.cargo}</p>
      </div>
      <div className="hero-chapter" aria-live="polite">
        <span className="hero-chapter-n">{cap.n}</span>
        <span className="hero-chapter-word">{cap.word}</span>
      </div>
    </section>
  );
}
