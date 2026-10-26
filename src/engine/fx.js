// Linguagem de efeitos e atalhos compartilhados pelos eventos da vida (infância e vida adulta).

import { limitar as limitarAttr, calcularOverall } from './atributos.js';
import { marcarFlag } from './memoria.js';
import { ajustarRelacao } from './relacoes.js';
import {
  STATS_PESSOAIS, mudarStat, ganharAfinidade, mexerNaFamilia, parentesco, irmaos, conhecerAmigo,
} from './pessoa.js';

export const prim = (nome) => (nome ?? '').split(' ')[0];
export const nomeDe = (e, papel, padrao) => prim(parentesco(e, papel)?.nome) || padrao;
export const mae = (e) => nomeDe(e, 'mae', 'sua mãe');
export const pai = (e) => nomeDe(e, 'pai', 'seu pai');
export const avo = (e) => nomeDe(e, 'avo', 'sua avó');
export const amigoAleatorio = (e, rng) => (e.pessoa.amigos.length ? rng.escolher(e.pessoa.amigos) : null);

// Aplica o pacote de efeitos de uma escolha.
//   stats: { felicidade: 3, estudos: -2 }   afin: { passarela: 2 }   familia: { mae: 4, pai: -2, irmaos: 3, avo: 2 }
//   amigos: 4 (todos os amigos)   novoAmigo: true   flag: 'chave' | ['a', 'b']   dinheiro: -100
// Vida adulta: fama: 2   cansaco: 10   rel: { agente: 3 } (relações da carreira)   attr: { saude: -1 }
//   parceiro: 5 (relação com quem namora)   filhos: 4 (relação com os filhos)   dependencia: { bebida: 10 }
export function aplicarFx(e, rng, fx = {}) {
  for (const stat of STATS_PESSOAIS) if (fx[stat]) mudarStat(e, stat, fx[stat]);
  for (const [perfil, n] of Object.entries(fx.afin ?? {})) ganharAfinidade(e, perfil, n);
  for (const [alvo, delta] of Object.entries(fx.familia ?? {})) {
    if (alvo === 'irmaos') irmaos(e).forEach((i) => mexerNaFamilia(e, i.id, delta));
    else mexerNaFamilia(e, alvo, delta);
  }
  if (fx.amigos) for (const a of e.pessoa.amigos) a.relacao = Math.max(0, Math.min(100, a.relacao + fx.amigos));
  if (fx.novoAmigo) conhecerAmigo(e, rng);
  if (fx.dinheiro) e.dinheiro += fx.dinheiro;
  for (const f of [fx.flag].flat().filter(Boolean)) marcarFlag(e, f, null);

  if (fx.fama) e.fama = Math.max(0, Math.min(100, e.fama + fx.fama));
  if (fx.cansaco) e.cansaco = Math.max(0, Math.min(100, e.cansaco + fx.cansaco));
  for (const [chave, delta] of Object.entries(fx.rel ?? {})) ajustarRelacao(e, chave, delta);
  if (fx.attr) {
    for (const [a, delta] of Object.entries(fx.attr)) e.atributos[a] = limitarAttr(e.atributos[a] + delta);
    e.overall = calcularOverall(e.atributos, e.perfil);
  }
  if (fx.parceiro && e.pessoa.parceiro) e.pessoa.parceiro.relacao = Math.max(0, Math.min(100, e.pessoa.parceiro.relacao + fx.parceiro));
  if (fx.filhos) for (const f of e.pessoa.filhos) f.relacao = Math.max(0, Math.min(100, f.relacao + fx.filhos));
  for (const [subst, delta] of Object.entries(fx.dependencia ?? {})) {
    e.pessoa.dependencia[subst] = Math.max(0, Math.min(100, (e.pessoa.dependencia[subst] ?? 0) + delta));
  }
}

// Atalho para montar uma escolha com efeitos fixos e um texto de resultado.
export const esc = (id, texto, resultado, fx = {}) => ({
  id,
  texto,
  aplicar(e, rng, c) {
    aplicarFx(e, rng, fx);
    return typeof resultado === 'function' ? resultado(e, c) : resultado;
  },
});

