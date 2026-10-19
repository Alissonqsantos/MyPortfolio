import { describe, it, expect } from 'vitest';
import { WORMHOLE, alvoNaViewport, deveUsarDobra, ehDestinoHero, cruzaHero } from '../src/wormhole.js';

describe('wormhole', () => {
  it('constantes da dobra rápida (~660ms ida+volta)', () => {
    expect(WORMHOLE.FECHAR_MS + WORMHOLE.ABRIR_MS).toBeLessThanOrEqual(750);
    expect(WORMHOLE.FECHAR_MS).toBeGreaterThan(0);
    expect(WORMHOLE.ABRIR_MS).toBeGreaterThan(0);
  });

  it('alvoNaViewport: só true quando totalmente visível', () => {
    expect(alvoNaViewport({ top: 0, bottom: 500 }, 800)).toBe(true);
    expect(alvoNaViewport({ top: -10, bottom: 500 }, 800)).toBe(false);
    expect(alvoNaViewport({ top: 100, bottom: 900 }, 800)).toBe(false);
    expect(alvoNaViewport(null, 800)).toBe(false);
  });

  it('deveUsarDobra: reduced-motion nunca dobra; alvo visível não dobra', () => {
    expect(deveUsarDobra({ reducedMotion: true, alvoVisivel: false })).toBe(false);
    expect(deveUsarDobra({ reducedMotion: false, alvoVisivel: true })).toBe(false);
    expect(deveUsarDobra({ reducedMotion: false, alvoVisivel: false })).toBe(true);
  });

  it('ehDestinoHero: só #topo/#hero são hero', () => {
    expect(ehDestinoHero('#topo')).toBe(true);
    expect(ehDestinoHero('#hero')).toBe(true);
    expect(ehDestinoHero('#trabalhos')).toBe(false);
    expect(ehDestinoHero('#sobre')).toBe(false);
  });

  it('cruzaHero: dobra só hero↔seção, nunca seção↔seção', () => {
    expect(cruzaHero({ origemNoHero: true, destinoEhHero: false })).toBe(true);
    expect(cruzaHero({ origemNoHero: false, destinoEhHero: true })).toBe(true);
    expect(cruzaHero({ origemNoHero: false, destinoEhHero: false })).toBe(false);
    expect(cruzaHero({ origemNoHero: true, destinoEhHero: true })).toBe(false);
  });

  it('deveUsarDobra: respeita a fronteira do hero', () => {
    // hero → trabalhos: dobra
    expect(deveUsarDobra({ reducedMotion: false, alvoVisivel: false, origemNoHero: true, destinoEhHero: false })).toBe(true);
    // trabalhos → hero: dobra
    expect(deveUsarDobra({ reducedMotion: false, alvoVisivel: false, origemNoHero: false, destinoEhHero: true })).toBe(true);
    // seção → seção: desliza, sem overlay
    expect(deveUsarDobra({ reducedMotion: false, alvoVisivel: false, origemNoHero: false, destinoEhHero: false })).toBe(false);
    // hero → hero: desliza
    expect(deveUsarDobra({ reducedMotion: false, alvoVisivel: false, origemNoHero: true, destinoEhHero: true })).toBe(false);
  });
});
