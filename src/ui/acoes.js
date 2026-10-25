// Ações do jogador: ligam os botões ao motor, salvam e redesenham. Nenhuma regra de jogo fica aqui.

import {
  criarJogo, gerarAgenda, simularSemana, escolherAutomatico, avancarTemporada, mudarVida,
  decidirSelecao, confirmarSelecao, escolherProposta, resolverEvento, decidirAposentadoria, custoReal, capacidadeDeEnergia,
} from '../engine/index.js';
import { ctx } from './ctx.js';
import { salvarSlot, carregarSlot } from './save.js';
import { toast } from './util.js';

export const estadoAtual = () => ctx.jogo.estado;

function salvar() {
  const { estado, rng, slot } = ctx.jogo;
  if (!salvarSlot(slot, estado, rng) && !ctx.avisouSemSave) {
    ctx.avisouSemSave = true;
    toast('Não foi possível salvar neste navegador. Você pode continuar jogando, mas o progresso não será guardado.', 'erro');
  }
}

// Roda uma ação do motor: erros viram aviso, e o jogo é salvo e redesenhado.
function executar(fn) {
  try {
    const r = fn();
    salvar();
    ctx.render();
    return r;
  } catch (e) {
    console.error(e);
    toast(e.message, 'erro');
    ctx.render();
    return null;
  }
}

export function iniciarCarreira({ nome, origem, perfil, dificuldade, semente, slot }) {
  const parametros = { nome: nome.trim() || 'Nova Modelo', origem, perfil, dificuldade };
  if (Number.isInteger(semente)) parametros.semente = semente;
  const { estado, rng } = criarJogo(parametros);
  ctx.jogo = { estado, rng, slot };
  ctx.ui = { aba: 'semana', selecao: new Set(), ultimo: null, modal: { tipo: 'boas-vindas' } };
  ctx.tela = 'jogo';
  salvar();
  ctx.render();
}

export function continuarCarreira(slot) {
  const dados = carregarSlot(slot);
  if (!dados) {
    toast('Não foi possível abrir este jogo salvo.', 'erro');
    return;
  }
  ctx.jogo = { ...dados, slot };
  ctx.ui = { aba: 'semana', selecao: new Set(), ultimo: null, modal: null };
  ctx.tela = 'jogo';
  ctx.render();
}

// Garante que existe uma agenda para a semana atual (ela fica salva no estado).
export function prepararAgenda() {
  const { estado, rng } = ctx.jogo;
  if (estado.aposentada || estado.pendencia) return;
  if (estado.semana > estado.semanasTemporada) return;
  if (estado.agendaAtual.length === 0) gerarAgenda(estado, rng);
}

export function alternarOferta(id) {
  const { estado } = ctx.jogo;
  const sel = ctx.ui.selecao;
  if (sel.has(id)) sel.delete(id);
  else {
    const oferta = estado.agendaAtual.find((o) => o.id === id);
    const gasto = [...sel].reduce((s, i) => s + custoReal(estado, estado.agendaAtual.find((o) => o.id === i)), 0);
    if (gasto + custoReal(estado, oferta) > capacidadeDeEnergia(estado)) {
      toast('Sem energia suficiente para mais esse trabalho nesta semana.', 'erro');
      return;
    }
    sel.add(id);
  }
  ctx.render();
}

export function sugerirEscolha() {
  const { estado } = ctx.jogo;
  ctx.ui.selecao = new Set(escolherAutomatico(estado));
  ctx.render();
}

export function simularEstaSemana() {
  const { estado, rng } = ctx.jogo;
  executar(() => {
    const ids = [...ctx.ui.selecao];
    ctx.ui.ultimo = simularSemana(estado, rng, ids);
    ctx.ui.selecao = new Set();
    ctx.ui.piloto = null;
  });
}

// Piloto automático: joga semanas escolhendo sozinha até o fim da temporada ou até algo pedir decisão.
export function pilotoAutomatico() {
  const { estado, rng } = ctx.jogo;
  executar(() => {
    const resumo = { semanas: 0, liquido: 0, trabalhos: 0, destaques: 0, ganhos: 0 };
    while (!estado.pendencia && !estado.aposentada && estado.semana <= estado.semanasTemporada) {
      if (estado.agendaAtual.length === 0) gerarAgenda(estado, rng);
      const reg = simularSemana(estado, rng, escolherAutomatico(estado));
      ctx.ui.ultimo = reg;
      resumo.semanas += 1;
      resumo.liquido += reg.fin.liquido;
      resumo.trabalhos += reg.resultados.filter((r) => r.qualidade !== 'falha').length;
      resumo.destaques += reg.resultados.filter((r) => r.qualidade === 'destaque').length;
      resumo.ganhos += reg.fin.cachesBrutos;
    }
    ctx.ui.selecao = new Set();
    ctx.ui.piloto = resumo;
  });
}

export function encerrarTemporada() {
  const { estado, rng } = ctx.jogo;
  executar(() => {
    const resumo = avancarTemporada(estado, rng);
    ctx.ui.modal = { tipo: 'resumo-temporada', resumo };
    ctx.ui.ultimo = null;
    ctx.ui.piloto = null;
    ctx.ui.selecao = new Set();
  });
}

export function fecharModal() {
  ctx.ui.modal = null;
  ctx.render();
}

export function mudarPadraoDeVida(categoria, nivel, tipoRelacionamento) {
  const { estado } = ctx.jogo;
  const r = executar(() => mudarVida(estado, categoria, nivel, tipoRelacionamento));
  if (r) toast(r.taxa > 0 ? `Padrão de vida atualizado (taxa única de ${r.taxa.toLocaleString('pt-BR')} reais).` : 'Padrão de vida atualizado.');
}

// ---- Pendências ----

export function decidirIrOuFicar(escolha) {
  const { estado, rng } = ctx.jogo;
  const r = executar(() => decidirSelecao(estado, rng, escolha));
  if (r?.noite) ctx.ui.modal = { tipo: 'selecao-revelacao', resultado: r };
  else if (r?.ficou) toast('Você decidiu ficar mais um ano no circuito regional.');
  ctx.render();
}

export function fazerSelecao() {
  const { estado, rng } = ctx.jogo;
  const r = executar(() => confirmarSelecao(estado, rng));
  if (r?.noite) ctx.ui.modal = { tipo: 'selecao-revelacao', resultado: r };
  ctx.render();
}

export function aceitarProposta(indice) {
  const { estado, rng } = ctx.jogo;
  const nome = estado.pendencia?.propostas?.[indice]?.agenciaNome;
  const r = executar(() => escolherProposta(estado, rng, indice));
  if (r && nome) toast(indice === -1 ? 'Propostas recusadas.' : `Contrato assinado com ${nome}.`);
  else if (indice === -1) toast('Propostas recusadas. Você segue no circuito alternativo.');
}

export function escolherNoEvento(escolhaId) {
  const { estado, rng } = ctx.jogo;
  const titulo = estado.pendencia?.evento?.titulo;
  const textoEscolha = estado.pendencia?.evento?.escolhas.find((c) => c.id === escolhaId)?.texto;
  const r = executar(() => resolverEvento(estado, rng, escolhaId));
  if (r) ctx.ui.modal = { tipo: 'resultado-evento', titulo, escolha: textoEscolha, resultado: r.resultado };
  ctx.render();
}

export function decidirFimDeCarreira(escolha, caminho) {
  const { estado, rng } = ctx.jogo;
  executar(() => decidirAposentadoria(estado, rng, escolha, caminho));
  if (estado.aposentada) ctx.ui.modal = null;
  ctx.render();
}

export function voltarAoMenu() {
  ctx.tela = 'inicio';
  ctx.jogo = null;
  ctx.render();
}
