import { useEffect, useRef, useState } from 'react';
import './Nav.css';
import { NAV_LINKS, NAV_MOBILE_QUERY } from './nav-links.js';
import { forcaGravidade, GRAVIDADE_RAIO } from './gravidade.js';

export default function Nav({ aoNavegar, travarScroll }) {
  const [open, setOpen] = useState(false);
  const linksRef = useRef(null);

  // Gravidade do buraco negro: lê --bh-px/--bh-py/--bh-vis do <body>
  // (publicados pela cena a ~10Hz) e escreve --g/--dir em cada link.
  // rAF próprio, pausado com overlay aberto ou reduced-motion.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const medir = () => {
      raf = requestAnimationFrame(medir);
      if (open) return;
      const cs = getComputedStyle(document.body);
      if (cs.getPropertyValue('--bh-vis').trim() !== '1') {
        for (const a of linksRef.current?.querySelectorAll('.nav-roll') ?? []) {
          a.style.setProperty('--g', '0');
        }
        return;
      }
      const bh = {
        x: parseFloat(cs.getPropertyValue('--bh-px')) || 0,
        y: parseFloat(cs.getPropertyValue('--bh-py')) || 0,
      };
      for (const a of linksRef.current?.querySelectorAll('.nav-roll') ?? []) {
        const r = a.getBoundingClientRect();
        const { g, dir } = forcaGravidade(bh, { x: r.left + r.width / 2, y: r.top + r.height / 2 }, GRAVIDADE_RAIO);
        a.style.setProperty('--g', g.toFixed(3));
        a.style.setProperty('--dir', String(dir));
      }
    };
    raf = requestAnimationFrame(medir);
    return () => cancelAnimationFrame(raf);
  }, [open ]);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(NAV_MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(NAV_MOBILE_QUERY);
    const onChange = (e) => {
      setIsMobile(e.matches);
      if (!e.matches) setOpen(false); // saiu do mobile: fecha o overlay
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Overlay aberto: trava o scroll + ESC fecha + foco no fechar.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    travarScroll?.(true);
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.getElementById('nav-fechar')?.focus();
    return () => {
      document.body.style.overflow = prev;
      travarScroll?.(false);
      window.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  return (
    <>
      <header className={`nav${open ? ' nav--menu-aberto' : ''}`}>
        <a className="nav-marca" href="#topo" onClick={(e) => aoNavegar?.(e, '#topo')}>
          <span className="nav-marca-texto">ALISSON<img className="nav-asterisco" src="/asterisco.png" alt="" aria-hidden="true" /></span>
        </a>
        {!isMobile && (
          <nav className="nav-links" aria-label="Principal" ref={linksRef}>
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                className="nav-roll"
                href={l.href}
                aria-label={l.label}
                onClick={(e) => aoNavegar?.(e, l.href)}
              >
                <span className="nav-roll-win" aria-hidden="true">
                  <span className="nav-roll-o">
                    {[...l.label].map((ch, j) => (
                      <span key={j} className="nav-roll-ch" style={{ '--j': String(j) }}>
                        {ch}
                      </span>
                    ))}
                  </span>
                  <span className="nav-roll-c">
                    {[...l.label].map((ch, j) => (
                      <span key={j} className="nav-roll-ch" style={{ '--j': String(j) }}>
                        {ch}
                      </span>
                    ))}
                  </span>
                </span>
              </a>
            ))}
          </nav>
        )}
        {isMobile && (
          <button
            id="nav-fechar"
            className="nav-burger"
            type="button"
            aria-expanded={open}
            aria-controls="nav-overlay"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        )}
      </header>
      {isMobile && (
        <div
          id="nav-overlay"
          className={`nav-overlay${open ? ' aberto' : ''}`}
          aria-hidden={!open}
          inert={!open}
        >
          <nav aria-label="Menu">
            {NAV_LINKS.map((l, i) => (
              <a
                key={l.href}
                className="nav-overlay-link"
                style={{ '--i': String(i) }}
                href={l.href}
                tabIndex={open ? 0 : -1}
                onClick={(e) => { aoNavegar?.(e, l.href); setOpen(false); }}
              >
                <span className="nav-overlay-n" aria-hidden="true">
                  0{i + 1}
                </span>
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
