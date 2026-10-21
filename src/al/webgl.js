// Detecção de capacidades: WebGL e preferência de movimento reduzido.
// Sem dependências — testável em Node (document indefinido => false).

export function temWebGL() {
  try {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!ctx;
  } catch {
    return false;
  }
}

export function prefereReduzirMovimento(
  mm = typeof matchMedia !== 'undefined' ? matchMedia : undefined
) {
  if (typeof mm !== 'function') return false;
  try {
    return !!mm('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
