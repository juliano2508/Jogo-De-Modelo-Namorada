// Modo automático: decide pendências e o padrão de vida sozinho.
// Serve para simular carreiras inteiras (testes, balanceamento) e para a simulação rápida das fases secundárias.

import { criarJogo } from './modelo.js';
import {
  gerarAgenda, escolherAutomatico, simularSemana, avancarTemporada,
} from './semana.js';
import { decidirSelecao, confirmarSelecao } from './selecao.js';
import { escolherProposta, melhorIndiceDeProposta } from './mercado.js';
import { resolverEvento, escolhaAutomatica } from './eventos.js';
import { decidirAposentadoria, CAMINHOS_POS_CARREIRA } from './carreira.js';
import {
  nivelMaximo, custoDoNivel, mudarVida, rebaixarVidaForcado,
  custoSemanalVida, custoBasico, inflacao,
} from './vida.js';

// Como a jogadora (ou o computador) lida com o dinheiro.
// reserva = semanas de gastos que precisa ter guardadas antes de subir o padrão de vida;
// fracao = quanto do lucro semanal médio pode ser comprometido com o novo gasto.
export const POLITICAS_VIDA = {
  cautelosa: { reserva: 26, fracao: 0.3 },
  equilibrada: { reserva: 12, fracao: 0.6 },
  ostentosa: { reserva: 2, fracao: 3 },
};

const ORDEM_DE_PRIORIDADE = ['moradia', 'equipe', 'transporte', 'estilo', 'relacionamento', 'pet'];

// No automático a aposentadoria vem por saúde baixa, desempenho em queda ou após 20 temporadas.
function querAposentar(estado, pend, rng) {
  if (pend.obrigatoria) return true;
  if (estado.carreira.temporadasProfissionais >= 20) return true;
  // Quando a pauta aparece por saúde ou desempenho, decide caso a caso (nem todas param na hora).
  const emQueda = estado.idade >= 33 && (estado.overall < 55 || estado.atributos.saude < 40);
  return emQueda && rng.chance(0.5);
}

function escolherCaminho(estado, rng) {
  const possiveis = Object.entries(CAMINHOS_POS_CARREIRA)
    .filter(([, c]) => !c.exige || c.exige(estado))
    .map(([id]) => id);
  return rng.escolher(possiveis);
}

export function resolverPendenciaAuto(estado, rng) {
  const p = estado.pendencia;
  if (!p) return null;
  switch (p.tipo) {
    case 'decisao-selecao': {
      const s = estado.snapshotSelecao;
      return decidirSelecao(estado, rng, s.overall + s.fama * 0.15 >= 54 ? 'ir' : 'ficar');
    }
    case 'selecao':
      return confirmarSelecao(estado, rng);
    case 'free-agency':
    case 'proposta-alternativo':
      return escolherProposta(estado, rng, melhorIndiceDeProposta(p.propostas));
    case 'evento':
      return resolverEvento(estado, rng, escolhaAutomatica(estado, rng));
    case 'aposentadoria':
      return querAposentar(estado, p, rng)
        ? decidirAposentadoria(estado, rng, 'aposentar', escolherCaminho(estado, rng))
        : decidirAposentadoria(estado, rng, 'continuar');
    default:
      throw new Error(`Pendência desconhecida: ${p.tipo}`);
  }
}

export function ajustarVidaAuto(estado, rng, politica) {
  const cfg = POLITICAS_VIDA[politica];
  const recentes = estado.historico.slice(-10).map((h) => h.fin.liquido);
  const lucroMedio = recentes.length ? recentes.reduce((a, b) => a + b, 0) / recentes.length : 0;
  const gastoSemanal = Math.max(1, custoSemanalVida(estado) + custoBasico(estado));

  // Quem é prudente corta gastos por conta própria: no vermelho, ou quando o lucro está negativo
  // e a reserva já encolheu para menos da metade do que a política exige.
  if (politica !== 'ostentosa') {
    const reservaAtual = estado.dinheiro / gastoSemanal;
    if (estado.dinheiro < 0 || (lucroMedio < 0 && reservaAtual < cfg.reserva * 0.5)) {
      rebaixarVidaForcado(estado);
      return;
    }
  }

  for (const cat of ORDEM_DE_PRIORIDADE) {
    const atual = estado.vida[cat];
    if (atual >= nivelMaximo(cat)) continue;
    const extra = (custoDoNivel(cat, atual + 1) - custoDoNivel(cat, atual)) * inflacao(estado);
    const taxa = 2 * custoDoNivel(cat, atual + 1) * inflacao(estado);
    const semanasDeReserva = (estado.dinheiro - taxa) / gastoSemanal;
    if (semanasDeReserva >= cfg.reserva && extra <= Math.max(0, lucroMedio) * cfg.fracao) {
      const tipo = cat === 'relacionamento' ? estado.vida.tipoRelacionamento ?? rng.escolher(['homem', 'mulher']) : null;
      mudarVida(estado, cat, atual + 1, tipo);
      return;
    }
  }
}

// Simula uma carreira inteira no automático (até se aposentar ou atingir o limite de temporadas)
// e devolve métricas para balanceamento.
export function simularCarreira({
  semente, perfil = 'versatil', dificuldade = 'normal', politica = 'equilibrada', temporadas = 15,
  aoFimDaTemporada = null,
} = {}) {
  const { estado, rng } = criarJogo({ semente, perfil, dificuldade });
  const metricas = {
    semente,
    semanasNoVermelho: 0,
    piorSaldo: estado.dinheiro,
    ficouNoVermelho: false,
    foiEscolhida: null,
    posicaoSelecao: null,
    faseFinal: null,
    rebaixamentos: 0,
  };

  const resolver = () => {
    while (estado.pendencia) resolverPendenciaAuto(estado, rng);
  };

  for (let t = 0; t < temporadas && !estado.aposentada; t++) {
    resolver();
    if (estado.aposentada) break;
    ajustarVidaAuto(estado, rng, politica);
    while (estado.semana <= estado.semanasTemporada) {
      resolver();
      if (estado.semana % 10 === 1) ajustarVidaAuto(estado, rng, politica);
      gerarAgenda(estado, rng);
      const reg = simularSemana(estado, rng, escolherAutomatico(estado));
      if (estado.dinheiro < 0) {
        metricas.semanasNoVermelho += 1;
        metricas.ficouNoVermelho = true;
      }
      if (reg.fin.rebaixou) metricas.rebaixamentos += 1;
      metricas.piorSaldo = Math.min(metricas.piorSaldo, estado.dinheiro);
    }
    resolver();
    avancarTemporada(estado, rng);
    if (aoFimDaTemporada) aoFimDaTemporada(estado);
    if (metricas.foiEscolhida === null && estado.ultimaSelecao) {
      metricas.foiEscolhida = estado.ultimaSelecao.posicao !== null;
      metricas.posicaoSelecao = estado.ultimaSelecao.posicao;
    }
  }
  resolver();
  metricas.faseFinal = estado.fase;
  metricas.aposentada = estado.aposentada;
  metricas.dinheiroFinal = estado.dinheiro;
  metricas.fama = Math.round(estado.fama);
  metricas.overall = estado.overall;
  metricas.pontos = estado.legado?.pontos ?? null;
  metricas.nivel = estado.legado?.nivel ?? null;
  return { estado, rng, metricas };
}
