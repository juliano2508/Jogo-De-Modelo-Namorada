import assert from 'node:assert/strict';
import {
  ATRIBUTOS, ATTR_MIN, ATTR_MAX, PERFIS, FASES, CHAVES_RELACAO, EVENTOS, HALL_DA_FAMA,
  criarJogo, gerarAgenda, simularSemana, escolherAutomatico, avancarTemporada,
  executarSelecao, decidirSelecao, confirmarSelecao, garantiaDeRookie, escolherProposta, gerarPropostas,
  mudarVida, efeitosVida, calcularImposto, simularCarreira, resolverPendenciaAuto, POLITICAS_VIDA,
  ajustarRelacao, efeitosRelacoes, patrocinioSemanal, rankingDaTemporada,
  temFlag, marcarFlag, tentarEvento, resolverEvento,
  pautaAposentadoria, decidirAposentadoria, calcularPontos, classificar, verificarMarcos, resumoDeCarreira,
} from '../src/engine/index.js';
import { derivarRelacoes } from '../src/engine/relacoes.js';
import { registrarDisputa, atualizarRivais } from '../src/engine/rivais.js';

function checarEstado(estado) {
  for (const a of ATRIBUTOS) {
    assert.ok(estado.atributos[a] >= ATTR_MIN && estado.atributos[a] <= ATTR_MAX, `${a} fora da escala: ${estado.atributos[a]}`);
  }
  assert.ok(estado.overall >= ATTR_MIN && estado.overall <= ATTR_MAX, 'overall fora da escala');
  assert.ok(estado.fama >= 0 && estado.fama <= 100, 'fama fora de 0-100');
  assert.ok(estado.cansaco >= 0 && estado.cansaco <= 100, 'cansaço fora de 0-100');
  assert.ok(Number.isFinite(estado.dinheiro), 'dinheiro inválido');
  for (const c of CHAVES_RELACAO) {
    assert.ok(estado.relacoes[c] >= 0 && estado.relacoes[c] <= 100, `relação ${c} fora de 0-100`);
  }
  assert.equal(estado.rivais.length, 8, 'sempre 8 rivais');
  assert.equal(new Set(estado.rivais.map((r) => r.nome)).size, 8, 'rivais com nomes repetidos');
  for (const r of estado.rivais) assert.ok(r.overall >= 30 && r.overall <= 92 && r.intensidade >= 0 && r.intensidade <= 100);
}

// Avança uma semana no manual resolvendo eventos que apareçam no caminho.
function resolverEventos(estado, rng) {
  while (estado.pendencia?.tipo === 'evento') resolverPendenciaAuto(estado, rng);
}
function jogarSemana(estado, rng, ids = null) {
  resolverEventos(estado, rng);
  gerarAgenda(estado, rng);
  return simularSemana(estado, rng, ids ?? escolherAutomatico(estado));
}
function jogarTemporada(estado, rng) {
  while (estado.semana <= estado.semanasTemporada) jogarSemana(estado, rng);
  resolverEventos(estado, rng);
}

// Estado profissional de teste, com fama e dinheiro para satisfazer as condições de eventos.
function estadoPro(semente = 1) {
  const { estado, rng } = criarJogo({ semente, faseInicial: 'profissional' });
  estado.fama = 60;
  estado.idade = 25;
  estado.dinheiro = 50000;
  estado.relacoes.midia = 65;
  return { estado, rng };
}

// ---------- Base (Fases 1 e 2) ----------

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
  jogarTemporada(estado, rng);
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
  jogarTemporada(e, j.rng);
  avancarTemporada(e, j.rng);
  decidirSelecao(e, j.rng, 'ficar');
  assert.equal(e.fase, 'regional');
  jogarTemporada(e, j.rng);
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
      soma += escolha ? escolha.posicao : 90;
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
  jogarTemporada(estado, rng);
  avancarTemporada(estado, rng);
  if (estado.pendencia.tipo === 'aposentadoria') decidirAposentadoria(estado, rng, 'continuar');
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
  while (estado.semana < 8) jogarSemana(estado, rng, []);
  resolverEventos(estado, rng);
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
    const reg = jogarSemana(estado, rng, []);
    if (reg.fin.juros > 0) teveJuros = true;
  }
  assert.ok(teveJuros, 'saldo negativo deveria render juros');
  assert.ok(estado.vida.moradia + estado.vida.equipe < nivelAntes, 'padrão de vida deveria cair no vermelho prolongado');
  assert.ok(estado.vida.moradia >= 1, 'moradia nunca cai abaixo do mínimo');
}

// ---------- Fase 3: Relações e rivais ----------

// 11) Relações: limites, efeitos reais, patrocínio e retorno ao neutro.
{
  const { estado } = estadoPro(2);
  ajustarRelacao(estado, 'agente', 500);
  assert.equal(estado.relacoes.agente, 100);
  ajustarRelacao(estado, 'agente', -500);
  assert.equal(estado.relacoes.agente, 0);
  assert.throws(() => ajustarRelacao(estado, 'inexistente', 1), /desconhecida/);

  estado.relacoes.agente = 90;
  assert.equal(efeitosRelacoes(estado).agendaExtra, 2);
  estado.relacoes.agente = 20;
  assert.equal(efeitosRelacoes(estado).agendaExtra, -1);
  estado.relacoes.agente = 50;
  assert.equal(efeitosRelacoes(estado).agendaExtra, 0);

  estado.relacoes.estilistas = 90;
  estado.relacoes.fotografos = 10;
  const rel = efeitosRelacoes(estado);
  assert.ok(rel.chancePorTipo('desfile') > 0 && rel.chancePorTipo('ensaio') < 0, 'estilistas ajudam em desfiles, fotógrafos em ensaios');

  estado.relacoes.midia = 50;
  assert.equal(patrocinioSemanal(estado), 0, 'sem boa imagem, sem patrocínio');
  estado.relacoes.midia = 85;
  assert.ok(patrocinioSemanal(estado) > 0);
  estado.fama = 10;
  assert.equal(patrocinioSemanal(estado), 0, 'sem fama, sem patrocínio');

  estado.relacoes.direcao = 90;
  derivarRelacoes(estado);
  assert.ok(estado.relacoes.direcao < 90 && estado.relacoes.direcao > 50, 'relação deveria esfriar devagar rumo ao neutro');
}

// 12) A agenda do agente: boa relação traz mais ofertas, má relação traz menos.
{
  const { estado, rng } = estadoPro(4);
  const media = (valor) => {
    estado.relacoes.agente = valor;
    let total = 0;
    for (let i = 0; i < 200; i++) { estado.semana = 2; total += gerarAgenda(estado, rng).length; }
    return total / 200;
  };
  assert.ok(media(90) > media(50) && media(50) > media(20), 'a relação com o agente deveria mudar o tamanho da agenda');
}

// 13) Direção e mídia pesam nas propostas de free agency.
{
  // Mesma semente nos dois lados: só a relação com a direção muda. Procura uma semente em que a
  // agência atual aparece entre as propostas (ela pode ficar fora das 5 melhores).
  const garantiaDaAtual = (semente, direcao) => {
    const { estado, rng } = estadoPro(semente);
    estado.relacoes.direcao = direcao;
    const p = gerarPropostas(estado, rng).find((x) => x.renovacao);
    return p ? p.garantiaSemanal : null;
  };
  let comparou = 0;
  for (let s = 1; s <= 80; s++) {
    const alta = garantiaDaAtual(s, 90);
    const baixa = garantiaDaAtual(s, 10);
    if (alta === null || baixa === null) continue;
    assert.ok(alta > baixa, 'direção satisfeita deveria oferecer renovação melhor');
    comparou++;
  }
  assert.ok(comparou >= 1, `poucas renovações para comparar: ${comparou}`);
}

// 14) Rivais: disputas esquentam a rivalidade; ranking; aposentadoria e substituição; rivalidade esfria.
{
  const { estado, rng } = estadoPro(6);
  const rival = estado.rivais[0];
  const oferta = { rival: { id: rival.id, nome: rival.nome } };
  registrarDisputa(estado, oferta, true);
  registrarDisputa(estado, oferta, false);
  assert.equal(rival.vitorias, 1);
  assert.equal(rival.derrotas, 1);
  assert.equal(rival.intensidade, 7);

  const { posicao, total } = rankingDaTemporada(estado);
  assert.ok(posicao >= 1 && posicao <= total && total === 9);

  rival.idade = 36;
  rival.intensidade = 80;
  const nomeAntigo = rival.nome;
  atualizarRivais(estado, rng);
  assert.equal(estado.rivais.length, 8);
  assert.ok(!estado.rivais.some((r) => r.nome === nomeAntigo), 'rival aposentada deveria ser substituída');
  assert.ok(estado.eventos.some((e) => e.tipo === 'rival'), 'aposentadoria de grande rival deveria virar evento');

  const outra = estado.rivais[3];
  outra.intensidade = 50;
  atualizarRivais(estado, rng);
  const depois = estado.rivais.find((r) => r.id === outra.id);
  if (depois) assert.ok(depois.intensidade < 50 && depois.intensidade >= 40, 'rivalidade esfria aos poucos, não de uma vez');
}

// ---------- Fase 3: Eventos com memória ----------

// 15) Catálogo: ids únicos, escolhas válidas e nenhum efeito quebra os limites.
{
  assert.equal(new Set(EVENTOS.map((e) => e.id)).size, EVENTOS.length, 'ids de evento repetidos');
  for (const ev of EVENTOS) {
    assert.ok(ev.escolhas.length >= 2, `${ev.id} precisa de ao menos 2 escolhas`);
    assert.ok(ev.escolhas.some((c) => c.id === ev.padraoAuto), `${ev.id}: padrão automático inexistente`);
    for (const escolha of ev.escolhas) {
      const { estado, rng } = estadoPro(10);
      estado.cansaco = 80;
      estado.lesao = { semanasRestantes: 4 };
      estado.rivais[0].intensidade = 40;
      marcarFlag(estado, 'ensaio_ousado', 160, { fotografo: 'Fulano' });
      marcarFlag(estado, 'marca_polemica', 120, { marca: 'Zarra' });
      const ctx = ev.preparar(estado, rng);
      estado.pendencia = {
        tipo: 'evento',
        evento: { id: ev.id, titulo: ev.titulo, natureza: ev.tipo, texto: ev.texto(estado, ctx), ctx, escolhas: [], padraoAuto: ev.padraoAuto },
      };
      assert.ok(estado.pendencia.evento.texto.length > 10);
      const r = resolverEvento(estado, rng, escolha.id);
      assert.ok(r.resultado.length > 5, `${ev.id}/${escolha.id} sem texto de resultado`);
      assert.equal(estado.pendencia, null);
      checarEstado(estado);
    }
  }
  const { estado, rng } = estadoPro(11);
  estado.pendencia = { tipo: 'evento', evento: { id: 'ensaio-ousado', ctx: { fotografo: 'X' }, escolhas: [] } };
  assert.throws(() => resolverEvento(estado, rng, 'invalida'), /Escolha inválida/);
}

// 16) Memória: decidir hoje libera eventos futuros, e a lembrança expira.
{
  const { estado, rng } = estadoPro(12);
  const escandalo = EVENTOS.find((e) => e.id === 'escandalo-ensaio');
  const boicote = EVENTOS.find((e) => e.id === 'boicote-marca');
  assert.equal(escandalo.condicao(estado), false, 'sem ensaio ousado, sem escândalo');
  assert.equal(boicote.condicao(estado), false, 'sem marca em polêmica, sem boicote');

  const ensaio = EVENTOS.find((e) => e.id === 'ensaio-ousado');
  const polemica = EVENTOS.find((e) => e.id === 'marca-polemica');
  for (const [ev, escolha] of [[ensaio, 'aceitar'], [polemica, 'manter']]) {
    const ctx = ev.preparar(estado, rng);
    estado.pendencia = { tipo: 'evento', evento: { id: ev.id, ctx, escolhas: [] } };
    resolverEvento(estado, rng, escolha);
  }
  assert.ok(temFlag(estado, 'ensaio_ousado') && temFlag(estado, 'marca_polemica'));
  assert.equal(escandalo.condicao(estado), true, 'depois de aceitar o ensaio, o escândalo fica possível');
  assert.equal(boicote.condicao(estado), true, 'depois de manter a marca, o boicote fica possível');
  assert.equal(estado.memoria.decisoes.length, 2);

  estado.semanaAbsoluta += 4 * 40 + 1;
  assert.equal(temFlag(estado, 'ensaio_ousado'), false, 'a lembrança do ensaio deveria expirar em 4 temporadas');
  assert.equal(escandalo.condicao(estado), false, 'sem a lembrança, o escândalo não acontece mais');

  // Escolher o oposto não gera memória.
  const outro = estadoPro(13);
  const ctx = ensaio.preparar(outro.estado, outro.rng);
  outro.estado.pendencia = { tipo: 'evento', evento: { id: ensaio.id, ctx, escolhas: [] } };
  resolverEvento(outro.estado, outro.rng, 'recusar');
  assert.equal(temFlag(outro.estado, 'ensaio_ousado'), false);
}

// 17) Sorteio de eventos: respeita fase, pendência e cooldown; abre pendência jogável.
{
  const reg = criarJogo({ semente: 14 });
  for (let i = 0; i < 300; i++) assert.equal(tentarEvento(reg.estado, reg.rng), null, 'regional não tem eventos');

  const { estado, rng } = estadoPro(15);
  estado.pendencia = { tipo: 'selecao' };
  for (let i = 0; i < 300; i++) assert.equal(tentarEvento(estado, rng), null, 'não abre evento com outra pendência');
  estado.pendencia = null;
  estado.eventoCooldown = 5;
  for (let i = 0; i < 300; i++) assert.equal(tentarEvento(estado, rng), null, 'cooldown deveria bloquear eventos');
  estado.eventoCooldown = 0;
  let aberto = null;
  for (let i = 0; i < 300 && !aberto; i++) aberto = tentarEvento(estado, rng);
  assert.ok(aberto, 'em 300 tentativas deveria abrir algum evento');
  assert.equal(estado.pendencia.tipo, 'evento');
  assert.equal(estado.eventoCooldown, 3);
  assert.throws(() => simularSemana(estado, rng, []), /evento/);
  resolverPendenciaAuto(estado, rng);
  assert.equal(estado.pendencia, null);
}

// 18) Frequência de eventos por temporada profissional, e dificuldade pesando nos negativos.
{
  const naturezas = Object.fromEntries(EVENTOS.map((e) => [e.id, e.tipo]));
  const contar = (dificuldade) => {
    let total = 0; let negativos = 0; let temporadasPro = 0;
    for (let i = 0; i < 40; i++) {
      const { estado } = simularCarreira({ semente: 300 + i, perfil: Object.keys(PERFIS)[i % 4], dificuldade, temporadas: 30 });
      temporadasPro += estado.carreira.temporadasProfissionais;
      for (const d of estado.memoria.decisoes) {
        total++;
        if (naturezas[d.evento] === 'negativo') negativos++;
      }
    }
    return { porTemporada: total / temporadasPro, parteNegativa: negativos / total };
  };
  const facil = contar('facil');
  const dificil = contar('dificil');
  console.log('Eventos por temporada profissional (fácil / difícil):', facil.porTemporada.toFixed(1), '/', dificil.porTemporada.toFixed(1));
  console.log('Parte de eventos negativos (fácil / difícil):', facil.parteNegativa.toFixed(2), '/', dificil.parteNegativa.toFixed(2));
  assert.ok(facil.porTemporada >= 1.5 && facil.porTemporada <= 6, `eventos por temporada fora do esperado: ${facil.porTemporada}`);
  assert.ok(dificil.parteNegativa > facil.parteNegativa, 'dificuldade alta deveria trazer mais eventos negativos');
}

// 19) Contratos extras: renda semanal, menos fama na exclusividade, e fim com consequência.
{
  const { estado, rng } = estadoPro(16);
  estado.extras.push({ tipo: 'exclusividade', marca: 'Guchi', semanal: 1200, semanasRestantes: 2, famaMult: 0.8 });
  const antes = estado.relacoes.estilistas;
  const r1 = jogarSemana(estado, rng, []);
  assert.equal(r1.extras, 1200, 'a renda extra entra toda semana');
  assert.equal(estado.extras.length, 1);
  jogarSemana(estado, rng, []);
  assert.equal(estado.extras.length, 0, 'o contrato deveria acabar depois de 2 semanas');
  assert.ok(estado.relacoes.estilistas > antes - 1, 'fim da exclusividade melhora a relação com estilistas');
  assert.ok(estado.eventos.some((e) => e.tipo === 'contrato' && e.texto.includes('chegou ao fim')));
}

// ---------- Fase 3: Marcos, aposentadoria e Hall da Fama ----------

// 20) Marcos: aparecem uma vez só, quando a condição é cumprida.
{
  const { estado } = estadoPro(17);
  estado.historico.push({ fase: 'profissional', resultados: [], fin: {} });
  estado.carreira.capas = 1;
  estado.carreira.picoFama = 55;
  const novos = verificarMarcos(estado);
  assert.ok(novos.includes('profissional') && novos.includes('primeira-capa') && novos.includes('fama-50'));
  assert.ok(!novos.includes('dez-capas') && !novos.includes('fama-80'));
  assert.deepEqual(verificarMarcos(estado), [], 'marcos não repetem');
  estado.carreira.capas = 10;
  assert.deepEqual(verificarMarcos(estado), ['dez-capas']);
}

// 21) Pauta de aposentadoria: motivos, obrigatoriedade e fases.
{
  const { estado } = estadoPro(18);
  estado.idade = 27;
  assert.equal(pautaAposentadoria(estado), null, 'jovem e saudável não se aposenta');
  estado.idade = 31;
  estado.atributos.saude = 35;
  let p = pautaAposentadoria(estado);
  assert.deepEqual(p.motivos, ['saude']);
  assert.equal(p.obrigatoria, false);
  estado.atributos.saude = 70;
  estado.atributos.resistencia = 38;
  assert.deepEqual(pautaAposentadoria(estado).motivos, ['resistencia']);
  estado.atributos.resistencia = 70;
  estado.carreira.temporadasProfissionais = 20;
  assert.deepEqual(pautaAposentadoria(estado).motivos, ['longevidade']);
  estado.carreira.temporadasProfissionais = 5;
  estado.idade = 42;
  p = pautaAposentadoria(estado);
  assert.ok(p.obrigatoria && p.motivos.includes('idade'));

  const reg = criarJogo({ semente: 19 });
  reg.estado.idade = 45;
  assert.equal(pautaAposentadoria(reg.estado), null, 'circuito regional não tem aposentadoria');
}

// 22) Decisão de aposentadoria: continuar, aposentar, caminhos e carreira encerrada.
{
  const { estado, rng } = estadoPro(20);
  estado.idade = 33;
  estado.atributos.saude = 30;
  estado.contrato.restante = 1;
  jogarTemporada(estado, rng);
  avancarTemporada(estado, rng);
  assert.equal(estado.pendencia.tipo, 'aposentadoria');
  assert.ok(estado.pendencia.motivos.includes('saude'));
  const fila = estado.pendencia.depois;
  assert.equal(fila?.tipo, 'free-agency', 'a pendência que estava na fila volta se ela continuar');
  assert.throws(() => simularSemana(estado, rng, []), /pendência/);

  decidirAposentadoria(estado, rng, 'continuar');
  assert.equal(estado.pendencia.tipo, 'free-agency');
  assert.equal(estado.aposentada, false);
  assert.throws(() => decidirAposentadoria(estado, rng, 'continuar'), /Não há decisão/);

  // Aposentadoria de verdade, com caminho que exige dinheiro e fama.
  estado.pendencia = { tipo: 'aposentadoria', motivos: ['saude'], obrigatoria: false, depois: null };
  estado.dinheiro = 1000;
  assert.throws(() => decidirAposentadoria(estado, rng, 'aposentar', 'agencia'), /agência/);
  estado.fama = 20;
  assert.throws(() => decidirAposentadoria(estado, rng, 'aposentar', 'jurada'), /fama 50/);
  assert.throws(() => decidirAposentadoria(estado, rng, 'aposentar', 'inexistente'), /Caminho inválido/);
  assert.equal(estado.aposentada, false, 'tentativas inválidas não aposentam');
  estado.fama = 70;
  const legado = decidirAposentadoria(estado, rng, 'aposentar', 'jurada');
  assert.equal(estado.aposentada, true);
  assert.equal(estado.fase, 'aposentada');
  assert.equal(estado.pendencia, null);
  assert.equal(legado.caminhoPosCarreira, 'jurada');
  assert.throws(() => simularSemana(estado, rng, []), /encerrada/);
  assert.throws(() => avancarTemporada(estado, rng), /encerrada/);

  // Aposentadoria obrigatória não aceita "continuar".
  const o = estadoPro(21);
  o.estado.idade = 42;
  o.estado.pendencia = { tipo: 'aposentadoria', motivos: ['idade'], obrigatoria: true, depois: null };
  assert.throws(() => decidirAposentadoria(o.estado, o.rng, 'continuar'), /obrigatória/);
}

// 23) Hall da Fama: níveis por pontos, e pontos que crescem com conquistas.
{
  assert.equal(classificar(HALL_DA_FAMA.destaque - 1), 'Carreira discreta');
  assert.equal(classificar(HALL_DA_FAMA.destaque), 'Carreira de destaque');
  assert.equal(classificar(HALL_DA_FAMA.hall), 'Hall da Fama');
  assert.equal(classificar(HALL_DA_FAMA.lenda), 'Lenda da moda');

  const { estado } = estadoPro(22);
  const base = calcularPontos(estado);
  estado.carreira.capas = 5;
  estado.carreira.titulosRanking = 2;
  estado.carreira.picoOverall = 80;
  assert.ok(calcularPontos(estado) > base + 10, 'conquistas deveriam somar pontos');

  const resumo = resumoDeCarreira(estado);
  for (const chave of ['nome', 'pontos', 'nivel', 'hallDaFama', 'marcos', 'estatisticas', 'patrimonio', 'agencias']) {
    assert.ok(chave in resumo, `resumo sem ${chave}`);
  }
}

// ---------- Robustez e calibragem ----------

// 24) Todos os perfis e dificuldades rodam carreiras inteiras sem estourar limites, até se aposentar.
for (const perfil of Object.keys(PERFIS)) {
  for (const dificuldade of ['facil', 'normal', 'dificil']) {
    for (let semente = 1; semente <= 5; semente++) {
      const { estado } = simularCarreira({ semente, perfil, dificuldade, temporadas: 30, aoFimDaTemporada: checarEstado });
      assert.equal(estado.aposentada, true, 'toda carreira acaba em aposentadoria até a idade obrigatória');
      assert.ok(estado.idade <= 43, `aposentou tarde demais: ${estado.idade}`);
      assert.ok(estado.legado && estado.legado.pontos >= 0);
    }
  }
}

// 25) Calibragem financeira: prudência protege, ostentação arrisca (40 carreiras por política).
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

// 26) Calibragem do legado: níveis bem distribuídos e rivais que não deixam todo mundo ser número 1.
{
  const perfis = Object.keys(PERFIS);
  const niveis = {};
  let titulos0 = 0;
  const N = 80;
  for (let i = 0; i < N; i++) {
    const { estado, metricas } = simularCarreira({ semente: 7000 + i, perfil: perfis[i % 4], temporadas: 30 });
    niveis[metricas.nivel] = (niveis[metricas.nivel] ?? 0) + 1;
    if (estado.carreira.titulosRanking === 0) titulos0++;
  }
  console.log('Níveis de legado em', N, 'carreiras:', niveis, '| sem nenhum título de ranking:', titulos0);
  const parte = (n) => (niveis[n] ?? 0) / N;
  assert.ok(parte('Lenda da moda') >= 0.03 && parte('Lenda da moda') <= 0.3, 'lendas deveriam ser raras, mas existir');
  assert.ok(parte('Hall da Fama') >= 0.1 && parte('Hall da Fama') <= 0.45, 'Hall da Fama fora do esperado');
  assert.ok(parte('Carreira discreta') >= 0.03, 'deveriam existir carreiras discretas');
  assert.ok(titulos0 / N >= 0.5, 'a maioria das carreiras não deveria ser número 1 do ranking');
}

// Resumo de uma carreira completa para conferência visual.
const { estado: exemplo } = simularCarreira({ semente: 2025, perfil: 'versatil', temporadas: 30 });
console.table(exemplo.resumos.map(({ temporada, idade, fase, agencia, ranking, overall, fama, liquido, dinheiro }) => ({ temporada, idade, fase, agencia, ranking, overall, fama, liquido, dinheiro })));
console.log('Legado:', exemplo.legado.nivel, `(${exemplo.legado.pontos} pontos) | marcos: ${exemplo.legado.marcos.length}`);
console.log('Todos os testes passaram.');
