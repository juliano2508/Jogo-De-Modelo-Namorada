// Agenda semanal, castings, momentos decisivos e evolução da temporada.

import { ATRIBUTOS, limitar, calcularOverall } from './atributos.js';
import { MARCAS, REVISTAS, SEMANAS_DE_MODA, SEMANAS_POR_TEMPORADA } from './mundo.js';
import { capacidadeDeEnergia } from './modelo.js';

// Cada tipo de trabalho usa atributos diferentes (peso de cada um no teste).
export const TIPOS = {
  casting: { nome: 'Casting', pesos: { carisma: 2, fotogenia: 1, expressao: 1 }, custo: 15, cacheBase: 800, fama: 0.6, clientes: 'marcas' },
  desfile: { nome: 'Desfile', pesos: { passarela: 3, resistencia: 1, profissionalismo: 1 }, custo: 25, cacheBase: 3000, fama: 1.2, clientes: 'marcas' },
  ensaio: { nome: 'Ensaio de revista', pesos: { fotogenia: 2.5, expressao: 2, versatilidade: 0.5 }, custo: 20, cacheBase: 2500, fama: 1.4, clientes: 'revistas' },
  campanha: { nome: 'Campanha publicitária', pesos: { versatilidade: 2, profissionalismo: 1.5, fotogenia: 1.5 }, custo: 30, cacheBase: 8000, fama: 1.6, clientes: 'marcas' },
  entrevista: { nome: 'Entrevista', pesos: { carisma: 2.5, expressao: 1 }, custo: 10, cacheBase: 500, fama: 0.5, clientes: 'revistas' },
};

const BONUS_POR_TIER = { 1: 15, 2: 8, 3: 3, 4: 0 };

const limitarValor = (v, min, max) => Math.max(min, Math.min(max, v));

export function semanaDeModa(semana) {
  return SEMANAS_DE_MODA.find((s) => s.semana === semana) ?? null;
}

// Quão alto no mercado a modelo consegue chegar agora.
function limiteDeAcesso(estado) {
  return 25 + estado.overall * 0.5 + estado.fama * 0.3 + (BONUS_POR_TIER[estado.agencia.tier] ?? 0);
}

function notaNoTipo(estado, tipoId) {
  const { pesos } = TIPOS[tipoId];
  let soma = 0;
  let total = 0;
  for (const [attr, peso] of Object.entries(pesos)) {
    soma += estado.atributos[attr] * peso;
    total += peso;
  }
  return soma / total;
}

export function calcularChance(estado, oferta) {
  const nota = notaNoTipo(estado, oferta.tipo);
  let chance = 0.5 + (nota - oferta.dificuldade) / 90;
  chance += (estado.relacoes.agente - 50) / 400;
  chance -= estado.cansaco / 250;
  return limitarValor(chance, 0.05, 0.95);
}

export function gerarAgenda(estado, rng) {
  const moda = semanaDeModa(estado.semana);
  const limite = limiteDeAcesso(estado);
  const ofertas = [];
  const quantidade = rng.inteiro(4, 6);

  const tiposSorteaveis = ['casting', 'casting', 'ensaio', 'campanha', 'entrevista', 'desfile'];

  const criar = (tipoId) => {
    const tipo = TIPOS[tipoId];
    const fonte = tipo.clientes === 'revistas' ? REVISTAS : MARCAS;
    // Clientes acessíveis, com uma folga para trabalhos "acima do alcance" (mais difíceis).
    let candidatos = fonte.filter((c) => c.prestigio <= limite + 10);
    if (candidatos.length === 0) candidatos = [fonte[fonte.length - 1]];
    const cliente = rng.escolher(candidatos);

    const dificuldade = limitar(cliente.prestigio * 0.7 + 15 + rng.inteiro(-5, 5));
    // Curva em cubo: clientes pequenos pagam pouco, os de elite pagam muito mais.
    const fatorPrestigio = 0.15 + (cliente.prestigio / 100) ** 3 * 8;
    const cache = Math.round((tipo.cacheBase * fatorPrestigio) / 50) * 50;

    return {
      id: `s${estado.temporada}-w${estado.semana}-${ofertas.length}`,
      tipo: tipoId,
      tipoNome: tipo.nome,
      cliente: cliente.nome,
      prestigio: cliente.prestigio,
      dificuldade,
      custo: tipo.custo,
      cache,
      fama: Math.round(tipo.fama * cliente.prestigio) / 100,
      semanaDeModa: moda ? moda.nome : null,
    };
  };

  for (let i = 0; i < quantidade; i++) ofertas.push(criar(rng.escolher(tiposSorteaveis)));

  // Semana de moda: desfiles extras, com mais prestígio em jogo.
  if (moda) {
    for (let i = 0; i < 2; i++) ofertas.push(criar('desfile'));
  }

  estado.agendaAtual = ofertas;
  return ofertas;
}

// Escolha automática para simulação rápida: melhor retorno esperado dentro da energia.
export function escolherAutomatico(estado, ofertas = estado.agendaAtual) {
  let energia = capacidadeDeEnergia(estado);
  const ranqueadas = [...ofertas]
    .map((o) => ({ o, valor: calcularChance(estado, o) * (o.cache / 1000 + o.fama * 2) / o.custo }))
    .sort((a, b) => b.valor - a.valor);

  const escolhidas = [];
  for (const { o } of ranqueadas) {
    if (energia >= o.custo) {
      escolhidas.push(o.id);
      energia -= o.custo;
    }
  }
  return escolhidas;
}

// Simula uma semana. `idsEscolhidos` são as ofertas que a jogadora decidiu disputar.
export function simularSemana(estado, rng, idsEscolhidos = []) {
  if (estado.semana > SEMANAS_POR_TEMPORADA) {
    throw new Error('Temporada encerrada: chame avancarTemporada().');
  }

  const emLesao = estado.lesao && estado.lesao.semanasRestantes > 0;
  const capacidade = capacidadeDeEnergia(estado);
  let gasto = 0;
  const resultados = [];

  if (!emLesao) {
    for (const id of idsEscolhidos) {
      const oferta = estado.agendaAtual.find((o) => o.id === id);
      if (!oferta || gasto + oferta.custo > capacidade) continue;
      gasto += oferta.custo;

      const chance = calcularChance(estado, oferta);
      const sorteio = rng.proximo();
      let qualidade = 'falha';
      if (sorteio < chance) qualidade = 'normal';
      // Momento decisivo: parte dos acertos vira destaque (cachê e fama maiores).
      if (sorteio < chance * 0.3) qualidade = 'destaque';

      const cache = qualidade === 'falha' ? 0 : Math.round(oferta.cache * (qualidade === 'destaque' ? 1.5 : 1));
      const fama = qualidade === 'falha' ? 0 : oferta.fama * (qualidade === 'destaque' ? 1.6 : 1);

      estado.dinheiro += cache;
      // Retorno decrescente: quanto mais famosa, mais difícil subir.
      estado.fama = limitarValor(estado.fama + fama * (1 - estado.fama / 110), 0, 100);
      resultados.push({ ...oferta, chance, qualidade, cacheRecebido: cache, famaGanha: fama });

      // Treinar na prática: pequena chance de evoluir um atributo usado no trabalho.
      if (qualidade !== 'falha' && rng.chance(0.18)) evoluirAtributoDoTipo(estado, oferta.tipo, rng);
    }
  }

  // Cansaço: muita agenda cansa; descansar recupera. Resistência alta cansa menos.
  if (gasto > 60) {
    const reducao = 1 - (estado.atributos.resistencia - 25) / 150;
    estado.cansaco = limitarValor(estado.cansaco + ((gasto - 60) / 4) * reducao, 0, 100);
  } else {
    estado.cansaco = limitarValor(estado.cansaco - (60 - gasto) / 3, 0, 100);
  }

  // A fama esfria sempre um pouco, e mais quando a modelo fica parada.
  estado.fama = Math.max(0, estado.fama - (resultados.length === 0 ? 0.5 : 0.2));

  // Lesão: mais provável com saúde baixa e muito cansaço.
  let novaLesao = null;
  if (emLesao) {
    estado.lesao.semanasRestantes -= 1;
    if (estado.lesao.semanasRestantes <= 0) estado.lesao = null;
  } else {
    const risco = 0.01 * (1 + (100 - estado.atributos.saude) / 50) * (1 + estado.cansaco / 50);
    if (rng.chance(risco)) {
      novaLesao = { semanasRestantes: rng.inteiro(2, 5) };
      estado.lesao = novaLesao;
      estado.atributos.saude = limitar(estado.atributos.saude - rng.inteiro(1, 3));
    }
  }

  estado.overall = calcularOverall(estado.atributos, estado.perfil);

  const registro = {
    temporada: estado.temporada,
    semana: estado.semana,
    energiaGasta: gasto,
    cansaco: Math.round(estado.cansaco),
    emLesao: Boolean(emLesao),
    novaLesao: Boolean(novaLesao),
    resultados,
  };
  estado.historico.push(registro);
  estado.semana += 1;
  estado.agendaAtual = [];
  return registro;
}

function evoluirAtributoDoTipo(estado, tipoId, rng) {
  const atributos = Object.keys(TIPOS[tipoId].pesos);
  const alvo = rng.escolher(atributos);
  estado.atributos[alvo] = limitar(estado.atributos[alvo] + 1);
}

// Fim de temporada: envelhece, evolui (ou declina) e guarda o resumo.
export function avancarTemporada(estado, rng) {
  const semanasDaTemporada = estado.historico.filter((h) => h.temporada === estado.temporada);
  const todos = semanasDaTemporada.flatMap((h) => h.resultados);

  const resumo = {
    temporada: estado.temporada,
    idade: estado.idade,
    agencia: estado.agencia.nome,
    trabalhos: todos.filter((r) => r.qualidade !== 'falha').length,
    destaques: todos.filter((r) => r.qualidade === 'destaque').length,
    ganhos: todos.reduce((s, r) => s + r.cacheRecebido, 0),
    fama: Math.round(estado.fama),
    overall: estado.overall,
  };
  estado.resumos.push(resumo);

  estado.idade += 1;
  estado.temporada += 1;
  estado.semana = 1;
  estado.cansaco = 0;
  estado.lesao = null;

  // Evolução anual: mais forte quando jovem, estável no auge e declínio leve depois dos 29.
  for (const a of ATRIBUTOS) {
    let delta = 0;
    if (estado.idade <= 24) delta = rng.inteiro(0, 3);
    else if (estado.idade <= 29) delta = rng.inteiro(-1, 2);
    else if (a === 'passarela' || a === 'resistencia' || a === 'saude') delta = rng.inteiro(-3, 0);
    else delta = rng.inteiro(-1, 1);
    estado.atributos[a] = limitar(estado.atributos[a] + delta);
  }
  estado.overall = calcularOverall(estado.atributos, estado.perfil);
  return resumo;
}

// Simula uma temporada inteira no automático (útil para testes e balanceamento).
export function simularTemporada(estado, rng) {
  while (estado.semana <= SEMANAS_POR_TEMPORADA) {
    gerarAgenda(estado, rng);
    simularSemana(estado, rng, escolherAutomatico(estado));
  }
  return avancarTemporada(estado, rng);
}
