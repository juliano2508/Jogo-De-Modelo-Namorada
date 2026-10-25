// Mercado: contratos, propostas de free agency, trocas de agência e chamada do circuito alternativo.

import { COMISSAO_POR_TIER, FATOR_GARANTIA_TIER, DIFICULDADES, FASES } from './config.js';
import { AGENCIAS_ALTERNATIVAS } from './mundo.js';
import { inflacao } from './vida.js';

const limitar = (v, min, max) => Math.max(min, Math.min(max, v));
const arred50 = (v) => Math.round(v / 50) * 50;

export const registrarEvento = (estado, tipo, texto) =>
  estado.eventos.push({ temporada: estado.temporada, semana: estado.semana, tipo, texto });

// Garantia semanal "de mercado": cresce de forma exponencial com o overall.
// `infl` é a inflação acumulada (a renda acompanha o custo de vida).
export function garantiaDeMercado(overall, fama, infl = 1) {
  return arred50((300 * Math.exp((overall - 40) / 14) + fama * 40) * infl);
}

// Garantia de novata: depende da posição na Seleção (1ª escolha ganha bem mais que a 60ª).
export function garantiaDeRookie(posicao, infl = 1) {
  const t = 1 - (posicao - 1) / 59;
  return arred50((600 + 5400 * t ** 2.2) * infl);
}

export function criarContrato({ duracao, garantiaSemanal, tier }) {
  return { duracao, restante: duracao, garantiaSemanal, comissao: COMISSAO_POR_TIER[tier] };
}

// Muda de fase (regional, alternativo, profissional) com nova agência e contrato.
export function entrarFase(estado, rng, fase, { agencia, contrato }) {
  estado.fase = fase;
  estado.temporadasNaFase = 0;
  estado.agencia = { id: agencia.id, nome: agencia.nome, tier: agencia.tier };
  estado.contrato = contrato;
  if (estado.semana === 1) estado.semanasTemporada = FASES[fase].semanas;
  if (fase !== 'regional' && estado.vida.moradia < 1) estado.vida.moradia = 1;
}

export function entrarNoAlternativo(estado, rng) {
  const agencia = rng.escolher(AGENCIAS_ALTERNATIVAS);
  entrarFase(estado, rng, 'alternativo', {
    agencia,
    contrato: { duracao: null, restante: null, garantiaSemanal: 200, comissao: COMISSAO_POR_TIER[4] },
  });
  registrarEvento(estado, 'fase', `Sem agência grande, ${estado.nome} segue para o circuito alternativo (${agencia.nome}).`);
}

// ---------- Free agency ----------

const LIMIAR_INTERESSE = { 1: 62, 2: 52, 3: 44 };

export function gerarPropostas(estado, rng) {
  const cfg = DIFICULDADES[estado.dificuldade];
  const base = garantiaDeMercado(estado.overall, estado.fama, inflacao(estado));
  const propostas = [];

  for (const agencia of Object.values(estado.liga.agencias)) {
    const necessidade = agencia.necessidades[estado.perfil] ?? 0.5;
    const valor = estado.overall + estado.fama * 0.2 + necessidade * 8 + rng.normal(0, cfg.ruidoOlheiros);
    const atual = estado.contrato && agencia.id === estado.agencia.id;
    if (valor < LIMIAR_INTERESSE[agencia.tier] && !atual) continue;
    propostas.push(montarProposta(agencia, base, necessidade, valor, rng, atual));
  }

  propostas.sort((a, b) => b.valor - a.valor);
  const lista = propostas.slice(0, 5);

  // Mínimo de 2 propostas: se o mercado estiver frio, agências menores oferecem condições mais modestas.
  if (lista.length < 2) {
    const menores = Object.values(estado.liga.agencias)
      .filter((a) => a.tier === 3 && !lista.some((p) => p.agenciaId === a.id))
      .sort((a, b) => (b.necessidades[estado.perfil] ?? 0) - (a.necessidades[estado.perfil] ?? 0));
    for (const agencia of menores) {
      if (lista.length >= 2) break;
      const necessidade = agencia.necessidades[estado.perfil] ?? 0.5;
      const proposta = montarProposta(agencia, base * 0.7, necessidade, estado.overall, rng, false);
      lista.push(proposta);
    }
  }
  return lista;
}

function montarProposta(agencia, base, necessidade, valor, rng, renovacao) {
  const garantiaSemanal = arred50(base * FATOR_GARANTIA_TIER[agencia.tier] * (0.9 + necessidade * 0.3));
  return {
    agenciaId: agencia.id,
    agenciaNome: agencia.nome,
    tier: agencia.tier,
    valor,
    duracao: rng.inteiro(1, 4),
    garantiaSemanal,
    comissao: COMISSAO_POR_TIER[agencia.tier],
    renovacao,
  };
}

// Escolha automática: prefere garantia alta, com um bônus para agências de tier melhor.
export function melhorIndiceDeProposta(propostas) {
  let melhor = 0;
  let melhorNota = -Infinity;
  propostas.forEach((p, i) => {
    const nota = p.garantiaSemanal * (1 + (4 - p.tier) * 0.08);
    if (nota > melhorNota) {
      melhorNota = nota;
      melhor = i;
    }
  });
  return melhor;
}

// Aceita a proposta de índice `indice` (ou recusa todas com -1, só no circuito alternativo).
export function escolherProposta(estado, rng, indice) {
  const pend = estado.pendencia;
  if (!pend || !['free-agency', 'proposta-alternativo'].includes(pend.tipo)) {
    throw new Error('Não há propostas pendentes.');
  }
  if (indice === -1 && pend.tipo === 'proposta-alternativo') {
    estado.pendencia = null;
    registrarEvento(estado, 'contrato', `${estado.nome} recusou as propostas e segue no circuito alternativo.`);
    return null;
  }
  const proposta = pend.propostas[indice];
  if (!proposta) throw new Error('Proposta inexistente.');

  const agencia = estado.liga.agencias[proposta.agenciaId];
  estado.pendencia = null;
  entrarFase(estado, rng, 'profissional', {
    agencia,
    contrato: criarContrato({ duracao: proposta.duracao, garantiaSemanal: proposta.garantiaSemanal, tier: proposta.tier }),
  });
  const verbo = proposta.renovacao ? 'renovou com' : 'assinou com';
  registrarEvento(estado, 'contrato', `${estado.nome} ${verbo} ${proposta.agenciaNome} por ${proposta.duracao} temporada(s), garantia de R$ ${proposta.garantiaSemanal}/semana.`);
  return proposta;
}

// ---------- Trocas e chamadas ----------

// No meio da temporada profissional, a agência pode trocar a modelo com outra.
export function verificarTroca(estado, rng) {
  const atual = estado.liga.agencias[estado.agencia.id];
  if (!atual) return null;
  const necessidadeAtual = atual.necessidades[estado.perfil] ?? 0.5;
  let chance = 0.04 + (1 - necessidadeAtual) * 0.06;
  if (estado.relacoes.agente < 35) chance += 0.05;
  if (!rng.chance(chance)) return null;

  const candidatas = Object.values(estado.liga.agencias)
    .filter((a) => a.id !== atual.id && (a.necessidades[estado.perfil] ?? 0) >= 0.5)
    .sort((a, b) => b.necessidades[estado.perfil] - a.necessidades[estado.perfil])
    .slice(0, 3);
  if (candidatas.length === 0) return null;

  const nova = rng.escolher(candidatas);
  const fator = FATOR_GARANTIA_TIER[nova.tier] / FATOR_GARANTIA_TIER[atual.tier];
  estado.contrato.garantiaSemanal = arred50(estado.contrato.garantiaSemanal * fator);
  estado.contrato.comissao = COMISSAO_POR_TIER[nova.tier];
  estado.agencia = { id: nova.id, nome: nova.nome, tier: nova.tier };
  estado.relacoes.agente = limitar(estado.relacoes.agente + rng.inteiro(-8, 4), 0, 100);
  registrarEvento(estado, 'troca', `${atual.nome} trocou ${estado.nome} para ${nova.nome}.`);
  return { de: atual.nome, para: nova.nome };
}

// No circuito alternativo, bom desempenho pode render um contrato no meio da temporada.
export function verificarChamada(estado, rng) {
  if (estado.fase !== 'alternativo' || estado.pendencia) return null;
  const valor = estado.overall + estado.fama * 0.3;
  if (valor < 58) return null;
  const chance = limitar(0.02 + (valor - 58) * 0.004, 0, 0.15);
  if (!rng.chance(chance)) return null;

  const propostas = gerarPropostas(estado, rng);
  estado.pendencia = { tipo: 'proposta-alternativo', propostas };
  registrarEvento(estado, 'chamada', `${estado.nome} recebeu propostas de agências grandes durante a temporada.`);
  return propostas;
}
