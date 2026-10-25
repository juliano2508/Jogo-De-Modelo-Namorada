import assert from 'node:assert/strict';
import {
  ATRIBUTOS, ATTR_MIN, ATTR_MAX, PERFIS, FASES,
  criarJogo, gerarAgenda, simularSemana, escolherAutomatico, avancarTemporada,
  executarSelecao, decidirSelecao, confirmarSelecao, garantiaDeRookie, escolherProposta,
  mudarVida, efeitosVida, calcularImposto, simularCarreira, POLITICAS_VIDA,
} from '../src/engine/index.js';

function checarEstado(estado) {
  for (const a of ATRIBUTOS) {
    assert.ok(estado.atributos[a] >= ATTR_MIN && estado.atributos[a] <= ATTR_MAX, `${a} fora da escala: ${estado.atributos[a]}`);
  }
  assert.ok(estado.overall >= ATTR_MIN && estado.overall <= ATTR_MAX, 'overall fora da escala');
  assert.ok(estado.fama >= 0 && estado.fama <= 100, 'fama fora de 0-100');
  assert.ok(estado.cansaco >= 0 && estado.cansaco <= 100, 'cansaço fora de 0-100');
  assert.ok(Number.isFinite(estado.dinheiro), 'dinheiro inválido');
}

// 1) Mesma semente, mesma carreira.
{
  const a = simularCarreira({ semente: 123, perfil: 'editorial', temporadas: 8 });
  const b = simularCarreira({ semente: 123, perfil: 'editorial', temporadas: 8 });
  assert.deepEqual(a.estado, b.estado, 'mesma semente deveria gerar o mesmo resultado');
}

// 2) Fase regional: 20 semanas, depois a jogadora decide sobre a Seleção.
{
  const { estado, rng } = criarJogo({ semente: 7 });
  assert.equal(estado.fase, 'regional');
  assert.equal(estado.semanasTemporada, FASES.regional.semanas);
  while (estado.semana <= estado.semanasTemporada) {
    gerarAgenda(estado, rng);
    simularSemana(estado, rng, escolherAutomatico(estado));
  }
  assert.equal(estado.historico.length, 20);
  assert.throws(() => simularSemana(estado, rng, []), /Temporada encerrada/);
  avancarTemporada(estado, rng);
  assert.equal(estado.pendencia.tipo, 'decisao-selecao');
  assert.throws(() => simularSemana(estado, rng, []), /pendência/);
  assert.equal(estado.idade, 19);
  checarEstado(estado);
}

// 3) Ficar mais um ano leva à Seleção obrigatória; sem agência grande, vai ao circuito alternativo.
{
  const j = criarJogo({ semente: 21 });
  const e = j.estado;
  while (e.semana <= e.semanasTemporada) { gerarAgenda(e, j.rng); simularSemana(e, j.rng, escolherAutomatico(e)); }
  avancarTemporada(e, j.rng);
  decidirSelecao(e, j.rng, 'ficar');
  assert.equal(e.fase, 'regional');
  while (e.semana <= e.semanasTemporada) { gerarAgenda(e, j.rng); simularSemana(e, j.rng, escolherAutomatico(e)); }
  avancarTemporada(e, j.rng);
  assert.equal(e.pendencia.tipo, 'selecao', 'após 2 anos regionais a Seleção é obrigatória');
  const res = confirmarSelecao(e, j.rng);
  if (res.escolhida) {
    assert.equal(e.fase, 'profissional');
    assert.ok(e.contrato.garantiaSemanal > 0 && e.contrato.restante >= 2);
  } else {
    assert.equal(e.fase, 'alternativo', 'não escolhida após 2 anos vai ao circuito alternativo');
  }
  assert.equal(e.pendencia, null);
}

// 4) Noite da Seleção: 60 escolhas únicas em 2 rodadas; garantia cai com a posição.
{
  const { estado, rng } = criarJogo({ semente: 5 });
  estado.snapshotSelecao = { overall: 60, fama: 10, destaques: 5 };
  const res = executarSelecao(estado, rng);
  assert.equal(res.noite.length, 60);
  assert.deepEqual(res.noite.map((n) => n.posicao), Array.from({ length: 60 }, (_, i) => i + 1));
  assert.equal(new Set(res.noite.map((n) => n.nome)).size, 60, 'candidata escolhida duas vezes');
  assert.equal(res.noite.filter((n) => n.rodada === 1).length, 30);
  assert.ok(garantiaDeRookie(1) > garantiaDeRookie(30) && garantiaDeRookie(30) > garantiaDeRookie(60));
}

// 5) Seleção: avaliação alta é escolhida mais cedo que avaliação baixa (em média).
{
  const media = (overall) => {
    let soma = 0; let n = 0;
    for (let s = 1; s <= 60; s++) {
      const { estado, rng } = criarJogo({ semente: s });
      estado.snapshotSelecao = { overall, fama: 0, destaques: 0 };
      const { escolha } = executarSelecao(estado, rng);
      soma += escolha ? escolha.posicao : 90; // não escolhida conta como pior que 60
      n++;
    }
    return soma / n;
  };
  assert.ok(media(75) < media(45), 'overall maior deveria ser escolhido antes');
}

// 6) Free agency: ao fim do contrato surgem ao menos 2 propostas e a jogadora escolhe uma.
{
  const { estado, rng } = criarJogo({ semente: 31, faseInicial: 'profissional' });
  estado.contrato.restante = 1;
  while (estado.semana <= estado.semanasTemporada) { gerarAgenda(estado, rng); simularSemana(estado, rng, escolherAutomatico(estado)); }
  avancarTemporada(estado, rng);
  assert.equal(estado.pendencia.tipo, 'free-agency');
  assert.ok(estado.pendencia.propostas.length >= 2);
  const proposta = estado.pendencia.propostas[0];
  escolherProposta(estado, rng, 0);
  assert.equal(estado.agencia.id, proposta.agenciaId);
  assert.equal(estado.contrato.restante, proposta.duracao);
  assert.equal(estado.pendencia, null);
}

// 7) Semana de moda traz desfiles extras; energia respeitada.
{
  const { estado, rng } = criarJogo({ semente: 99, faseInicial: 'profissional' });
  while (estado.semana < 8) { gerarAgenda(estado, rng); simularSemana(estado, rng, []); }
  const agenda = gerarAgenda(estado, rng);
  assert.ok(agenda.filter((o) => o.tipo === 'desfile').length >= 2, 'semana de moda sem desfiles extras');
  const escolhidas = escolherAutomatico(estado);
  const custo = escolhidas.reduce((s, id) => s + agenda.find((o) => o.id === id).custo, 0);
  assert.ok(custo <= 100, 'escolha automática passou da energia');
}

// 8) Vida: taxa ao subir, dinheiro insuficiente, moradia mínima e retorno decrescente.
{
  const { estado } = criarJogo({ semente: 3, faseInicial: 'profissional' });
  estado.dinheiro = 100000;
  const { taxa } = mudarVida(estado, 'transporte', 2);
  assert.ok(taxa > 0 && estado.dinheiro === 100000 - taxa);
  assert.throws(() => mudarVida(estado, 'moradia', 0), /moradia mínima/);
  assert.throws(() => mudarVida(estado, 'relacionamento', 2), /tipo de relacionamento/);
  mudarVida(estado, 'relacionamento', 2, 'mulher');
  assert.equal(estado.vida.tipoRelacionamento, 'mulher');
  estado.dinheiro = 10;
  assert.throws(() => mudarVida(estado, 'estilo', 4), /Dinheiro insuficiente/);

  const nivel = (n) => efeitosVida({ ...estado.vida, equipe: n }).chance;
  assert.ok(nivel(1) - nivel(0) > nivel(2) - nivel(1) && nivel(2) - nivel(1) > nivel(4) - nivel(3), 'retorno deveria ser decrescente');
}

// 9) Imposto progressivo e nunca negativo.
{
  let anterior = -1;
  for (const r of [0, 500, 700, 1000, 2000, 3000, 5000, 20000]) {
    const i = calcularImposto(r);
    assert.ok(i >= 0 && i >= anterior, 'imposto deveria crescer com a receita');
    anterior = i;
  }
  assert.equal(calcularImposto(700), 0);
}

// 10) No vermelho: juros, pressão e corte forçado do padrão de vida.
{
  const { estado, rng } = criarJogo({ semente: 12, faseInicial: 'profissional' });
  estado.vida.moradia = 3;
  estado.vida.equipe = 3;
  estado.dinheiro = -50000;
  const nivelAntes = estado.vida.moradia + estado.vida.equipe;
  let teveJuros = false;
  for (let i = 0; i < 8; i++) {
    gerarAgenda(estado, rng);
    const reg = simularSemana(estado, rng, []);
    if (reg.fin.juros > 0) teveJuros = true;
  }
  assert.ok(teveJuros, 'saldo negativo deveria render juros');
  assert.ok(estado.vida.moradia + estado.vida.equipe < nivelAntes, 'padrão de vida deveria cair no vermelho prolongado');
  assert.ok(estado.vida.moradia >= 1, 'moradia nunca cai abaixo do mínimo');
}

// 11) Todos os perfis rodam 20 temporadas, em todas as dificuldades, sem estourar limites.
for (const perfil of Object.keys(PERFIS)) {
  for (const dificuldade of ['facil', 'normal', 'dificil']) {
    for (let semente = 1; semente <= 5; semente++) {
      simularCarreira({ semente, perfil, dificuldade, temporadas: 20, aoFimDaTemporada: checarEstado });
    }
  }
}

// 12) Calibragem: 40 carreiras por política. Prudência deve proteger, ostentação deve arriscar.
{
  const perfis = Object.keys(PERFIS);
  const taxa = {};
  let trocas = 0;
  for (const politica of Object.keys(POLITICAS_VIDA)) {
    let vermelho = 0;
    for (let i = 0; i < 40; i++) {
      const { metricas, estado } = simularCarreira({ semente: 1000 + i, perfil: perfis[i % 4], politica, temporadas: 15 });
      if (metricas.ficouNoVermelho) vermelho++;
      trocas += estado.eventos.filter((e) => e.tipo === 'troca').length;
    }
    taxa[politica] = vermelho / 40;
  }
  console.log('Carreiras que já ficaram no vermelho:', taxa);
  assert.ok(taxa.cautelosa <= 0.1, `cautelosa no vermelho demais: ${taxa.cautelosa}`);
  assert.ok(taxa.equilibrada <= 0.3, `equilibrada no vermelho demais: ${taxa.equilibrada}`);
  assert.ok(taxa.ostentosa >= 0.5, `ostentosa deveria arriscar mais: ${taxa.ostentosa}`);
  assert.ok(taxa.cautelosa <= taxa.equilibrada && taxa.equilibrada <= taxa.ostentosa);
  assert.ok(trocas > 0, 'nenhuma troca de agência aconteceu em 120 carreiras');
}

// Resumo de uma carreira para conferência visual.
const { estado } = simularCarreira({ semente: 2025, perfil: 'versatil', temporadas: 10 });
console.table(estado.resumos.map(({ temporada, idade, fase, agencia, trabalhos, destaques, liquido, dinheiro, fama, overall }) => ({ temporada, idade, fase, agencia, trabalhos, destaques, liquido, dinheiro, fama, overall })));
console.log('Todos os testes passaram.');
