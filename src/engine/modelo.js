// Criação da modelo e estado inicial do jogo.
// O estado é só dados simples (serializável em JSON), para facilitar salvar e testar.

import { criarRng } from './rng.js';
import { ATRIBUTOS, PERFIS, limitar, calcularOverall } from './atributos.js';
import { AGENCIAS_REGIONAIS } from './mundo.js';
import { FASES, DIFICULDADES, DINHEIRO_INICIAL } from './config.js';
import { criarLiga } from './liga.js';
import { criarVidaInicial } from './vida.js';
import { criarContrato, garantiaDeMercado } from './mercado.js';

export function criarJogo({
  nome = 'Nova Modelo',
  origem = 'Curitiba',
  perfil = 'versatil',
  dificuldade = 'normal',
  semente,
  faseInicial = 'regional', // 'profissional' serve para testes e para pular o começo
} = {}) {
  if (!PERFIS[perfil]) {
    throw new Error(`Perfil inválido: ${perfil}. Use: ${Object.keys(PERFIS).join(', ')}`);
  }
  if (!DIFICULDADES[dificuldade]) {
    throw new Error(`Dificuldade inválida: ${dificuldade}. Use: ${Object.keys(DIFICULDADES).join(', ')}`);
  }

  const sementeFinal = semente ?? Math.floor(Math.random() * 2 ** 31);
  const rng = criarRng(sementeFinal);

  // Atributos de novata: base entre 40 e 52, mais o bônus do perfil escolhido.
  const atributos = {};
  for (const a of ATRIBUTOS) {
    const bonus = PERFIS[perfil].bonus[a] ?? 0;
    atributos[a] = limitar(rng.inteiro(40, 52) + bonus);
  }

  const liga = criarLiga(rng);
  let agencia;
  let contrato = null;
  if (faseInicial === 'profissional') {
    agencia = rng.escolher(Object.values(liga.agencias).filter((a) => a.tier === 2));
    const overall = calcularOverall(atributos, perfil);
    contrato = criarContrato({ duracao: 3, garantiaSemanal: garantiaDeMercado(overall, 0), tier: agencia.tier });
  } else {
    agencia = rng.escolher(AGENCIAS_REGIONAIS);
  }

  const estado = {
    semente: sementeFinal,
    nome,
    origem,
    perfil,
    dificuldade,
    idade: 18,
    // Talento oculto: quem tem potencial alto evolui mais e pode virar estrela; quem tem baixo estaciona.
    potencial: Math.round(Math.max(-1.5, Math.min(3, rng.normal(0, 1))) * 100) / 100,
    atributos,
    overall: calcularOverall(atributos, perfil),
    fama: 0, // 0 a 100
    dinheiro: DINHEIRO_INICIAL,
    semanasNoVermelho: 0,
    cansaco: 0, // 0 a 100
    lesao: null, // { semanasRestantes }
    fase: faseInicial,
    temporadasNaFase: 0,
    agencia: { id: agencia.id, nome: agencia.nome, tier: agencia.tier },
    contrato, // { duracao, restante, garantiaSemanal, comissao }
    vida: criarVidaInicial(),
    liga,
    relacoes: { agente: 50 }, // as demais entram na Fase 3
    pendencia: null, // decisão ou escolha que precisa ser resolvida antes de seguir
    snapshotSelecao: null,
    ultimaSelecao: null,
    temporada: 1,
    semana: 1,
    semanasTemporada: FASES[faseInicial].semanas,
    agendaAtual: [],
    historico: [], // um registro por semana simulada
    resumos: [], // um registro por temporada
    eventos: [], // marcos da carreira (contratos, Seleção, trocas)
  };
  if (faseInicial === 'profissional') estado.vida.moradia = 1;

  return { estado, rng };
}

export function capacidadeDeEnergia(estado) {
  return Math.round(60 + estado.atributos.resistencia * 0.4);
}
