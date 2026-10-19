import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HERO } from './hero-copy.js';
import { createAlScene } from './al/scene.js';
import { temWebGL, prefereReduzirMovimento } from './al/webgl.js';
import { CHAPTERS, chapterIndexFor, limitesCapitulos } from './al/choreography.js';
import useReveal from './useReveal.js';

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const heroRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [capitulo, setCapitulo] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [semGL, setSemGL] = useState(false);
  useReveal(heroRef);

  useEffect(() => {
    if (!temWebGL()) {
      setSemGL(true);
      return;
    }
    const scene = createAlScene(canvasRef.current);
    sceneRef.current = scene;
    scene.setProgress(0);
    let st = null;
    if (prefereReduzirMovimento()) {
      setReduced(true);
    } else {
      st = ScrollTrigger.create({
        trigger: heroRef.current,
        start: 'top top',
        end: '+=400%',            // 5 telas no total
        pin: true,
        scrub: 1,                 // 1s de amortecimento: glide cósmico, não engrenagem
        // Rolada grande assenta no início do próximo capítulo em vez de
        // atravessar dois de uma vez. Off em reduced-motion (sem pin lá).
        snap: {
          snapTo: limitesCapitulos(),
          duration: 1.0,
          ease: 'expo.out',
        },
        onUpdate: (self) => {
          const t = self.progress;               // 0..1 já normalizado pelo GSAP
          sceneRef.current.setProgress(t);
          setCapitulo(chapterIndexFor(t));
        },
      });
    }
    // Ordem importa: o wrap do canvas segue a CAIXA do hero pinnado —
    // o refresh atualiza a caixa primeiro; o resize imediato pega o caso
    // comum, o rAF pega o pós-layout e o timeout é backstop (rAF pausa
    // em aba oculta). resizeTo ignora no-ops, então chamar 3x é de graça.
    let resizeRaf = 0;
    let resizeTimer = 0;
    const onResize = () => {
      ScrollTrigger.refresh();
      scene.resize();
      cancelAnimationFrame(resizeRaf);
      clearTimeout(resizeTimer);
      resizeRaf = requestAnimationFrame(() => scene.resize());
      resizeTimer = setTimeout(() => scene.resize(), 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(resizeRaf);
      clearTimeout(resizeTimer);
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
        {semGL ? <div className="hero-al-fallback">Al</div> : <canvas ref={canvasRef} />}
      </div>
      <div className="hero-ident reveal">
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
