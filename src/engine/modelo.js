// Criação da modelo e estado inicial do jogo.
// O estado é só dados simples (serializável em JSON), para facilitar salvar e testar.

import { criarRng } from './rng.js';
import { ATRIBUTOS, PERFIS, limitar, calcularOverall } from './atributos.js';
import { AGENCIAS_REGIONAIS } from './mundo.js';

export function criarJogo({ nome = 'Nova Modelo', origem = 'Curitiba', perfil = 'versatil', semente } = {}) {
  if (!PERFIS[perfil]) {
    throw new Error(`Perfil inválido: ${perfil}. Use: ${Object.keys(PERFIS).join(', ')}`);
  }

  const sementeFinal = semente ?? Math.floor(Math.random() * 2 ** 31);
  const rng = criarRng(sementeFinal);

  // Atributos de novata: base entre 40 e 52, mais o bônus do perfil escolhido.
  const atributos = {};
  for (const a of ATRIBUTOS) {
    const bonus = PERFIS[perfil].bonus[a] ?? 0;
    atributos[a] = limitar(rng.inteiro(40, 52) + bonus);
  }

  const agencia = rng.escolher(AGENCIAS_REGIONAIS);

  const estado = {
    semente: sementeFinal,
    nome,
    origem,
    perfil,
    idade: 18,
    atributos,
    overall: calcularOverall(atributos, perfil),
    fama: 0, // 0 a 100
    dinheiro: 0, // o sistema Vida (Fase 2) vai usar isto
    cansaco: 0, // 0 a 100
    lesao: null, // { semanasRestantes }
    agencia: { id: agencia.id, nome: agencia.nome, tier: agencia.tier },
    relacoes: { agente: 50 }, // as demais entram na Fase 3
    fase: 'regional',
    temporada: 1,
    semana: 1,
    agendaAtual: [],
    historico: [], // um registro por semana simulada
    resumos: [], // um registro por temporada
  };

  return { estado, rng };
}

export function capacidadeDeEnergia(estado) {
  return Math.round(60 + estado.atributos.resistencia * 0.4);
}
