// Memória de decisões: "flags" com prazo de validade (em semanas; 1 ano = 40 semanas).
// Compartilhada pelos eventos da carreira e pelos eventos da vida pessoal.

export const SEMANAS_POR_ANO = 40;

export function temFlag(estado, chave) {
  const f = estado.memoria.flags[chave];
  return Boolean(f) && (f.ate === null || f.ate > estado.semanaAbsoluta);
}

export function marcarFlag(estado, chave, semanas = null, dados = {}) {
  estado.memoria.flags[chave] = {
    desde: estado.semanaAbsoluta,
    ate: semanas === null ? null : estado.semanaAbsoluta + semanas,
    dados,
  };
}

export const dadosDaFlag = (estado, chave) => estado.memoria.flags[chave]?.dados ?? {};
