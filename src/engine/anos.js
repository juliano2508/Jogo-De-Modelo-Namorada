// A passagem dos anos da vida pessoal: do nascimento aos 17, e a virada para a carreira de modelo aos 18.

import { ATRIBUTOS, PERFIS, limitar as limitarAttr, calcularOverall } from './atributos.js';
import { DINHEIRO_INICIAL } from './config.js';
import { SEMANAS_POR_ANO, temFlag } from './memoria.js';
import { CLASSES, STATS_PESSOAIS, envelhecerPessoas, registrarDiario } from './pessoa.js';
import { prepararEventosDoAno } from './eventos-vida.js';
import { tempoLivreDoAno, atividadesDisponiveis, fazerAtividade } from './atividades.js';
import { ajustarRelacao } from './relacoes.js';
import { registrarEvento } from './mercado.js';

const MARCOS_DE_IDADE = {
  1: 'Você deu os primeiros passos.',
  2: 'Você falou as suas primeiras palavras.',
  4: 'Você entrou na pré-escola.',
  7: 'Você já lê sozinha, e adora.',
  11: 'Você começou o 6º ano, na escola grande.',
  15: 'Você começou o ensino médio.',
};

const limitar = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));

export const emVida = (estado) => estado.modo === 'vida';

// Começa a história no nascimento: abre o primeiro evento e libera o tempo livre do ano.
export function iniciarVida(estado, rng) {
  estado.pessoa.tempoLivre = tempoLivreDoAno(estado.idade);
  registrarDiario(estado, `Você nasceu em ${estado.origem}.`, 'aniversario');
  prepararEventosDoAno(estado, rng);
}

// Estatísticas se acomodam ao longo do ano: voltam devagar para uma linha de base que depende de como está a família.
function acomodarEstatisticas(estado) {
  const p = estado.pessoa;
  const pais = p.familia.filter((f) => f.vivo && (f.papel === 'mae' || f.papel === 'pai'));
  const relacaoMedia = pais.length ? pais.reduce((s, f) => s + f.relacao, 0) / pais.length : 50;
  const linhaDeBase = { felicidade: 38 + relacaoMedia * 0.25, saude: 62, estudos: 48, social: 48, criatividade: 48, disciplina: 48 };
  for (const stat of STATS_PESSOAIS) {
    p.stats[stat] = limitar(Math.round(p.stats[stat] + (linhaDeBase[stat] - p.stats[stat]) * 0.25));
  }
}

// Fecha o ano atual e começa o próximo.
export function avancarAnoDeVida(estado, rng) {
  if (!emVida(estado)) throw new Error('A vida pessoal só avança por anos antes da carreira começar.');
  if (estado.pendencia) throw new Error(`Resolva a pendência antes de seguir: ${estado.pendencia.tipo}.`);
  const p = estado.pessoa;
  if (p.aguardandoCarreira) throw new Error('Você já fez 18 anos: é hora de começar a carreira.');

  acomodarEstatisticas(estado);
  estado.idade += 1;
  estado.semanaAbsoluta += SEMANAS_POR_ANO;
  envelhecerPessoas(estado, rng);
  p.tempoLivre = tempoLivreDoAno(estado.idade);

  if (estado.idade >= 18) {
    p.aguardandoCarreira = true;
    p.fila = [];
    registrarDiario(estado, 'Você fez 18 anos. A vida adulta está começando!', 'aniversario');
    return null;
  }
  registrarDiario(estado, `Você completou ${estado.idade} anos.`, 'aniversario');
  if (MARCOS_DE_IDADE[estado.idade]) registrarDiario(estado, MARCOS_DE_IDADE[estado.idade], 'marco');
  prepararEventosDoAno(estado, rng);
  return estado.pendencia?.evento ?? null;
}

// ---------- Aos 18: o perfil nasce da vida que ela viveu ----------

export function perfilEmergente(afinidades) {
  const pontos = { passarela: afinidades.passarela, editorial: afinidades.editorial, comercial: afinidades.comercial, versatil: afinidades.versatil * 1.6 };
  const ordenados = Object.entries(pontos).sort((a, b) => b[1] - a[1]);
  const total = ordenados.reduce((s, [, v]) => s + v, 0);
  if (total < 4) return 'versatil';
  // Duas afinidades quase empatadas no topo: a pessoa é versátil.
  if (ordenados[1][1] >= ordenados[0][1] * 0.8) return 'versatil';
  return ordenados[0][0];
}

// Valor "típico" de cada estatística aos 18 (medido em vidas jogadas ao acaso): quem passa disso ganha
// pontos nos atributos, quem fica abaixo perde. Assim a vida vira vantagem ou desvantagem de verdade.
const CENTRO = { felicidade: 70, saude: 65, estudos: 58, social: 60, criatividade: 58, disciplina: 60 };

// Quanto a vida que ela teve soma (ou tira) de cada atributo, de -5 a +5 no máximo.
function ajusteDeVida(attr, s) {
  const v = Object.fromEntries(STATS_PESSOAIS.map((k) => [k, s[k] - CENTRO[k]]));
  const f = {
    profissionalismo: v.estudos / 8 + v.disciplina / 16,
    resistencia: v.saude / 8 + v.disciplina / 16,
    carisma: v.social / 7,
    expressao: v.criatividade / 8,
    fotogenia: v.criatividade / 16 + v.felicidade / 16,
    versatilidade: v.estudos / 16 + v.social / 16,
    passarela: v.disciplina / 12,
    saude: v.saude / 5,
  };
  return Math.max(-6, Math.min(6, Math.round(f[attr] ?? 0)));
}

// Marcas deixadas pelas decisões da juventude: cada uma vira uma pequena vantagem (ou desconfiança) na carreira.
const MARCAS_DE_JUVENTUDE = [
  ['pesquisou_agencia', (e) => ajustarRelacao(e, 'agente', 6)],
  ['indicada_agencia_seria', (e) => ajustarRelacao(e, 'agente', 8)],
  ['caiu_em_golpe', (e) => { ajustarRelacao(e, 'agente', -6); ajustarRelacao(e, 'direcao', -2); }],
  ['sabe_diferenciar_golpe', (e) => ajustarRelacao(e, 'agente', 3)],
  ['fez_ensaio_amigo', (e) => ajustarRelacao(e, 'fotografos', 6)],
  ['concurso_desfile', (e) => ajustarRelacao(e, 'estilistas', 4)],
  ['abriu_desfile', (e) => ajustarRelacao(e, 'estilistas', 3)],
  ['sabe_costura', (e) => ajustarRelacao(e, 'estilistas', 4)],
  ['redes_cedo', (e) => ajustarRelacao(e, 'midia', 6)],
  ['apostou_na_moda', (e) => ajustarRelacao(e, 'agente', 3)],
];

export function iniciarCarreiraDeModelo(estado, rng) {
  if (!emVida(estado) || !estado.pessoa.aguardandoCarreira) throw new Error('A carreira só começa depois dos 18 anos.');
  if (estado.pendencia) throw new Error(`Resolva a pendência antes de seguir: ${estado.pendencia.tipo}.`);
  const p = estado.pessoa;

  estado.perfil = perfilEmergente(p.afinidades);
  for (const a of ATRIBUTOS) {
    estado.atributos[a] = limitarAttr(estado.atributos[a] + (PERFIS[estado.perfil].bonus[a] ?? 0) + ajusteDeVida(a, p.stats));
  }
  estado.overall = calcularOverall(estado.atributos, estado.perfil);
  estado.dinheiro += Math.round(DINHEIRO_INICIAL * CLASSES[p.classe].dinheiro);
  for (const [flag, aplicar] of MARCAS_DE_JUVENTUDE) if (temFlag(estado, flag)) aplicar(estado);

  estado.modo = 'carreira';
  p.aguardandoCarreira = false;
  p.tempoLivre = 2;
  registrarDiario(estado, `Começa a carreira de modelo, no perfil ${PERFIS[estado.perfil].nome}.`, 'marco');
  registrarEvento(estado, 'fase', `${estado.nome} começa a carreira de modelo em ${estado.agencia.nome}, no perfil ${PERFIS[estado.perfil].nome}.`);
  return estado.perfil;
}

// ---------- Modo automático da infância (testes e simulação rápida) ----------

export function atividadesAutomaticas(estado, rng) {
  const p = estado.pessoa;
  while (p.tempoLivre > 0) {
    const lista = atividadesDisponiveis(estado);
    const ativ = rng.escolher(lista);
    let alvo = null;
    if (ativ.alvo === 'familia') {
      const vivos = p.familia.filter((f) => f.vivo);
      alvo = vivos.sort((a, b) => a.relacao - b.relacao)[0]?.id ?? null;
      if (!alvo) { p.tempoLivre -= 1; continue; }
    } else if (ativ.alvo === 'amigo') {
      alvo = p.amigos.length ? [...p.amigos].sort((a, b) => a.relacao - b.relacao)[0].id : null;
    }
    fazerAtividade(estado, rng, ativ.id, alvo);
  }
}
