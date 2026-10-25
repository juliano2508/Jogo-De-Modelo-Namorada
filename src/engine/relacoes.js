// Relações: seis relações (0 a 100) com peso real no jogo, como técnico, vestiário, diretoria e mídia no basquete.
//
//   agente      -> quantidade de ofertas na agenda, chance de sucesso e de destaque
//   bastidores  -> moral: chance e recuperação do cansaço (colegas e equipe da agência)
//   direcao     -> contrato (renovação) e risco de troca de agência
//   midia       -> fama ganha por trabalho e patrocínios semanais
//   estilistas  -> chance em castings, desfiles e campanhas
//   fotografos  -> chance em ensaios e campanhas

import { inflacao } from './vida.js';

export const CHAVES_RELACAO = ['agente', 'bastidores', 'direcao', 'midia', 'estilistas', 'fotografos'];

export const ROTULOS_RELACAO = {
  agente: 'Agente',
  bastidores: 'Bastidores',
  direcao: 'Direção da agência',
  midia: 'Mídia',
  estilistas: 'Estilistas e casting',
  fotografos: 'Fotógrafos',
};

export function criarRelacoes() {
  return Object.fromEntries(CHAVES_RELACAO.map((c) => [c, 50]));
}

const limitar = (v) => Math.max(0, Math.min(100, v));
const arred1 = (v) => Math.round(v * 10) / 10;

export function ajustarRelacao(estado, chave, delta) {
  if (!(chave in estado.relacoes)) throw new Error(`Relação desconhecida: ${chave}`);
  estado.relacoes[chave] = limitar(arred1(estado.relacoes[chave] + delta));
}

// Efeitos prontos para uso na simulação.
export function efeitosRelacoes(estado) {
  const r = estado.relacoes;
  return {
    chance: (r.agente - 50) / 400 + (r.bastidores - 50) / 700,
    chancePorTipo(tipo) {
      if (tipo === 'ensaio') return (r.fotografos - 50) / 500;
      if (tipo === 'campanha') return (r.fotografos - 50 + (r.estilistas - 50)) / 1000;
      if (tipo === 'desfile' || tipo === 'casting') return (r.estilistas - 50) / 500;
      return 0;
    },
    agendaExtra: r.agente >= 85 ? 2 : r.agente >= 70 ? 1 : r.agente <= 30 ? -1 : 0,
    fracaoDestaque: 0.3 + (r.agente - 50) / 500,
    fama: 1 + (r.midia - 50) / 250,
    recuperacao: (r.bastidores - 50) / 50, // -1 a +1 ponto de cansaço por semana
  };
}

// Patrocínios semanais: só quem tem boa imagem na mídia e alguma fama.
export function patrocinioSemanal(estado) {
  const m = estado.relacoes.midia;
  if (m < 55 || estado.fama < 30) return 0;
  return Math.round(((m - 55) * estado.fama * 0.6 * inflacao(estado)) / 10) * 10;
}

const RELACOES_POR_TIPO = {
  casting: ['estilistas'],
  desfile: ['estilistas'],
  ensaio: ['fotografos'],
  campanha: ['estilistas', 'fotografos'],
  entrevista: ['midia'],
};

// Atualiza as relações depois de uma semana de trabalho.
export function atualizarPorResultados(estado, resultados, emLesao) {
  let sucessos = 0;
  for (const r of resultados) {
    const chaves = RELACOES_POR_TIPO[r.tipo] ?? [];
    const delta = r.qualidade === 'destaque' ? 0.4 : r.qualidade === 'normal' ? 0.2 : -0.25;
    for (const c of chaves) ajustarRelacao(estado, c, chaves.length > 1 ? delta * 0.75 : delta);
    if (r.qualidade !== 'falha') sucessos++;
    if (r.qualidade === 'destaque') ajustarRelacao(estado, 'direcao', 0.1);
  }
  if (sucessos >= 2) ajustarRelacao(estado, 'agente', 0.1);
  else if (resultados.length === 0 && !emLesao) ajustarRelacao(estado, 'agente', -0.2);
}

// Com o tempo as relações voltam para o neutro: é preciso cultivá-las o tempo todo.
// Quem trabalha bem fica acima de 50, mas dificilmente passa dos 80.
export function derivarRelacoes(estado) {
  for (const c of CHAVES_RELACAO) {
    estado.relacoes[c] = limitar(arred1(estado.relacoes[c] + (50 - estado.relacoes[c]) * 0.012));
  }
}
