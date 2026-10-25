// A "liga": as 30 agências, com força e necessidade de cada perfil de modelo.
// Uma agência que já tem muitas modelos de um perfil tem pouca necessidade dele
// e, por isso, pouco interesse em contratar mais uma do mesmo tipo.

import { AGENCIAS } from './mundo.js';
import { PERFIS } from './atributos.js';

const limitar = (v, min, max) => Math.max(min, Math.min(max, v));
const arred = (v) => Math.round(v * 100) / 100;

export function criarLiga(rng) {
  const agencias = {};
  for (const a of AGENCIAS) {
    const forca =
      a.tier === 1 ? rng.inteiro(72, 92) : a.tier === 2 ? rng.inteiro(52, 72) : rng.inteiro(32, 52);
    const necessidades = {};
    for (const perfil of Object.keys(PERFIS)) necessidades[perfil] = arred(rng.proximo());
    agencias[a.id] = { id: a.id, nome: a.nome, tier: a.tier, forca, necessidades };
  }
  return { agencias };
}

// A cada temporada as necessidades mudam e as agências ganham ou perdem força.
export function atualizarLiga(liga, rng) {
  for (const agencia of Object.values(liga.agencias)) {
    agencia.forca = limitar(agencia.forca + rng.inteiro(-3, 3), 25, 95);
    for (const perfil of Object.keys(agencia.necessidades)) {
      agencia.necessidades[perfil] = arred(limitar(agencia.necessidades[perfil] + (rng.proximo() - 0.5) * 0.5, 0, 1));
    }
  }
}

const PRIMEIROS_NOMES = [
  'Aline', 'Bruna', 'Camila', 'Daniela', 'Elisa', 'Fernanda', 'Gabriela', 'Helena', 'Isabela',
  'Julia', 'Karina', 'Larissa', 'Mariana', 'Natália', 'Olívia', 'Paula', 'Rafaela', 'Sofia',
  'Tatiana', 'Valentina', 'Yasmin', 'Beatriz', 'Clara', 'Débora', 'Eduarda',
];
const SOBRENOMES = [
  'Alvarenga', 'Bittencourt', 'Cardoso', 'Drummond', 'Esteves', 'Ferraz', 'Guimarães', 'Holanda',
  'Ibarra', 'Junqueira', 'Klein', 'Lacerda', 'Medeiros', 'Nogueira', 'Oliveira', 'Prado', 'Queiroz',
  'Rezende', 'Salgado', 'Tavares', 'Uchoa', 'Vasconcelos', 'Wanderley', 'Xavier', 'Zanetti',
];

// Outras jovens que disputam a Noite da Seleção junto com a jogadora.
export function gerarNovatas(rng, quantidade = 119) {
  const perfis = Object.keys(PERFIS);
  const novatas = [];
  const usados = new Set();
  while (novatas.length < quantidade) {
    const nome = `${rng.escolher(PRIMEIROS_NOMES)} ${rng.escolher(SOBRENOMES)}`;
    if (usados.has(nome)) continue;
    usados.add(nome);
    novatas.push({
      id: `novata-${novatas.length + 1}`,
      nome,
      perfil: rng.escolher(perfis),
      overall: limitar(Math.round(rng.normal(51, 7)), 30, 80),
    });
  }
  return novatas;
}
