// Carreira: estatísticas, marcos, aposentadoria, Hall da Fama e resumo de fim de carreira.

import { HALL_DA_FAMA, APOSENTADORIA } from './config.js';
import { inflacao } from './vida.js';
import { registrarEvento } from './mercado.js';

export function criarCarreira() {
  return {
    trabalhos: 0,
    destaques: 0,
    capas: 0, // ensaios de destaque em revistas de grande prestígio
    desfilesDeModa: 0, // desfiles de destaque em semanas de moda
    campanhasElite: 0, // campanhas bem-sucedidas com marcas de grande prestígio
    destaqueEmParis: false,
    titulosRanking: 0,
    melhorRanking: null,
    temporadasProfissionais: 0,
    ganhosTotais: 0,
    picoOverall: 0,
    picoFama: 0,
    picoDinheiro: 0,
    maiorVitoriasSobreRival: 0,
    melhorPosicaoSelecao: null,
    pontosTemporadas: 0,
    bonusLegado: 0,
  };
}

// Estatísticas da semana (chamado depois de cada simulação semanal).
export function registrarResultados(estado, resultados) {
  const c = estado.carreira;
  for (const r of resultados) {
    c.ganhosTotais += r.cacheRecebido;
    if (r.qualidade === 'falha') continue;
    c.trabalhos += 1;
    if (r.qualidade === 'destaque') c.destaques += 1;
    if (r.tipo === 'ensaio' && r.qualidade === 'destaque' && r.prestigio >= 85) c.capas += 1;
    if (r.tipo === 'desfile' && r.qualidade === 'destaque' && r.semanaDeModa) {
      c.desfilesDeModa += 1;
      if (r.semanaDeModa.includes('Paris')) c.destaqueEmParis = true;
    }
    if (r.tipo === 'campanha' && r.prestigio >= 85) c.campanhasElite += 1;
  }
}

// ---------- Marcos (metas por fase) ----------

export const MARCOS = [
  { id: 'profissional', texto: 'Chegou à carreira profissional', cond: (e) => e.historico.some((h) => h.fase === 'profissional') },
  { id: 'top-pick', texto: 'Foi uma das 10 primeiras escolhas da Seleção', cond: (e) => (e.carreira.melhorPosicaoSelecao ?? 99) <= 10 },
  { id: 'primeira-capa', texto: 'Estampou sua primeira capa de revista', cond: (e) => e.carreira.capas >= 1 },
  { id: 'dez-capas', texto: 'Chegou a 10 capas', cond: (e) => e.carreira.capas >= 10 },
  { id: 'fama-50', texto: 'Alcançou fama 50', cond: (e) => e.carreira.picoFama >= 50 },
  { id: 'fama-80', texto: 'Alcançou fama 80', cond: (e) => e.carreira.picoFama >= 80 },
  { id: 'paris', texto: 'Brilhou na Semana de Moda de Paris', cond: (e) => e.carreira.destaqueEmParis },
  { id: 'top3', texto: 'Entrou no top 3 do ranking anual', cond: (e) => (e.carreira.melhorRanking ?? 99) <= 3 },
  { id: 'numero-1', texto: 'Foi a número 1 do ranking anual', cond: (e) => e.carreira.titulosRanking >= 1 },
  {
    id: 'exclusividade',
    texto: 'Assinou um contrato de exclusividade',
    cond: (e) => Object.keys(e.memoria.flags).some((k) => k.startsWith('exclusiva_')),
  },
  {
    id: 'embaixadora',
    texto: 'Virou embaixadora de uma marca',
    cond: (e) => e.memoria.decisoes.some((d) => d.evento === 'embaixadora' && d.escolha === 'aceitar'),
  },
  { id: 'milionaria', texto: 'Chegou a R$ 1 milhão em caixa', cond: (e) => e.carreira.picoDinheiro >= 1_000_000 },
  { id: 'veterana', texto: 'Completou 10 temporadas profissionais', cond: (e) => e.carreira.temporadasProfissionais >= 10 },
  { id: 'grande-rivalidade', texto: 'Venceu uma rival 10 vezes em trabalhos disputados', cond: (e) => e.carreira.maiorVitoriasSobreRival >= 10 },
];

export function verificarMarcos(estado) {
  const novos = [];
  for (const m of MARCOS) {
    if (estado.marcos.some((x) => x.id === m.id)) continue;
    if (m.cond(estado)) {
      estado.marcos.push({ id: m.id, texto: m.texto, temporada: estado.temporada });
      registrarEvento(estado, 'marco', `Marco alcançado: ${m.texto}.`);
      novos.push(m.id);
    }
  }
  return novos;
}

// Fecha as estatísticas da temporada (usa o ranking calculado antes da evolução anual).
export function fecharTemporadaDeCarreira(estado, ranking) {
  const c = estado.carreira;
  c.picoOverall = Math.max(c.picoOverall, estado.overall);
  c.picoFama = Math.max(c.picoFama, estado.fama);
  c.picoDinheiro = Math.max(c.picoDinheiro, estado.dinheiro);
  c.maiorVitoriasSobreRival = Math.max(c.maiorVitoriasSobreRival, ...estado.rivais.map((r) => r.vitorias));
  c.melhorRanking = c.melhorRanking === null ? ranking.posicao : Math.min(c.melhorRanking, ranking.posicao);
  if (estado.fase === 'profissional') {
    c.temporadasProfissionais += 1;
    if (ranking.posicao === 1) c.titulosRanking += 1;
    const bonusRanking = ranking.posicao === 1 ? 8 : ranking.posicao <= 3 ? 4 : ranking.posicao <= 5 ? 2 : 0;
    c.pontosTemporadas += estado.fama / 25 + bonusRanking;
  }
}

// ---------- Hall da Fama ----------

export function calcularPontos(estado) {
  const c = estado.carreira;
  const pontos =
    c.pontosTemporadas +
    c.capas * 1 +
    c.desfilesDeModa * 0.5 +
    c.campanhasElite * 0.8 +
    estado.marcos.length * 3 +
    c.titulosRanking * 5 +
    Math.max(0, c.picoOverall - 60) * 0.6 +
    c.bonusLegado;
  return Math.round(pontos * 10) / 10;
}

export function classificar(pontos) {
  if (pontos >= HALL_DA_FAMA.lenda) return 'Lenda da moda';
  if (pontos >= HALL_DA_FAMA.hall) return 'Hall da Fama';
  if (pontos >= HALL_DA_FAMA.destaque) return 'Carreira de destaque';
  return 'Carreira discreta';
}

// ---------- Aposentadoria ----------

// Devolve os motivos que colocam a aposentadoria em pauta (ou null).
export function pautaAposentadoria(estado) {
  if (estado.fase === 'regional' || estado.aposentada) return null;
  const A = APOSENTADORIA;
  const motivos = [];
  if (estado.idade >= A.idadeMinimaPorSaude && estado.atributos.saude <= A.limiteSaude) motivos.push('saude');
  if (estado.idade >= A.idadeMinimaPorSaude && estado.atributos.resistencia <= A.limiteSaude) motivos.push('resistencia');
  if (estado.carreira.temporadasProfissionais >= A.temporadasEmPauta) motivos.push('longevidade');
  if (estado.idade >= 35 && estado.overall < 45) motivos.push('desempenho');
  const obrigatoria = estado.idade >= A.idadeObrigatoria || estado.carreira.temporadasProfissionais >= A.temporadasObrigatoria;
  if (obrigatoria) motivos.push('idade');
  return motivos.length > 0 ? { motivos, obrigatoria } : null;
}

export const CAMINHOS_POS_CARREIRA = {
  agencia: {
    nome: 'Abrir uma agência própria',
    pontos: 4,
    exige: (e) => e.dinheiro >= 400_000 * inflacao(e),
    erro: 'Para abrir uma agência é preciso ter pelo menos R$ 400 mil (corrigidos pela inflação) em caixa.',
  },
  mentora: { nome: 'Ser mentora de novas modelos', pontos: 3 },
  jurada: {
    nome: 'Ser jurada de programas de moda',
    pontos: 3,
    exige: (e) => e.fama >= 50,
    erro: 'Para ser jurada é preciso ter fama 50 ou mais.',
  },
  tranquila: { nome: 'Levar uma vida tranquila', pontos: 0 },
};

export function aposentar(estado, rng, caminho = 'tranquila') {
  const def = CAMINHOS_POS_CARREIRA[caminho];
  if (!def) throw new Error(`Caminho inválido: ${caminho}. Use: ${Object.keys(CAMINHOS_POS_CARREIRA).join(', ')}`);
  if (def.exige && !def.exige(estado)) throw new Error(def.erro);

  estado.carreira.bonusLegado += def.pontos;
  estado.pendencia = null;
  estado.aposentada = true;
  estado.fase = 'aposentada';
  estado.caminhoPosCarreira = caminho;
  verificarMarcos(estado);
  registrarEvento(estado, 'aposentadoria', `${estado.nome} se aposentou aos ${estado.idade} anos. Próximo capítulo: ${def.nome.toLowerCase()}.`);
  estado.legado = resumoDeCarreira(estado);
  return estado.legado;
}

// Responde à pendência de aposentadoria: 'aposentar' (com um caminho) ou 'continuar'.
export function decidirAposentadoria(estado, rng, escolha, caminho = 'tranquila') {
  const pend = estado.pendencia;
  if (pend?.tipo !== 'aposentadoria') throw new Error('Não há decisão de aposentadoria pendente.');
  if (escolha === 'continuar') {
    if (pend.obrigatoria) throw new Error('A aposentadoria é obrigatória neste ponto da carreira.');
    estado.pendencia = pend.depois ?? null;
    registrarEvento(estado, 'aposentadoria', `${estado.nome} decidiu continuar na carreira.`);
    return null;
  }
  if (escolha !== 'aposentar') throw new Error('Escolha "aposentar" ou "continuar".');
  return aposentar(estado, rng, caminho);
}

// ---------- Resumo de fim de carreira ----------

export function resumoDeCarreira(estado) {
  const pontos = calcularPontos(estado);
  const nivel = classificar(pontos);
  const melhor = [...estado.resumos].sort((a, b) => b.overall + b.fama - (a.overall + a.fama))[0] ?? null;
  const agencias = [...new Set(estado.resumos.map((r) => r.agencia))];
  const principalRival = [...estado.rivais].sort((a, b) => b.vitorias + b.derrotas - (a.vitorias + a.derrotas))[0] ?? null;

  return {
    nome: estado.nome,
    perfil: estado.perfil,
    idadeAposentadoria: estado.idade,
    temporadas: estado.resumos.length,
    temporadasProfissionais: estado.carreira.temporadasProfissionais,
    agencias,
    pontos,
    nivel,
    hallDaFama: nivel === 'Hall da Fama' || nivel === 'Lenda da moda',
    marcos: estado.marcos.map((m) => m.texto),
    estatisticas: {
      trabalhos: estado.carreira.trabalhos,
      destaques: estado.carreira.destaques,
      capas: estado.carreira.capas,
      desfilesDeModa: estado.carreira.desfilesDeModa,
      campanhasElite: estado.carreira.campanhasElite,
      titulosRanking: estado.carreira.titulosRanking,
      melhorRanking: estado.carreira.melhorRanking,
      picoOverall: estado.carreira.picoOverall,
      picoFama: Math.round(estado.carreira.picoFama),
      ganhosTotais: estado.carreira.ganhosTotais,
    },
    melhorTemporada: melhor && { temporada: melhor.temporada, idade: melhor.idade, overall: melhor.overall, fama: melhor.fama },
    patrimonio: Math.round(estado.dinheiro),
    caminhoPosCarreira: estado.caminhoPosCarreira ?? null,
    principalRival: principalRival && { nome: principalRival.nome, vitorias: principalRival.vitorias, derrotas: principalRival.derrotas },
  };
}
