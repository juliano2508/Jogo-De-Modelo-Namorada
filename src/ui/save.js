// Salvamento em 3 slots no navegador (localStorage). Tudo em try/catch: o armazenamento pode estar
// bloqueado (janela anônima, por exemplo) e o jogo precisa continuar funcionando mesmo assim.

import { criarRng } from '../engine/rng.js';

export const SLOTS = [1, 2, 3];
const chave = (slot) => `primeira-capa:slot:${slot}`;

export function salvarSlot(slot, estado, rng) {
  try {
    const meta = {
      nome: estado.nome, idade: estado.idade, temporada: estado.temporada, fase: estado.fase,
      agencia: estado.agencia.nome, aposentada: estado.aposentada, nivel: estado.legado?.nivel ?? null,
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

export function carregarSlot(slot) {
  try {
    const bruto = localStorage.getItem(chave(slot));
    if (!bruto) return null;
    const dados = JSON.parse(bruto);
    return { estado: dados.estado, rng: criarRng(dados.rng) };
  } catch {
    return null;
  }
}

export function apagarSlot(slot) {
  try { localStorage.removeItem(chave(slot)); } catch { /* sem armazenamento */ }
}
