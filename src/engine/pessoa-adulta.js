// Vida adulta: parceiro, filhos, família envelhecendo e luto. Tudo serializável e sorteado só pelo rng.

import { NOMES_F, NOMES_M, SOBRENOMES, nomeAleatorio, registrarDiario, envelhecerPessoas, parentesco } from './pessoa.js';
import { marcarFlag } from './memoria.js';
import { aplicarHabitosAnuais } from './habitos.js';

const limitar = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const novoId = (prefixo, rng) => `${prefixo}-${rng.inteiro(100000, 999999)}`;
const PROFISSOES = ['fotógrafo', 'engenheiro', 'professor', 'chef de cozinha', 'músico', 'advogado', 'enfermeiro', 'designer', 'arquiteto', 'produtor de eventos'];

export const STATUS_PARCEIRO = { namoro: 'Namorando', noivado: 'Noivos', casados: 'Casados' };

export function criarParceiro(estado, rng, origem = 'encontro') {
  const sexo = rng.chance(0.5) ? 'm' : 'f';
  const nome = `${nomeAleatorio(rng, sexo)} ${rng.escolher(SOBRENOMES)}`;
  const parceiro = {
    id: novoId('parceiro', rng), nome, sexo, idade: Math.max(18, estado.idade + rng.inteiro(-3, 5)),
    profissao: rng.escolher(PROFISSOES), relacao: rng.inteiro(55, 75), status: 'namoro', desdeIdade: estado.idade, origem,
  };
  estado.pessoa.parceiro = parceiro;
  registrarDiario(estado, `Você começou a namorar ${parceiro.nome.split(' ')[0]}.`, 'amor');
  return parceiro;
}

export function terminarRelacao(estado, motivo = 'terminou') {
  const p = estado.pessoa;
  if (!p.parceiro) return null;
  const ex = { ...p.parceiro, fimIdade: estado.idade, motivo };
  p.ex.push(ex);
  p.parceiro = null;
  if (ex.status === 'casados') marcarFlag(estado, 'divorciada', null);
  return ex;
}

export function adicionarFilho(estado, rng) {
  const sexo = rng.chance(0.5) ? 'm' : 'f';
  const filho = { id: novoId('filho', rng), nome: nomeAleatorio(rng, sexo), sexo, idade: 0, relacao: 70 };
  estado.pessoa.filhos.push(filho);
  registrarDiario(estado, `${filho.nome} nasceu.`, 'familia');
  return filho;
}

// Parente morre: vira diário e fila um evento de luto.
export function perderParente(estado, parente) {
  parente.vivo = false;
  estado.pessoa.fila.push('luto');
  estado.pessoa.ultimoLuto = { id: parente.id, papel: parente.papel };
  registrarDiario(estado, `${parente.nome.split(' ')[0]} faleceu aos ${parente.idade} anos.`, 'familia');
}

// Fim de temporada na vida adulta.
export function avancarAnoAdulto(estado, rng) {
  const p = estado.pessoa;
  if (!p) return;
  aplicarHabitosAnuais(estado, rng);
  p.tempoLivre = 2;
  envelhecerPessoas(estado, rng);

  for (const parente of p.familia) {
    if (!parente.vivo) continue;
    const excesso = parente.idade - (parente.papel === 'avo' ? 76 : 70);
    if (excesso > 0 && rng.chance(Math.min(0.5, excesso * (parente.papel === 'avo' ? 0.03 : 0.012)))) perderParente(estado, parente);
  }

  const par = p.parceiro;
  if (par) {
    par.relacao = limitar(Math.round(par.relacao + (60 - par.relacao) * 0.08 - 2));
    if (par.relacao < 15) {
      registrarDiario(estado, `${par.nome.split(' ')[0]} e você se afastaram de vez.`, 'amor');
      terminarRelacao(estado, 'afastamento');
    }
  }
  for (const f of p.filhos) f.relacao = limitar(Math.round(f.relacao - 2 + (f.idade < 13 ? 0 : -1)));
  p.stats.felicidade = limitar(p.stats.felicidade + (par && par.relacao >= 60 ? 2 : 0) - (p.dependencia.bebida >= 60 || p.dependencia.cigarro >= 60 ? 2 : 0));
}

export const mae = (e) => parentesco(e, 'mae');
export { NOMES_F, NOMES_M };
