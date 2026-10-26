import { energiaDosFilhos } from './habitos.js';
// Criação da modelo e estado inicial do jogo.
// O estado é só dados simples (serializável em JSON), para facilitar salvar e testar.

import { criarRng } from './rng.js';
import { ATRIBUTOS, PERFIS, limitar, calcularOverall } from './atributos.js';
import { AGENCIAS_REGIONAIS } from './mundo.js';
import { FASES, DIFICULDADES, DINHEIRO_INICIAL } from './config.js';
import { criarLiga } from './liga.js';
import { criarVidaInicial } from './vida.js';
import { criarRelacoes } from './relacoes.js';
import { criarRivais } from './rivais.js';
import { criarCarreira } from './carreira.js';
import { criarContrato, garantiaDeMercado } from './mercado.js';
import { criarPessoa } from './pessoa.js';
import { iniciarVida } from './anos.js';

export function criarJogo({
  nome = 'Nova Modelo',
  origem = 'Curitiba',
  perfil = 'versatil',
  dificuldade = 'normal',
  semente,
  faseInicial = 'regional', // 'profissional' serve para testes e para pular o começo
  inicio = 'aos18', // 'nascimento': a história começa no berço e o perfil nasce da vida vivida
} = {}) {
  const nascimento = inicio === 'nascimento';
  if (nascimento && faseInicial !== 'regional') throw new Error('Começar no nascimento só combina com a fase regional.');
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
    // No nascimento o perfil ainda não existe: o bônus entra aos 18, conforme a vida vivida.
    const bonus = nascimento ? 0 : PERFIS[perfil].bonus[a] ?? 0;
    atributos[a] = limitar(rng.inteiro(40, 52) + bonus);
  }

  const liga = criarLiga(rng);
  const rivais = criarRivais(rng);
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
    idade: nascimento ? 0 : 18,
    modo: nascimento ? 'vida' : 'carreira', // 'vida' = anos da infância e adolescência, antes da carreira
    // Talento oculto: quem tem potencial alto evolui mais e pode virar estrela; quem tem baixo estaciona.
    potencial: Math.round(Math.max(-1.5, Math.min(3, rng.normal(0, 1))) * 100) / 100,
    atributos,
    overall: calcularOverall(atributos, perfil),
    fama: 0, // 0 a 100
    dinheiro: nascimento ? 0 : DINHEIRO_INICIAL,
    semanasNoVermelho: 0,
    cansaco: 0, // 0 a 100
    lesao: null, // { semanasRestantes }
    fase: faseInicial,
    temporadasNaFase: 0,
    agencia: { id: agencia.id, nome: agencia.nome, tier: agencia.tier },
    contrato, // { duracao, restante, garantiaSemanal, comissao }
    vida: criarVidaInicial(),
    liga,
    relacoes: criarRelacoes(), // agente, bastidores, direcao, midia, estilistas, fotografos (0 a 100)
    rivais, // rivais com rivalidades de vários anos
    memoria: { flags: {}, decisoes: [] }, // decisões passadas que liberam eventos futuros
    extras: [], // contratos de exclusividade e de embaixadora (renda semanal extra)
    carreira: criarCarreira(), // estatísticas para marcos e Hall da Fama
    marcos: [],
    semanaAbsoluta: 0,
    eventoCooldown: 0,
    eventoVidaCooldown: 0,
    aposentada: false,
    legado: null,
    caminhoPosCarreira: null,
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

  // A pessoa por trás da modelo (família, amigos, estatísticas). Criada por último para não mexer nos sorteios anteriores.
  estado.pessoa = criarPessoa(rng, { idade: estado.idade });
  estado.diario = [];
  if (nascimento) iniciarVida(estado, rng);

  return { estado, rng };
}

export function capacidadeDeEnergia(estado) {
  return Math.max(30, Math.round(60 + estado.atributos.resistencia * 0.4) - energiaDosFilhos(estado));
}
