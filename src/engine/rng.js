// Gerador de números aleatórios com semente (mulberry32).
// Mesma semente = mesma carreira, o que facilita testar e balancear.

export function criarRng(semente = Date.now()) {
  let s = semente >>> 0;

  function proximo() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    proximo,
    // inteiro entre min e max (inclusive)
    inteiro: (min, max) => Math.floor(proximo() * (max - min + 1)) + min,
    // true com a probabilidade p (0 a 1)
    chance: (p) => proximo() < p,
    escolher: (lista) => lista[Math.floor(proximo() * lista.length)],
    embaralhar(lista) {
      const copia = [...lista];
      for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(proximo() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
      }
      return copia;
    },
  };
}
