// Rivais: modelos concorrentes com rivalidades que duram vários anos, e o ranking anual.

import { RIVAIS, NOVOS_RIVAIS } from './mundo.js';
import { registrarEvento } from './mercado.js';

const limitar = (v, min, max) => Math.max(min, Math.min(max, v));

export const famaDaRival = (r) => limitar(Math.round(r.overall * 1.25 - 15), 5, 100);
export const pontosDeRanking = (overall, fama) => overall * 0.75 + fama * 0.25;

export function criarRivais(rng) {
  return RIVAIS.map((r, i) => ({
    id: r.id,
    nome: r.nome,
    overall: r.overall - 12 + rng.inteiro(-2, 2),
    idade: 21 + Math.floor(i * 1.3) + rng.inteiro(0, 2),
    intensidade: 0, // 0 a 100: quanto a rivalidade esquentou
    vitorias: 0, // vezes que a jogadora levou o trabalho disputado
    derrotas: 0,
  }));
}

export const rivalPorId = (estado, id) => estado.rivais.find((r) => r.id === id) ?? null;

// Algumas ofertas de prestígio são disputadas com uma rival.
export function sortearRival(estado, rng) {
  return rng.escolher(estado.rivais);
}

// Quem enfrenta uma rival mais forte tem um pouco menos de chance (e vice-versa).
export function ajustePorRival(estado, oferta) {
  if (!oferta.rival) return 0;
  const rival = rivalPorId(estado, oferta.rival.id);
  if (!rival) return 0;
  return -limitar((rival.overall - estado.overall) / 300, -0.05, 0.08);
}

export function registrarDisputa(estado, oferta, sucesso) {
  const rival = oferta.rival && rivalPorId(estado, oferta.rival.id);
  if (!rival) return;
  if (sucesso) {
    rival.vitorias += 1;
    rival.intensidade = limitar(rival.intensidade + 4, 0, 100);
  } else {
    rival.derrotas += 1;
    rival.intensidade = limitar(rival.intensidade + 3, 0, 100);
  }
}

export function rivalMaisQuente(estado, minimo = 0) {
  const lista = [...estado.rivais].sort((a, b) => b.intensidade - a.intensidade);
  return lista[0] && lista[0].intensidade >= minimo ? lista[0] : null;
}

// Posição da jogadora entre ela e as rivais (1 = melhor).
export function rankingDaTemporada(estado) {
  const minha = pontosDeRanking(estado.overall, estado.fama);
  const acima = estado.rivais.filter((r) => pontosDeRanking(r.overall, famaDaRival(r)) > minha).length;
  return { posicao: acima + 1, total: estado.rivais.length + 1 };
}

// Fim de temporada: rivais envelhecem, evoluem, se aposentam e a rivalidade esfria aos poucos.
export function atualizarRivais(estado, rng) {
  const usados = new Set(estado.rivais.map((r) => r.nome));
  estado.rivais = estado.rivais.map((r) => {
    let overall = r.overall;
    const idade = r.idade + 1;
    if (idade <= 24) overall += rng.inteiro(0, 3);
    else if (idade <= 29) overall += rng.inteiro(-1, 1);
    else overall += rng.inteiro(-3, 0);
    overall = limitar(overall, 30, 92);
    const intensidade = Math.round(r.intensidade * 0.9); // dura vários anos, mas esfria

    if (idade >= 35 || (idade >= 31 && rng.chance(0.15))) {
      const nome = NOVOS_RIVAIS.find((n) => !usados.has(n)) ?? `Nova Rival ${usados.size + 1}`;
      usados.add(nome);
      if (r.intensidade >= 30) registrarEvento(estado, 'rival', `${r.nome}, sua grande rival, se aposentou.`);
      return {
        id: `rival-${nome.toLowerCase().replace(/[^a-z]+/g, '-')}`,
        nome,
        overall: rng.inteiro(55, 72),
        idade: rng.inteiro(19, 22),
        intensidade: 0,
        vitorias: 0,
        derrotas: 0,
      };
    }
    return { ...r, overall, idade, intensidade };
  });
}
