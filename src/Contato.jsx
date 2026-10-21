import { useEffect, useRef } from 'react';
import useReveal from './useReveal.js';
import { forcaGravidade } from './gravidade.js';
import './Contato.css';

// #contato — rodapé wordmark gigante (preview 02: Yakushev 14.8vw + studiors CASSER).
// Marca como set-piece final: sociais mono + ALISSON + imagem que volta ao topo.
// Hover: o ícone sobre o N vira singularidade — cada letra "deita" o topo
// em direção ao núcleo (mesma força do nav: forcaGravidade → --g/--dir),
// sem sair do lugar: skewX com pivô na baseline, sem translate nem scale.
// Ícone cresce e segura maior + brilho leve. Só desktop com hover;
// reduced-motion e touch ficam de fora.
// Links sociais com TODO-REAL: trocar pelos endereços reais.
const LETRAS = ['A', 'L', 'I', 'S', 'S', 'O', 'N'];

export default function Contato({ aoNavegar }) {
  const secaoRef = useRef(null);
  const wordmarkRef = useRef(null);
  useReveal(secaoRef);

  const voltarTopo = (e) => {
    if (aoNavegar) {
      aoNavegar(e, '#topo');
    }
  };

  // Hover por zona exata, em duas camadas: (1) CSS isola o hit — o <a> tem
  // pointer-events:none e só os glifos têm auto, então gaps/padding nunca
  // ativam nem capturam cliques (sociais sempre alcançáveis); (2) JS delega
  // pointerover com filtro de glifo e desliga com 90ms de tolerância (sem
  // flicker ao cruzar letras). Touch e reduced-motion fora.
  // medirForca escreve --g/--dir por letra (mesmo g e direção do nav).
  // O CSS faz o resto: skewX com pivô na baseline (50% 100%), sem
  // translate e sem scale — base, topo e altura cravados, só o topo
  // desliza rumo ao núcleo. Intensidade contida (~7° no N): mesmo tamanho,
  // só distorcida em direção ao buraco.
  const medirForca = () => {
    const word = wordmarkRef.current;
    if (!word) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover)').matches) return; // touch: nada
    const icone = word.querySelector('.contato-asterisco');
    const spans = word.querySelectorAll('.contato-letra');
    if (!icone || !spans.length) return;
    const r = icone.getBoundingClientRect();
    const centro = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    const raio = word.getBoundingClientRect().width;
    for (const s of spans) {
      const b = s.getBoundingClientRect();
      const { g, dir } = forcaGravidade(
        centro,
        { x: b.left + b.width / 2, y: b.top + b.height / 2 },
        raio,
      );
      s.style.setProperty('--g', g.toFixed(3));
      s.style.setProperty('--dir', String(dir));
    }
  };

  const zerarForca = () => {
    const word = wordmarkRef.current;
    if (!word) return;
    for (const s of word.querySelectorAll('.contato-letra')) {
      s.style.setProperty('--g', '0');
    }
  };

  const timeoutRef = useRef(0);

  // Desliga de verdade: cancela tolerância pendente, zera força e tira a
  // classe (só zerar --g não bastaria — o ícone voltaria a ficar grande
  // preso, pois a regra dele lê a classe, não --g).
  const desligar = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = 0;
    }
    zerarForca();
    wordmarkRef.current?.classList.remove('contato-ativo');
  };

  useEffect(() => {
    const word = wordmarkRef.current;
    if (!word) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover)').matches) return; // touch: nada
    // Zona exata: um listener delegado no wordmark, mas só ativa quando o
    // alvo é um glifo (.contato-letra) ou o buraco (.contato-asterisco) —
    // gaps/padding não ligam.
    const sobreAlvo = (e) => !!(e.target.closest && e.target.closest('.contato-letra, .contato-asterisco'));
    const entrar = (e) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = 0;
      }
      if (!sobreAlvo(e) || word.classList.contains('contato-ativo')) return;
      medirForca();
      word.classList.add('contato-ativo');
    };
    const sair = (e) => {
      if (word.contains(e.relatedTarget)) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(desligar, 90);
    };
    word.addEventListener('pointerover', entrar);
    word.addEventListener('pointerout', sair);
    return () => {
      word.removeEventListener('pointerover', entrar);
      word.removeEventListener('pointerout', sair);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <footer id="contato" className="contato" ref={secaoRef} aria-label="Contato">
      <nav className="contato-sociais reveal" aria-label="Redes sociais">
        <a
          className="contato-link"
          href="https://github.com/TODO-REAL"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub — TODO-REAL"
        >
          GitHub
        </a>
        <a
          className="contato-link"
          href="https://linkedin.com/in/TODO-REAL"
          target="_blank"
          rel="noreferrer"
          aria-label="LinkedIn — TODO-REAL"
        >
          LinkedIn
        </a>
        <a className="contato-link" href="mailto:contato@alisson.design" aria-label="Email — TODO-REAL">
          Email
        </a>
      </nav>
      <a
        ref={wordmarkRef}
        className="contato-wordmark reveal"
        href="#topo"
        onClick={voltarTopo}
        onFocus={medirForca}
        onBlur={desligar}
        aria-label="Alisson — voltar ao topo"
      >
        <span className="contato-palavra" aria-hidden="true">
          {LETRAS.map((letra, i) => (
            <span key={i} className="contato-letra" style={{ '--i': String(i) }}>
              {letra}
            </span>
          ))}
        </span>
        <img className="contato-asterisco" src="/asterisco.png" alt="" aria-hidden="true" />
      </a>
      <p className="contato-fim reveal">© 2026 — Portfólio dark imersivo — TODO-REAL</p>
    </footer>
  );
}