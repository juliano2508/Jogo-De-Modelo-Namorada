// Agenda semanal, castings, momentos decisivos e evolução da temporada.

import { ATRIBUTOS, limitar, calcularOverall } from './atributos.js';
import { MARCAS, REVISTAS, SEMANAS_DE_MODA } from './mundo.js';
import { FASES, DIFICULDADES, BONUS_ACESSO_POR_TIER } from './config.js';
import { capacidadeDeEnergia } from './modelo.js';
import { efeitosVida, liquidarSemana, inflacao } from './vida.js';
import { gerarPropostas, verificarTroca, verificarChamada, registrarEvento } from './mercado.js';
import { atualizarLiga } from './liga.js';
import { efeitosRelacoes, patrocinioSemanal, atualizarPorResultados, derivarRelacoes, ajustarRelacao } from './relacoes.js';
import { sortearRival, ajustePorRival, registrarDisputa, rankingDaTemporada, atualizarRivais } from './rivais.js';
import { tentarEvento, temFlag } from './eventos.js';
import { registrarResultados, fecharTemporadaDeCarreira, verificarMarcos, pautaAposentadoria } from './carreira.js';

// Cada tipo de trabalho usa atributos diferentes (peso de cada um no teste).
export const TIPOS = {
  casting: { nome: 'Casting', pesos: { carisma: 2, fotogenia: 1, expressao: 1 }, custo: 15, cacheBase: 800, fama: 0.6, clientes: 'marcas' },
  desfile: { nome: 'Desfile', pesos: { passarela: 3, resistencia: 1, profissionalismo: 1 }, custo: 25, cacheBase: 3000, fama: 1.2, clientes: 'marcas' },
  ensaio: { nome: 'Ensaio de revista', pesos: { fotogenia: 2.5, expressao: 2, versatilidade: 0.5 }, custo: 20, cacheBase: 2500, fama: 1.4, clientes: 'revistas' },
  campanha: { nome: 'Campanha publicitária', pesos: { versatilidade: 2, profissionalismo: 1.5, fotogenia: 1.5 }, custo: 30, cacheBase: 8000, fama: 1.6, clientes: 'marcas' },
  entrevista: { nome: 'Entrevista', pesos: { carisma: 2.5, expressao: 1 }, custo: 10, cacheBase: 500, fama: 0.5, clientes: 'revistas' },
};

const limitarValor = (v, min, max) => Math.max(min, Math.min(max, v));

// Semana de moda só existe na carreira profissional.
export function semanaDeModa(estado) {
  if (estado.fase !== 'profissional') return null;
  return SEMANAS_DE_MODA.find((s) => s.semana === estado.semana) ?? null;
}

// Quão alto no mercado a modelo consegue chegar agora.
function limiteDeAcesso(estado) {
  const bruto = 25 + estado.overall * 0.5 + estado.fama * 0.3 + (BONUS_ACESSO_POR_TIER[estado.agencia.tier] ?? 0);
  return Math.min(bruto, FASES[estado.fase].prestigioMax);
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
  const rel = efeitosRelacoes(estado);
  const nota = notaNoTipo(estado, oferta.tipo);
  let chance = 0.5 + (nota - oferta.dificuldade) / 90;
  chance += rel.chance + rel.chancePorTipo(oferta.tipo);
  chance -= estado.cansaco / 250;
  chance += efeitosVida(estado.vida).chance;
  chance += ajustePorRival(estado, oferta);
  if (estado.dinheiro < 0) chance -= 0.04; // pressão financeira
  return limitarValor(chance, 0.05, 0.95);
}

export function custoReal(estado, oferta) {
  return Math.round(oferta.custo * (1 - efeitosVida(estado.vida).custoEnergia));
}

export function gerarAgenda(estado, rng) {
  const moda = semanaDeModa(estado);
  const fase = FASES[estado.fase];
  const limite = limiteDeAcesso(estado);
  const ofertas = [];
  // O agente consegue mais (ou menos) oportunidades conforme a relação.
  const quantidade = Math.max(2, rng.inteiro(4, 6) + efeitosRelacoes(estado).agendaExtra);

  const tiposSorteaveis = ['casting', 'casting', 'ensaio', 'campanha', 'entrevista', 'desfile'];

  const criar = (tipoId) => {
    const tipo = TIPOS[tipoId];
    const fonte = tipo.clientes === 'revistas' ? REVISTAS : MARCAS;
    // Clientes acessíveis, com uma folga para trabalhos "acima do alcance" (mais difíceis).
    let candidatos = fonte.filter((c) => c.prestigio <= Math.min(limite + 10, fase.prestigioMax));
    if (candidatos.length === 0) candidatos = [fonte[fonte.length - 1]];
    const cliente = rng.escolher(candidatos);

    const dificuldade = limitar(cliente.prestigio * 0.7 + 15 + rng.inteiro(-5, 5));
    // Curva em cubo: clientes pequenos pagam pouco, os de elite pagam muito mais.
    const fatorPrestigio = 0.15 + (cliente.prestigio / 100) ** 3 * 8;
    const cache = Math.round((tipo.cacheBase * fatorPrestigio * fase.multiplicadorCache * inflacao(estado)) / 50) * 50;

    const oferta = {
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
    // Trabalhos de prestígio costumam ser disputados com uma rival.
    if (estado.fase !== 'regional' && cliente.prestigio >= 55 && rng.chance(0.3)) {
      const rival = sortearRival(estado, rng);
      oferta.rival = { id: rival.id, nome: rival.nome };
    }
    return oferta;
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
    .map((o) => ({ o, valor: (calcularChance(estado, o) * (o.cache / 1000 + o.fama * 2)) / o.custo }))
    .sort((a, b) => b.valor - a.valor);

  const escolhidas = [];
  for (const { o } of ranqueadas) {
    const custo = custoReal(estado, o);
    if (energia >= custo) {
      escolhidas.push(o.id);
      energia -= custo;
    }
  }
  return escolhidas;
}

// Renda semanal dos contratos extras (exclusividade e embaixadora) e fim dos que expiraram.
function processarExtras(estado) {
  let renda = 0;
  for (const extra of estado.extras) {
    renda += extra.semanal;
    extra.semanasRestantes -= 1;
  }
  const encerrados = estado.extras.filter((x) => x.semanasRestantes <= 0);
  estado.extras = estado.extras.filter((x) => x.semanasRestantes > 0);
  for (const x of encerrados) {
    if (x.tipo === 'exclusividade') ajustarRelacao(estado, 'estilistas', 4);
    registrarEvento(estado, 'contrato', `O contrato de ${x.tipo} com ${x.marca} chegou ao fim.`);
  }
  return renda;
}

// Simula uma semana. `idsEscolhidos` são as ofertas que a jogadora decidiu disputar.
export function simularSemana(estado, rng, idsEscolhidos = []) {
  if (estado.aposentada) throw new Error('Carreira encerrada: a modelo já se aposentou.');
  if (estado.pendencia) {
    throw new Error(`Há uma pendência a resolver antes de seguir: ${estado.pendencia.tipo}.`);
  }
  if (estado.semana > estado.semanasTemporada) {
    throw new Error('Temporada encerrada: chame avancarTemporada().');
  }

  const cfg = DIFICULDADES[estado.dificuldade];
  const efeitos = efeitosVida(estado.vida);
  const rel = efeitosRelacoes(estado);
  const famaMult = rel.fama * estado.extras.reduce((m, x) => m * x.famaMult, 1);
  const emLesao = estado.lesao && estado.lesao.semanasRestantes > 0;
  const capacidade = capacidadeDeEnergia(estado);
  let gasto = 0;
  let cachesBrutos = 0;
  const resultados = [];

  if (!emLesao) {
    for (const id of idsEscolhidos) {
      const oferta = estado.agendaAtual.find((o) => o.id === id);
      if (!oferta) continue;
      const custo = custoReal(estado, oferta);
      if (gasto + custo > capacidade) continue;
      gasto += custo;

      const chance = calcularChance(estado, oferta);
      const sorteio = rng.proximo();
      let qualidade = 'falha';
      if (sorteio < chance) qualidade = 'normal';
      // Momento decisivo: parte dos acertos vira destaque (a relação com o agente aumenta a confiança).
      if (sorteio < chance * rel.fracaoDestaque) qualidade = 'destaque';

      const cache = qualidade === 'falha' ? 0 : Math.round(oferta.cache * (qualidade === 'destaque' ? 1.5 : 1));
      const bonusRival = oferta.rival && qualidade !== 'falha' ? 1.2 : 1; // levar o trabalho de uma rival rende mais fama
      const fama = qualidade === 'falha' ? 0 : oferta.fama * (qualidade === 'destaque' ? 1.6 : 1) * (1 + efeitos.fama) * famaMult * bonusRival * 0.4;

      cachesBrutos += cache;
      // Retorno decrescente: quanto mais famosa, mais difícil subir.
      estado.fama = limitarValor(estado.fama + fama * (1 - estado.fama / 110), 0, 100);
      resultados.push({ ...oferta, chance, qualidade, cacheRecebido: cache, famaGanha: fama });
      if (oferta.rival) registrarDisputa(estado, oferta, qualidade !== 'falha');

      // Treinar na prática: pequena chance de evoluir um atributo usado no trabalho.
      if (qualidade !== 'falha' && rng.chance(0.05)) evoluirAtributoDoTipo(estado, oferta.tipo, rng);
    }
  }

  // Renda que não depende de agenda: contratos extras e patrocínios (a agência também fica com a comissão).
  const extras = processarExtras(estado);
  const patrocinio = patrocinioSemanal(estado);
  cachesBrutos += extras + patrocinio;
  estado.carreira.ganhosTotais += extras + patrocinio;

  // Contas da semana (garantia, comissão, impostos, custo de vida...).
  const fin = liquidarSemana(estado, cachesBrutos);

  // Cansaço: muita agenda cansa; descansar, uma boa vida e bons bastidores recuperam.
  if (gasto > 60) {
    const reducao = 1 - (estado.atributos.resistencia - 25) / 150;
    estado.cansaco += ((gasto - 60) / 4) * reducao;
  } else {
    estado.cansaco -= (60 - gasto) / 3;
  }
  estado.cansaco -= efeitos.recuperacao + rel.recuperacao;
  if (estado.dinheiro < 0) estado.cansaco += 2;
  estado.cansaco = limitarValor(estado.cansaco, 0, 100);

  // A fama esfria sempre um pouco, e mais quando a modelo fica parada.
  estado.fama = Math.max(0, estado.fama - (resultados.length === 0 ? 0.6 : 0.25));

  // Relações: cada resultado mexe com quem estava envolvido, e tudo volta devagar para o neutro.
  atualizarPorResultados(estado, resultados, Boolean(emLesao));
  derivarRelacoes(estado);
  registrarResultados(estado, resultados);

  // Lesão: mais provável com saúde baixa e muito cansaço (e depois de voltar cedo demais).
  let novaLesao = null;
  if (emLesao) {
    estado.lesao.semanasRestantes -= 1;
    if (estado.lesao.semanasRestantes <= 0) estado.lesao = null;
  } else {
    const recaida = temFlag(estado, 'recaida_risco') ? 2 : 1;
    const risco =
      0.01 * (1 + (100 - estado.atributos.saude) / 50) * (1 + estado.cansaco / 50) * cfg.riscoLesao * (1 - efeitos.lesao) * recaida;
    if (rng.chance(risco)) {
      novaLesao = { semanasRestantes: rng.inteiro(2, 5) };
      estado.lesao = novaLesao;
      estado.atributos.saude = limitar(estado.atributos.saude - rng.inteiro(1, 3));
      registrarEvento(estado, 'lesao', `${estado.nome} se lesionou e ficará ${novaLesao.semanasRestantes} semanas fora.`);
    }
  }

  estado.overall = calcularOverall(estado.atributos, estado.perfil);

  const semanaJogada = estado.semana;
  const registro = {
    temporada: estado.temporada,
    semana: semanaJogada,
    fase: estado.fase,
    energiaGasta: gasto,
    cansaco: Math.round(estado.cansaco),
    emLesao: Boolean(emLesao),
    novaLesao: Boolean(novaLesao),
    extras,
    patrocinio,
    resultados,
    fin,
  };
  estado.historico.push(registro);
  estado.semana += 1;
  estado.semanaAbsoluta += 1;
  if (estado.eventoCooldown > 0) estado.eventoCooldown -= 1;
  estado.agendaAtual = [];

  // Eventos de mercado no meio da temporada.
  if (estado.fase === 'profissional' && semanaJogada === 20) registro.troca = verificarTroca(estado, rng);
  if (estado.fase === 'alternativo') registro.chamada = Boolean(verificarChamada(estado, rng));

  // Eventos com escolhas (só se nenhuma outra pendência estiver aberta).
  if (!estado.pendencia) registro.evento = tentarEvento(estado, rng);

  return registro;
}

function evoluirAtributoDoTipo(estado, tipoId, rng) {
  const atributos = Object.keys(TIPOS[tipoId].pesos);
  const alvo = rng.escolher(atributos);
  estado.atributos[alvo] = limitar(estado.atributos[alvo] + 1);
}

// Fim de temporada: guarda o resumo, fecha ranking e estatísticas, envelhece, evolui (ou declina)
// e abre a próxima pendência (aposentadoria, decisão da Seleção, Seleção obrigatória ou free agency).
export function avancarTemporada(estado, rng) {
  if (estado.aposentada) throw new Error('Carreira encerrada: a modelo já se aposentou.');
  if (estado.pendencia) {
    throw new Error(`Resolva a pendência antes de avançar: ${estado.pendencia.tipo}.`);
  }
  const semanas = estado.historico.filter((h) => h.temporada === estado.temporada);
  const todos = semanas.flatMap((h) => h.resultados);

  // Ranking anual entre a jogadora e as rivais (calculado antes da evolução do ano).
  const ranking = rankingDaTemporada(estado);

  const resumo = {
    temporada: estado.temporada,
    idade: estado.idade,
    fase: estado.fase,
    agencia: estado.agencia.nome,
    trabalhos: todos.filter((r) => r.qualidade !== 'falha').length,
    destaques: todos.filter((r) => r.qualidade === 'destaque').length,
    ganhos: todos.reduce((s, r) => s + r.cacheRecebido, 0),
    liquido: semanas.reduce((s, h) => s + h.fin.liquido, 0),
    semanasNoVermelho: semanas.filter((h) => h.fin.saldo < 0).length,
    dinheiro: estado.dinheiro,
    fama: Math.round(estado.fama),
    overall: estado.overall,
    ranking: ranking.posicao,
    relacoes: { ...estado.relacoes },
  };
  estado.resumos.push(resumo);

  fecharTemporadaDeCarreira(estado, ranking);
  verificarMarcos(estado);
  atualizarRivais(estado, rng);

  // Foto do fim da temporada: é a avaliação que as agências usam na Seleção.
  estado.snapshotSelecao = { overall: estado.overall, fama: estado.fama, destaques: resumo.destaques };

  estado.idade += 1;
  estado.temporada += 1;
  estado.semana = 1;
  estado.cansaco = 0;
  estado.lesao = null;
  estado.temporadasNaFase += 1;

  // Evolução anual: mais forte quando jovem, estável no auge e declínio leve depois dos 29.
  for (const a of ATRIBUTOS) {
    let delta = 0;
    if (estado.idade <= 21) delta = rng.inteiro(0, 3);
    else if (estado.idade <= 25) delta = rng.inteiro(0, 2);
    else if (estado.idade <= 29) delta = rng.inteiro(-1, 1);
    else if (a === 'passarela' || a === 'resistencia' || a === 'saude') delta = rng.inteiro(-3, 0);
    else delta = rng.inteiro(-1, 1);
    // O potencial oculto empurra a evolução para cima (ou para baixo) até os 28 anos.
    if (estado.idade <= 28) {
      const probabilidade = Math.min(0.9, Math.abs(estado.potencial) * 0.35);
      if (rng.proximo() < probabilidade) delta += Math.sign(estado.potencial) * rng.inteiro(1, 3);
    }
    estado.atributos[a] = limitar(estado.atributos[a] + delta);
  }
  estado.overall = calcularOverall(estado.atributos, estado.perfil);
  atualizarLiga(estado.liga, rng);
  estado.semanasTemporada = FASES[estado.fase].semanas;

  // Próxima pendência, conforme a fase.
  let proxima = null;
  if (estado.fase === 'regional') {
    proxima = { tipo: estado.temporadasNaFase === 1 ? 'decisao-selecao' : 'selecao' };
  } else if (estado.fase === 'alternativo') {
    proxima = { tipo: 'selecao' };
  } else if (estado.contrato) {
    estado.contrato.restante -= 1;
    if (estado.contrato.restante <= 0) {
      proxima = { tipo: 'free-agency', propostas: gerarPropostas(estado, rng) };
    }
  }

  // A aposentadoria vem antes: se a jogadora continuar, segue para a pendência que estava na fila.
  const pauta = pautaAposentadoria(estado);
  estado.pendencia = pauta
    ? { tipo: 'aposentadoria', motivos: pauta.motivos, obrigatoria: pauta.obrigatoria, depois: proxima }
    : proxima;
  return resumo;
}
