// Sessão do navegador — o "preset" do cosmos enquanto a sessão viver:
//   • seed das estrelas (posições, classes, tamanhos e cores)
//   • fase (ângulo inicial) da órbita do buraco negro — e da luz roxa dele
//   • instante de início (relógio contínuo entre recarregamentos)
//
// F5 / recarregar: NADA reinicia (sessionStorage + o relógio continua de
// onde estava). Fechar o navegador e abrir de novo: sorteia tudo de novo.
// Sessão com mais de VALIDADE_H horas é tratada como nova (uma aba
// restaurada de ontem não congela o mesmo céu para sempre).
//
// sessionStorage é por aba: abrir uma aba nova também sorteia um preset novo
// (mesma semântica de "sessão do navegador" do que fechar e reabrir).
// Módulo puro — sem renderer/DOM. Testável em Node (storage injetável).

export const SESSAO = {
  CHAVE: 'al.sessao.v1',
  VALIDADE_H: 12,
};

// Sorteia um preset novo (determinístico se rand for injetado).
export function sortearSessao(rand = Math.random, agora = Date.now()) {
  return {
    seed: 1 + Math.floor(rand() * 0x7fffffff), // 1..2^31 (nunca 0)
    fase: rand() * Math.PI * 2,                // ângulo inicial da órbita
    inicio: agora,                             // relógio contínuo da sessão
  };
}

// Válida = tem os três campos numéricos e nasceu há menos de VALIDADE_H.
export function sessaoValida(s, agora = Date.now()) {
  if (!s || typeof s !== 'object') return false;
  for (const k of ['seed', 'fase', 'inicio']) {
    if (!Number.isFinite(s[k])) return false;
  }
  const idade = agora - s.inicio;
  return idade >= 0 && idade <= SESSAO.VALIDADE_H * 3600e3;
}

// Relógio da sessão: segundos desde o início (continua após F5).
export function tempoDaSessao(s, agora = Date.now()) {
  return Math.max(0, (agora - s.inicio) / 1000);
}

// Fallback em memória (Node, modo privado ou storage que recusa escrita).
let memoria = null;

function storageUtilizavel(storage) {
  return !!storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function';
}

// Lê a sessão (sessionStorage ou memória); cria e grava uma nova se não
// houver, estiver corrompida ou tiver vencido.
// Regra de ouro: storage usável mas vazio/vencido = sessão NOVA (fechar e
// abrir o navegador reinicia). Sem storage (Node/modo privado), vale a
// memória do processo — aí a "sessão" dura enquanto o processo viver.
export function obterSessao(storage, rand = Math.random, agora = Date.now()) {
  if (storage === undefined) {
    try { storage = globalThis.sessionStorage; } catch { storage = null; }
  }
  const ok = storageUtilizavel(storage);

  let salva = null;
  if (ok) {
    try { salva = JSON.parse(storage.getItem(SESSAO.CHAVE) || 'null'); } catch { salva = null; }
    if (sessaoValida(salva, agora)) return salva;
  } else if (sessaoValida(memoria, agora)) {
    return memoria;
  }

  const nova = sortearSessao(rand, agora);
  memoria = nova;
  if (ok) {
    try { storage.setItem(SESSAO.CHAVE, JSON.stringify(nova)); } catch { /* recusou: fica só na memória desta execução */ }
  }
  return nova;
}
