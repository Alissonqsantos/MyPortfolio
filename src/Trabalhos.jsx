import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TRABALHOS } from './trabalhos-data.js';
import useReveal from './useReveal.js';
import { prefereReduzirMovimento } from './al/webgl.js';
import './Trabalhos.css';

gsap.registerPlugin(ScrollTrigger);

// #trabalhos — strip horizontal (desktop) / pilha vertical (mobile + reduced-motion).
// Hover premium (DS alisson + padrão Awwwards): zoom contido no thumb, véu
// editorial bottom-heavy, CTA em cascata, glow lavanda que segue o mouse
// via --mx/--my. Sem contador lateral (removido a pedido).
export default function Trabalhos() {
  const secaoRef = useRef(null);
  const trilhoRef = useRef(null);
  const viewportRef = useRef(null);
  useReveal(secaoRef);

  useEffect(() => {
    const secao = secaoRef.current;
    const trilho = trilhoRef.current;
    const viewport = viewportRef.current;
    if (!secao || !trilho || !viewport) return;
    if (prefereReduzirMovimento()) return;
    if (window.matchMedia('(max-width: 767px)').matches) return;
    // Mede contra o viewport real (não window.innerWidth: scrollbar-safe) e
    // inclui o espaçador final — o último card termina 100% visível.
    const getDist = () => Math.max(0, trilho.scrollWidth - viewport.clientWidth);
    const tween = gsap.to(trilho, {
      x: () => -getDist(),
      ease: 'none',
      scrollTrigger: {
        trigger: secao,
        start: 'top top',
        end: () => `+=${getDist()}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });
    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(trilho, { x: 0 });
    };
  }, []);

  // Glow que segue o mouse no thumb (Visuvate hot glow, tom lavanda do DS).
  // Leve: só escreve 2 CSS vars; o resto é CSS puro.
  const definirBrilho = (e) => {
    const alvo = e.currentTarget.querySelector('.trabalho-thumb');
    if (!alvo) return;
    const r = alvo.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    alvo.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    alvo.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  };

  return (
    <section id="trabalhos" className="trabalhos" ref={secaoRef} aria-label="Trabalhos">
      <header className="trabalhos-head reveal">
        <p className="trabalhos-eyebrow">Trabalhos selecionados</p>
        <h2 className="trabalhos-titulo">
          <em>Projetos</em> em destaque
        </h2>
      </header>
      <div className="trabalhos-viewport" ref={viewportRef}>
        <div className="trabalhos-trilho" ref={trilhoRef}>
          {TRABALHOS.map((t, i) => (
            <article
              key={t.id}
              className="trabalho-card reveal"
              aria-label={`${t.titulo}`}
              onMouseMove={definirBrilho}
            >
              <div
                className="trabalho-thumb"
                role="img"
                aria-label={`${t.titulo} — placeholder`}
              >
                <div
                  className="trabalho-thumb-fundo"
                  aria-hidden="true"
                  style={{ background: `linear-gradient(135deg, ${t.tons[0]}, ${t.tons[1]})` }}
                />
                <div className="trabalho-thumb-veu" aria-hidden="true" />
                <span className="trabalho-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="trabalho-thumb-cta" aria-hidden="true">
                  View Project <span className="trabalho-thumb-seta">↗</span>
                </span>
              </div>
              <h3 className="trabalho-nome">{t.titulo}</h3>
              <p className="trabalho-meta">
                {t.categoria} · {t.stack.join(' / ')}
              </p>
              <a className="trabalho-link" href={t.href} aria-label={`View Project — ${t.titulo}`}>
                View Project <span aria-hidden="true">↗</span>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
