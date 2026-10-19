import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Hero from './Hero.jsx';
import Trabalhos from './Trabalhos.jsx';
import Contato from './Contato.jsx';
import Nav from './Nav.jsx';
import Wormhole from './Wormhole.jsx';
import useLenis from './useLenis.js';
import { prefereReduzirMovimento } from './al/webgl.js';
import { alvoNaViewport, deveUsarDobra, ehDestinoHero } from './wormhole.js';

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const lenisRef = useLenis();
  const wormholeRef = useRef(null);
  const viajandoRef = useRef(false);

  // Âncoras do nav: só hero↔seção usa a cortina (premium);
  // seção↔seção e alvo visível deslizam normal. Sem Lenis, nativo.
  // Reduced-motion: corte seco imediato, sem overlay.
  const irPara = (e, href) => {
    const alvo = document.querySelector(href);
    if (!alvo) return;
    e.preventDefault();
    if (viajandoRef.current) return;
    const lenis = lenisRef.current;
    const reduced = prefereReduzirMovimento();
    const rect = alvo.getBoundingClientRect();
    // Origem no hero? O hero fica pinnado cobrindo a viewport durante os
    // 5 capítulos — se o centro da tela está sobre ele, estamos no hero.
    const heroEl = document.querySelector('.hero');
    const heroRect = heroEl?.getBoundingClientRect();
    const origemNoHero = heroRect
      ? heroRect.top <= window.innerHeight / 2 && heroRect.bottom >= window.innerHeight / 2
      : window.scrollY < (document.querySelector('#trabalhos')?.offsetTop ?? Infinity);
    const dobrar = deveUsarDobra({
      reducedMotion: reduced,
      alvoVisivel: alvoNaViewport(rect, window.innerHeight),
      origemNoHero,
      destinoEhHero: ehDestinoHero(href),
    });
    if (!dobrar) {
      if (lenis) lenis.scrollTo(alvo);
      else alvo.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      return;
    }
    // Cortina (~750ms): sobe → salto cego imediato → sai pelo topo.
    // Robustez: fechar/abrir têm timeout (aba oculta pausa rAF e o tween
    // do GSAP nunca resolve); o salto tenta Lenis immediate + nativo com
    // verificação, pois o Lenis com stop() engole scrollTo.
    viajandoRef.current = true;
    (async () => {
      const comTimeout = (p, ms) =>
        Promise.race([p ?? Promise.resolve(), new Promise((r) => setTimeout(r, ms))]);
      try {
        lenis?.stop();
        await comTimeout(wormholeRef.current?.fechar(), 750);
        lenis?.start();
        const topo = alvo.getBoundingClientRect().top + window.scrollY;
        try {
          lenis?.scrollTo(alvo, { immediate: true, force: true });
        } catch {
          try {
            lenis?.scrollTo(alvo, { immediate: true });
          } catch {
            /* cai no nativo abaixo */
          }
        }
        await new Promise((r) => setTimeout(r, 60));
        if (Math.abs(window.scrollY - topo) > 4) window.scrollTo(0, topo);
        await new Promise((r) => setTimeout(r, 60));
        if (Math.abs(window.scrollY - topo) > 4) alvo.scrollIntoView({ behavior: 'auto' });
        await new Promise((r) => setTimeout(r, 60));
        ScrollTrigger.refresh();
        await comTimeout(wormholeRef.current?.abrir(), 650);
        // Defesa: se algum tween foi morto no meio, nunca prende a tela.
        wormholeRef.current?.esconder?.();
      } finally {
        lenis?.start();
        viajandoRef.current = false;
      }
    })();
  };

  return (
    <>
      <Nav
        aoNavegar={irPara}
        travarScroll={(travar) => {
          const lenis = lenisRef.current;
          if (!lenis) return;
          if (travar) lenis.stop();
          else if (!viajandoRef.current) lenis.start();
        }}
      />
      <main id="topo">
        <Hero />
        <Trabalhos />
        <Contato aoNavegar={irPara} />
      </main>
      <Wormhole ref={wormholeRef} />
    </>
  );
}
