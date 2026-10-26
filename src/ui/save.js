// Salvamento em 3 slots no navegador (localStorage). Tudo em try/catch: o armazenamento pode estar
// bloqueado (janela anônima, por exemplo) e o jogo precisa continuar funcionando mesmo assim.

import { criarRng } from '../engine/rng.js';

export const SLOTS = [1, 2, 3];
const chave = (slot) => `primeira-capa:slot:${slot}`;

export function salvarSlot(slot, estado, rng) {
  try {
    const meta = {
      nome: estado.nome, idade: estado.idade, temporada: estado.temporada, fase: estado.fase,
      agencia: estado.agencia.nome, modo: estado.modo ?? 'carreira', aposentada: estado.aposentada, nivel: estado.legado?.nivel ?? null,
      salvoEm: Date.now(),
    };
    localStorage.setItem(chave(slot), JSON.stringify({ versao: 1, meta, estado, rng: rng.estadoInterno() }));
    return true;
  } catch {
    return false;
  }
}

export function lerMeta(slot) {
  try {
    const bruto = localStorage.getItem(chave(slot));
    return bruto ? JSON.parse(bruto).meta : null;
  } catch {
    return null;
  }
}

// Confere o essencial do estado: um save adulterado ou de outra versão não pode derrubar o jogo.
function estruturaValida(d) {
  const e = d?.estado;
  return d?.versao === 1 && Number.isInteger(d.rng) && e && typeof e === 'object'
    && typeof e.nome === 'string' && e.atributos && e.relacoes && e.liga?.agencias && e.carreira
    && Array.isArray(e.rivais) && Array.isArray(e.historico) && Array.isArray(e.resumos) && Array.isArray(e.eventos)
    && Array.isArray(e.agendaAtual) && Array.isArray(e.extras) && e.vida && e.memoria && e.agencia
    && Number.isFinite(e.dinheiro) && Number.isInteger(e.semana) && Number.isInteger(e.temporada);
}

// Saves antigos (antes da vida pessoal ou da vida adulta) ganham os campos novos sem perder nada.
function migrar(e) {
  if (e.pessoa) {
    e.pessoa.dependencia ??= { bebida: 0, cigarro: 0 };
    e.pessoa.habitos ??= { sono: 1, exercicio: 1, bebida: 0, cigarro: 0, autocuidado: 0 };
    e.pessoa.ex ??= [];
    e.pessoa.filhos ??= [];
    e.pessoa.fila ??= [];
    e.pessoa.eventosVistos ??= [];
    e.pessoa.tempoLivre ??= 0;
    e.diario ??= [];
  }
  e.eventoVidaCooldown ??= 0;
}

export function carregarSlot(slot) {
  try {
    const bruto = localStorage.getItem(chave(slot));
    if (!bruto) return null;
    const dados = JSON.parse(bruto);
    if (!estruturaValida(dados)) return null;
    migrar(dados.estado);
    return { estado: dados.estado, rng: criarRng(dados.rng) };
  } catch {
    return null;
  }
}

export function apagarSlot(slot) {
  try { localStorage.removeItem(chave(slot)); } catch { /* sem armazenamento */ }
}
