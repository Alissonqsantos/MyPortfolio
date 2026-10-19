import { forwardRef, useImperativeHandle, useRef } from 'react';
import gsap from 'gsap';
import { WORMHOLE } from './wormhole.js';
import './Wormhole.css';

// Cortina premium — substitui a íris do buraco de minhoca.
// fechar() → painel escuro sobe do rodapé (100% → 0) com linha lavanda
// no topo; resolve no ponto cego (tela coberta).
// abrir() → painel sai pelo topo (0 → -100%), revelando o destino.
// Só animação — o salto de scroll quem faz é o App no ponto cego.
const Wormhole = forwardRef(function Wormhole(_, ref) {
  const elRef = useRef(null);
  const cortinaRef = useRef(null);

  useImperativeHandle(ref, () => ({
    fechar() {
      const el = elRef.current;
      const cortina = cortinaRef.current;
      if (!el || !cortina) return Promise.resolve();
      gsap.killTweensOf(cortina);
      gsap.set(el, { visibility: 'visible' });
      return new Promise((resolve) => {
        gsap.fromTo(cortina,
          { yPercent: 100 },
          {
            yPercent: 0,
            duration: WORMHOLE.FECHAR_MS / 1000,
            ease: 'power4.inOut',
            onComplete: resolve,
          });
      });
    },
    abrir() {
      const el = elRef.current;
      const cortina = cortinaRef.current;
      if (!el || !cortina) return Promise.resolve();
      gsap.killTweensOf(cortina);
      return new Promise((resolve) => {
        gsap.to(cortina, {
          yPercent: -100,
          duration: WORMHOLE.ABRIR_MS / 1000,
          ease: 'power4.inOut',
          onComplete: () => {
            gsap.set(el, { visibility: 'hidden' });
            gsap.set(cortina, { yPercent: 100 });
            resolve();
          },
        });
      });
    },
    esconder() {
      const el = elRef.current;
      const cortina = cortinaRef.current;
      if (!el) return;
      gsap.killTweensOf(cortina);
      gsap.set(el, { visibility: 'hidden' });
      if (cortina) gsap.set(cortina, { yPercent: 100 });
    },
  }), []);

  return (
    <div ref={elRef} className="wormhole" aria-hidden="true">
      <div ref={cortinaRef} className="wormhole-cortina">
        <span className="wormhole-linha" />
      </div>
    </div>
  );
});

export default Wormhole;
