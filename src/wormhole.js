// Cortina premium — transição só hero↔seção (~660ms ida+volta).
// Lógica pura (sem React/DOM) para ser testável em Node.
// A cortina em si vive em Wormhole.jsx; aqui ficam só as decisões.

export const WORMHOLE = {
  FECHAR_MS: 400, // cortina sobe do rodapé (100% → 0)
  ABRIR_MS: 350, // cortina sai pelo topo (0 → -100%)
  COR_FUNDO: '#0c0b0c',
  COR_VINHETA: '#9780ff',
};

// Alvo já totalmente visível? Nesse caso o salto é curto — não dobra,
// desliza normal (evita flash bobo ao clicar na seção onde já está).
export function alvoNaViewport(rect, alturaJanela) {
  if (!rect || typeof alturaJanela !== 'number') return false;
  return rect.top >= 0 && rect.bottom <= alturaJanela;
}

// Destino é o hero? A marca do nav aponta para #topo (main que começa no hero).
// Seções futuras (#sobre, #servicos, #contato) nunca são hero.
export function ehDestinoHero(href) {
  return href === '#topo' || href === '#hero';
}

// Cruza a fronteira do hero? Só dobra quando UM dos lados é o hero:
// hero→seção ou seção→hero. Seção↔seção desliza normal, sem overlay.
export function cruzaHero({ origemNoHero, destinoEhHero }) {
  return Boolean(origemNoHero) !== Boolean(destinoEhHero);
}

// Decide: dobra (true) ou scroll normal (false).
// reduced-motion => nunca dobra (corte seco imediato).
// Regra: só dobra atravessando a fronteira do hero; fora isso, desliza.
export function deveUsarDobra({ reducedMotion, alvoVisivel, origemNoHero, destinoEhHero }) {
  if (reducedMotion) return false;
  if (alvoVisivel) return false;
  // Sem info de hero (chamada antiga/teste): mantém comportamento anterior.
  if (typeof origemNoHero === 'undefined' || typeof destinoEhHero === 'undefined') return true;
  return cruzaHero({ origemNoHero, destinoEhHero });
}
