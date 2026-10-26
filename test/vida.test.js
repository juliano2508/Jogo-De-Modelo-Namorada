import assert from 'node:assert/strict';
import {
  ATRIBUTOS, ATTR_MIN, ATTR_MAX, PERFIS, STATS_PESSOAIS, EVENTOS_VIDA, ATIVIDADES,
  criarJogo, simularSemana, gerarAgenda, avancarTemporada, avancarAnoDeVida, iniciarCarreiraDeModelo,
  perfilEmergente, fazerAtividade, atividadesDisponiveis, tempoLivreDoAno, resolverPendenciaAuto,
  resolverEvento, simularCarreira, aplicarFx, marcarFlag, temFlag, parentesco, irmaos,
  EVENTOS, EVENTOS_ADULTOS, mudarHabito, buscarAjuda, aplicarHabitosAnuais, custoHabitosSemanal, custoFilhosSemanal,
  energiaDosFilhos, efeitosHabitos,
} from '../src/engine/index.js';
import { perderParente } from '../src/engine/pessoa-adulta.js';
import { tentarEventoAdulto } from '../src/engine/eventos.js';
import { viverAteOsDezoito } from '../src/engine/auto.js';
import { prepararEventosDoAno } from '../src/engine/eventos-vida.js';

function checarPessoa(e) {
  for (const s of STATS_PESSOAIS) assert.ok(e.pessoa.stats[s] >= 0 && e.pessoa.stats[s] <= 100, `${s} fora de 0-100: ${e.pessoa.stats[s]}`);
  for (const f of e.pessoa.familia) assert.ok(f.relacao >= 0 && f.relacao <= 100 && f.idade >= 0, `parente fora do limite: ${f.nome}`);
  for (const a of e.pessoa.amigos) assert.ok(a.relacao >= 0 && a.relacao <= 100, 'amigo fora do limite');
  for (const a of ATRIBUTOS) assert.ok(e.atributos[a] >= ATTR_MIN && e.atributos[a] <= ATTR_MAX, `${a} fora da escala`);
}

// Estado de adolescente com família, amigos e flags para testar todos os eventos.
function adolescente(semente = 1) {
  const { estado, rng } = criarJogo({ semente, inicio: 'nascimento' });
  while (estado.pendencia) resolverPendenciaAuto(estado, rng);
  estado.idade = 15;
  estado.pessoa.fila = [];
  for (let i = 0; i < 3; i++) estado.pessoa.amigos.push({ id: `amigo-${i}`, nome: `Amiga ${i} Teste`, idade: 15, relacao: 50, origem: 'escola', desde: 10 });
  if (!parentesco(estado, 'avo')) estado.pessoa.familia.push({ id: 'avo-t', papel: 'avo', nome: 'Vó Teste', idade: 70, vivo: true, ausente: false, profissao: null, relacao: 70 });
  if (irmaos(estado).length === 0) estado.pessoa.familia.push({ id: 'irmao-t', papel: 'irmao', nome: 'Irmão Teste', idade: 12, vivo: true, ausente: false, profissao: null, relacao: 60 });
  return { estado, rng };
}

// Estado de adulta com parceiro, filho, família, amigos, dinheiro e fama para exercitar os eventos da vida adulta.
function adulta(semente = 1, ev = null) {
  const { estado, rng } = criarJogo({ semente, inicio: 'aos18' });
  estado.idade = 26;
  estado.dinheiro = 20000;
  estado.fama = 60;
  const p = estado.pessoa;
  p.fila = [];
  p.parceiro = { id: 'par-t', nome: 'Caio Teste', sexo: 'm', idade: 28, profissao: 'fotógrafo', relacao: ev?.id === 'casamento' || ev?.id === 'pedido-de-casamento' ? 80 : 50, status: ev?.id === 'casamento' ? 'noivado' : 'namoro', desdeIdade: 24, origem: 'encontro' };
  p.filhos.push({ id: 'filho-t', nome: 'Davi', sexo: 'm', idade: 4, relacao: 70 });
  for (let i = 0; i < 2; i++) p.amigos.push({ id: `amigo-${i}`, nome: `Amiga ${i} Teste`, idade: 26, relacao: 50, origem: 'escola', desde: 10 });
  const pai = p.familia.find((f) => f.papel === 'pai');
  if (pai) { pai.ausente = true; pai.vivo = true; }
  const mae = p.familia.find((f) => f.papel === 'mae');
  if (mae) mae.vivo = true;
  if (ev?.id === 'luto') p.ultimoLuto = { id: mae.id, papel: 'mae' };
  return { estado, rng };
}

// 1) A história no nascimento: começa aos 0 anos, em modo de vida, com família e o primeiro evento aberto.
{
  const { estado } = criarJogo({ semente: 5, inicio: 'nascimento', nome: 'Manu' });
  assert.equal(estado.idade, 0);
  assert.equal(estado.modo, 'vida');
  assert.equal(estado.dinheiro, 0);
  assert.ok(parentesco(estado, 'mae') && parentesco(estado, 'pai'));
  assert.equal(estado.pendencia.tipo, 'evento');
  assert.equal(estado.pendencia.evento.id, 'nascimento');
  assert.ok(estado.pendencia.evento.texto.includes(estado.origem));
  assert.ok(estado.diario.length >= 1);
  // O começo aos 18 continua igual: sem modo de vida.
  const classico = criarJogo({ semente: 5 });
  assert.equal(classico.estado.modo, 'carreira');
  assert.equal(classico.estado.idade, 18);
  assert.equal(classico.estado.pendencia, null);
  assert.throws(() => criarJogo({ inicio: 'nascimento', faseInicial: 'profissional' }), /fase regional/);
}

// 2) Antes da carreira nada de agenda, semana ou temporada.
{
  const { estado, rng } = criarJogo({ semente: 6, inicio: 'nascimento' });
  while (estado.pendencia) resolverPendenciaAuto(estado, rng);
  assert.throws(() => gerarAgenda(estado, rng), /ainda não começou/);
  assert.throws(() => simularSemana(estado, rng, []), /ainda não começou/);
  assert.throws(() => avancarTemporada(estado, rng), /ainda não começou/);
  assert.throws(() => iniciarCarreiraDeModelo(estado, rng), /depois dos 18/);
  estado.pendencia = { tipo: 'evento', evento: { id: 'x', escolhas: [] } };
  assert.throws(() => avancarAnoDeVida(estado, rng), /Resolva a pendência/);
  assert.throws(() => fazerAtividade(estado, rng, 'estudar'), /Resolva a pendência/);
}

// 3) Mesma semente, mesma vida.
{
  const vida = () => { const j = criarJogo({ semente: 77, inicio: 'nascimento' }); viverAteOsDezoito(j.estado, j.rng); return j.estado; };
  assert.deepEqual(vida(), vida(), 'a mesma semente deveria gerar a mesma vida');
}

// 4) 200 vidas inteiras até os 18: nada quebra, tudo dentro dos limites e a carreira começa.
{
  const perfis = {};
  const classes = {};
  const flagsTotais = {};
  for (let semente = 1; semente <= 200; semente++) {
    const { estado, rng } = criarJogo({ semente, inicio: 'nascimento', dificuldade: ['facil', 'normal', 'dificil'][semente % 3] });
    viverAteOsDezoito(estado, rng);
    checarPessoa(estado);
    assert.equal(estado.idade, 18);
    assert.equal(estado.modo, 'carreira');
    assert.ok(PERFIS[estado.perfil], 'perfil emergente inválido');
    assert.equal(estado.pendencia, null);
    assert.ok(estado.dinheiro > 0, 'deveria começar a carreira com algum dinheiro');
    assert.ok(estado.diario.length >= 17, 'o diário deveria ter pelo menos uma entrada por ano');
    perfis[estado.perfil] = (perfis[estado.perfil] ?? 0) + 1;
    classes[estado.pessoa.classe] = (classes[estado.pessoa.classe] ?? 0) + 1;
    for (const k of Object.keys(estado.memoria.flags)) flagsTotais[k] = (flagsTotais[k] ?? 0) + 1;
  }
  console.log('Perfis nascidos da vida (200 vidas, escolhas aleatórias):', perfis);
  console.log('Classes:', classes);
  assert.ok(Object.keys(perfis).length >= 3, 'a vida deveria gerar perfis variados');
  assert.ok(Object.keys(classes).length === 3, 'deveria haver as três classes');
  assert.ok((flagsTotais.olheiro_contato ?? 0) >= 20, 'o olheiro deveria aparecer em muitas vidas');
  console.log('Marcas deixadas (de 200 vidas):', flagsTotais);
}

// 5) Todas as escolhas de todos os eventos da vida funcionam e respeitam os limites.
{
  assert.equal(new Set(EVENTOS_VIDA.map((e) => e.id)).size, EVENTOS_VIDA.length, 'ids de evento repetidos');
  for (const ev of EVENTOS_VIDA) {
    assert.ok(ev.escolhas.length >= 1);
    assert.ok(ev.escolhas.some((c) => c.id === ev.padraoAuto), `${ev.id}: padrão automático inexistente`);
    assert.ok(ev.idadeExata !== undefined || (ev.idadeMin <= ev.idadeMax), `${ev.id}: faixa de idade inválida`);
    for (const escolha of ev.escolhas) {
      const { estado, rng } = ev.idadeMin >= 18 ? adulta(3, ev) : adolescente(3);
      if (ev.idadeMin < 18) estado.idade = ev.idadeExata ?? ev.idadeMin;
      marcarFlag(estado, 'olheiro_contato', null);
      marcarFlag(estado, 'avo_doente', null);
      const ctx = ev.preparar ? ev.preparar(estado, rng) : {};
      estado.pendencia = { tipo: 'evento', evento: { id: ev.id, titulo: ev.titulo, vida: true, texto: ev.texto(estado, ctx), ctx, escolhas: [], padraoAuto: ev.padraoAuto } };
      assert.ok(estado.pendencia.evento.texto.length > 10, `${ev.id} sem texto`);
      const r = resolverEvento(estado, rng, escolha.id);
      assert.ok(r.resultado.length > 5, `${ev.id}/${escolha.id} sem resultado`);
      checarPessoa(estado);
    }
  }
  console.log(`ok: ${EVENTOS_VIDA.length} eventos de vida, todas as escolhas`);
}

// 6) Atividades: faixa de idade, tempo livre e alvos.
{
  const { estado, rng } = adolescente(8);
  estado.pessoa.tempoLivre = 2;
  const antes = estado.pessoa.stats.estudos;
  fazerAtividade(estado, rng, 'estudar');
  assert.ok(estado.pessoa.stats.estudos > antes);
  assert.equal(estado.pessoa.tempoLivre, 1);
  const mae = parentesco(estado, 'mae');
  const rel = mae.relacao;
  mae.relacao = 40;
  fazerAtividade(estado, rng, 'familia', mae.id);
  assert.ok(mae.relacao > 40);
  assert.throws(() => fazerAtividade(estado, rng, 'ler'), /tempo livre/);
  estado.pessoa.tempoLivre = 3;
  assert.throws(() => fazerAtividade(estado, rng, 'inexistente'), /inválida/);
  assert.throws(() => fazerAtividade(estado, rng, 'familia', 'ninguem'), /parente/);
  assert.throws(() => fazerAtividade(estado, rng, 'brincar'), /nesta idade/, 'brincar não existe aos 15');
  const idades = (id) => ATIVIDADES.find((a) => a.id === id);
  assert.ok(idades('trabalhinho').idadeMin >= 14, 'trabalho só a partir dos 14');
  estado.idade = 4;
  assert.ok(atividadesDisponiveis(estado).every((a) => a.idadeMin <= 4 && a.idadeMax >= 4));
  assert.ok(!atividadesDisponiveis(estado).some((a) => a.id === 'redes' || a.id === 'trabalhinho'), 'criança pequena não faz bico nem redes');
  assert.ok(tempoLivreDoAno(5) === 3 && tempoLivreDoAno(15) === 4);
  // Retorno decrescente: o mesmo estudo rende menos para quem já estuda muito.
  const rendimento = (valor) => { const j = adolescente(9); j.estado.pessoa.stats.estudos = valor; j.estado.pessoa.tempoLivre = 1; fazerAtividade(j.estado, j.rng, 'estudar'); return j.estado.pessoa.stats.estudos - valor; };
  assert.ok(rendimento(30) > rendimento(90), 'estudar deveria render menos quando o valor já é alto');
  // Sem amigos, "sair com um amigo" faz uma amizade nova.
  const sem = adolescente(10);
  sem.estado.pessoa.amigos = [];
  sem.estado.pessoa.tempoLivre = 1;
  fazerAtividade(sem.estado, sem.rng, 'amigos', null);
  assert.equal(sem.estado.pessoa.amigos.length, 1);
}

// 7) Perfil emergente: nasce das afinidades acumuladas.
{
  assert.equal(perfilEmergente({ passarela: 12, editorial: 3, comercial: 2, versatil: 0 }), 'passarela');
  assert.equal(perfilEmergente({ passarela: 2, editorial: 14, comercial: 3, versatil: 1 }), 'editorial');
  assert.equal(perfilEmergente({ passarela: 1, editorial: 2, comercial: 11, versatil: 0 }), 'comercial');
  assert.equal(perfilEmergente({ passarela: 0, editorial: 1, comercial: 1, versatil: 1 }), 'versatil', 'pouca afinidade vira versátil');
  assert.equal(perfilEmergente({ passarela: 10, editorial: 9, comercial: 1, versatil: 0 }), 'versatil', 'empate no topo vira versátil');
}

// 8) A vida vivida muda a carreira: estudos e disciplina altos elevam o profissionalismo e a resistência.
{
  const comeco = (stats) => {
    const j = criarJogo({ semente: 14, inicio: 'nascimento' });
    while (j.estado.pendencia) resolverPendenciaAuto(j.estado, j.rng);
    j.estado.idade = 18; j.estado.pessoa.aguardandoCarreira = true; j.estado.pessoa.fila = [];
    Object.assign(j.estado.pessoa.stats, stats);
    j.estado.pessoa.afinidades = { passarela: 0, editorial: 0, comercial: 0, versatil: 0 };
    const antes = { ...j.estado.atributos };
    iniciarCarreiraDeModelo(j.estado, j.rng);
    return { antes, depois: j.estado.atributos };
  };
  const forte = comeco({ estudos: 95, disciplina: 90, saude: 90, social: 90, criatividade: 90, felicidade: 80 });
  const fraca = comeco({ estudos: 10, disciplina: 10, saude: 10, social: 10, criatividade: 10, felicidade: 20 });
  for (const a of ['profissionalismo', 'resistencia', 'carisma', 'expressao', 'saude']) {
    assert.ok(forte.depois[a] - forte.antes[a] > fraca.depois[a] - fraca.antes[a], `${a}: a vida vivida deveria pesar`);
  }
}

// 9) Memória da juventude vira consequência: cair em golpe esfria a relação com o agente, pesquisar esquenta.
{
  const rel = (flag) => {
    const j = criarJogo({ semente: 20, inicio: 'nascimento' });
    while (j.estado.pendencia) resolverPendenciaAuto(j.estado, j.rng);
    j.estado.idade = 18; j.estado.pessoa.aguardandoCarreira = true; j.estado.pessoa.fila = [];
    if (flag) marcarFlag(j.estado, flag, null);
    iniciarCarreiraDeModelo(j.estado, j.rng);
    return j.estado.relacoes.agente;
  };
  assert.ok(rel('pesquisou_agencia') > rel(null), 'pesquisar a agência ajuda');
  assert.ok(rel('caiu_em_golpe') < rel(null), 'cair em golpe atrapalha');
  assert.ok(rel('indicada_agencia_seria') > rel('pesquisou_agencia'));
}

// 10) O olheiro libera a taxa abusiva; sem olheiro, sem golpe.
{
  const { estado, rng } = adolescente(30);
  const golpe = EVENTOS_VIDA.find((e) => e.id === 'agencia-cobra-taxa');
  assert.equal(golpe.condicao(estado), false, 'sem contato com o olheiro, sem golpe');
  const olheiro = EVENTOS_VIDA.find((e) => e.id === 'olheiro');
  estado.pendencia = { tipo: 'evento', evento: { id: 'olheiro', ctx: {}, escolhas: [] } };
  resolverEvento(estado, rng, 'contato');
  assert.equal(golpe.condicao(estado), true, 'depois do contato, o golpe fica possível');
  assert.equal(olheiro.condicao(estado), false, 'o olheiro não volta para quem já deu contato');
  const volta = EVENTOS_VIDA.find((e) => e.id === 'olheiro-volta');
  const { estado: outro, rng: r2 } = adolescente(31);
  outro.pendencia = { tipo: 'evento', evento: { id: 'olheiro', ctx: {}, escolhas: [] } };
  resolverEvento(outro, r2, 'recusar');
  assert.equal(volta.condicao(outro), true, 'quem recusou ganha uma segunda chance');
}

// 11) Dificuldade: vidas difíceis trazem mais eventos negativos.
{
  const negativos = (dificuldade) => {
    let total = 0; let neg = 0;
    for (let s = 1; s <= 60; s++) {
      const j = criarJogo({ semente: 400 + s, inicio: 'nascimento', dificuldade });
      while (j.estado.pendencia) resolverPendenciaAuto(j.estado, j.rng);
      for (let idade = 1; idade < 18; idade++) {
        j.estado.pessoa.eventosVistos = [];
        j.estado.idade = idade;
        prepararEventosDoAno(j.estado, j.rng);
        for (const id of [j.estado.pendencia?.evento?.id, ...j.estado.pessoa.fila].filter(Boolean)) {
          total++;
          if (EVENTOS_VIDA.find((e) => e.id === id).tipo === 'negativo') neg++;
        }
        j.estado.pendencia = null; j.estado.pessoa.fila = [];
      }
    }
    return neg / total;
  };
  const f = negativos('facil'); const d = negativos('dificil');
  console.log('Parte de eventos negativos na vida (fácil / difícil):', f.toFixed(2), '/', d.toFixed(2));
  assert.ok(d > f, 'dificuldade alta deveria trazer mais eventos negativos');
}

// 12) A carreira que nasce da vida continua equilibrada (mesma faixa de legado do começo aos 18).
{
  const niveis = {}; const pontos = []; let vermelho = 0;
  const N = 60;
  for (let i = 0; i < N; i++) {
    const { estado, metricas } = simularCarreira({ semente: 9000 + i, inicio: 'nascimento', temporadas: 30 });
    assert.equal(estado.aposentada, true);
    niveis[estado.legado.nivel] = (niveis[estado.legado.nivel] ?? 0) + 1;
    pontos.push(estado.legado.pontos);
    if (metricas.ficouNoVermelho) vermelho++;
  }
  pontos.sort((a, b) => a - b);
  console.log('Carreiras vindas da infância:', niveis, '| mediana de pontos', pontos[N / 2], '| vermelho', `${Math.round((vermelho / N) * 100)}%`);
  const alto = ((niveis['Hall da Fama'] ?? 0) + (niveis['Lenda da moda'] ?? 0)) / N;
  assert.ok(alto >= 0.1 && alto <= 0.7, `Hall da Fama + Lenda fora do esperado: ${alto}`);
  assert.ok(pontos[N / 2] >= 90 && pontos[N / 2] <= 260, `mediana de pontos fora do esperado: ${pontos[N / 2]}`);
  assert.ok(vermelho / N <= 0.35, `muitas carreiras no vermelho: ${vermelho / N}`);
}

// 13) Hábitos: níveis, custos, dependência e tratamento.
{
  const { estado, rng } = adulta(21);
  assert.throws(() => mudarHabito(estado, 'bebida', 5), /Nível inválido/);
  assert.throws(() => mudarHabito(estado, 'xx', 1), /inválido/);
  const custo0 = custoHabitosSemanal(estado);
  mudarHabito(estado, 'exercicio', 3);
  mudarHabito(estado, 'autocuidado', 2);
  assert.ok(custoHabitosSemanal(estado) > custo0, 'hábitos melhores custam mais');
  assert.ok(custoFilhosSemanal(estado) > 0, 'filho pequeno custa dinheiro');
  assert.ok(energiaDosFilhos(estado) >= 4, 'filho pequeno cansa');
  const antes = efeitosHabitos(estado);
  mudarHabito(estado, 'sono', 0);
  assert.ok(efeitosHabitos(estado).recuperacao < antes.recuperacao, 'dormir mal piora a recuperação');

  mudarHabito(estado, 'bebida', 2);
  mudarHabito(estado, 'cigarro', 2);
  for (let i = 0; i < 6; i++) aplicarHabitosAnuais(estado, rng);
  assert.ok(estado.pessoa.dependencia.bebida >= 60 && estado.pessoa.dependencia.cigarro >= 60, 'uso pesado cria dependência');
  assert.throws(() => mudarHabito(estado, 'bebida', 0), /ajuda profissional/);
  estado.dinheiro = 100;
  assert.throws(() => buscarAjuda(estado, 'bebida'), /insuficiente/);
  estado.dinheiro = 50000;
  buscarAjuda(estado, 'bebida');
  assert.equal(estado.pessoa.habitos.bebida, 0);
  assert.ok(estado.pessoa.dependencia.bebida < 20);
  assert.ok(estado.lesao.licenca && estado.lesao.semanasRestantes === 6, 'tratamento afasta por 6 semanas');
  checarPessoa(estado);
  // Infância não tem hábitos de substâncias.
  const nasc = criarJogo({ semente: 22, inicio: 'nascimento' }).estado;
  assert.throws(() => mudarHabito(nasc, 'bebida', 1), /18 anos/);
}

// 14) Vida adulta dentro da carreira: eventos, parceiro, gravidez com licença, luto e mesma semente.
{
  const resumo = (semente) => {
    const { estado } = simularCarreira({ semente, perfil: 'versatil', temporadas: 12 });
    return JSON.stringify({ d: estado.diario.length, dec: estado.memoria.decisoes.length, p: estado.pessoa.parceiro?.nome ?? null, f: estado.pessoa.filhos.length, din: estado.dinheiro });
  };
  assert.equal(resumo(77), resumo(77), 'mesma semente, mesma vida adulta');

  let comParceiro = 0; let comFilhos = 0; let luto = 0; let eventosAdultos = 0;
  const idsAdultos = new Set(EVENTOS_ADULTOS.map((e) => e.id));
  const N = 40;
  for (let i = 0; i < N; i++) {
    const { estado } = simularCarreira({ semente: 900 + i, perfil: Object.keys(PERFIS)[i % 4], temporadas: 14 });
    checarPessoa(estado);
    if (estado.pessoa.parceiro || estado.pessoa.ex.length) comParceiro++;
    if (estado.pessoa.filhos.length) comFilhos++;
    if (estado.pessoa.familia.some((f) => !f.vivo)) luto++;
    eventosAdultos += estado.memoria.decisoes.filter((d) => idsAdultos.has(d.evento)).length;
    for (const f of estado.pessoa.filhos) assert.ok(f.idade >= 0);
  }
  console.log(`vida adulta em ${N} carreiras: ${comParceiro} tiveram romance, ${comFilhos} filhos, ${luto} perdas na família, ${(eventosAdultos / N).toFixed(1)} eventos adultos por carreira`);
  assert.ok(comParceiro >= N * 0.3, 'romances deveriam ser comuns');
  assert.ok(eventosAdultos / N >= 4, 'a vida adulta deveria ter eventos');

  // Gravidez: licença sem trabalho, sem evento de recuperação de lesão, e depois volta.
  const g = EVENTOS_ADULTOS.find((e) => e.id === 'gravidez');
  const { estado, rng } = adulta(31, g);
  estado.pessoa.parceiro.relacao = 80;
  estado.lesao = null;
  estado.pendencia = { tipo: 'evento', evento: { id: 'gravidez', titulo: g.titulo, vida: true, texto: '', ctx: {}, escolhas: [], padraoAuto: 'licenca' } };
  const filhos0 = estado.pessoa.filhos.length;
  resolverEvento(estado, rng, 'licenca');
  assert.equal(estado.pessoa.filhos.length, filhos0 + 1);
  assert.ok(estado.lesao.licenca);
  const rec = EVENTOS.find((e) => e.id === 'recuperacao-lesao');
  assert.equal(rec.condicao(estado), false, 'licença não é lesão');
  gerarAgenda(estado, rng);
  const sem = simularSemana(estado, rng, estado.agendaAtual.slice(0, 2).map((o) => o.id));
  assert.equal(sem.resultados.length, 0, 'em licença não há trabalho');
  assert.equal(estado.lesao.semanasRestantes, 9);

  // Luto: o parente morre, a fila abre o evento e o diário registra.
  const l = adulta(32);
  const mae = l.estado.pessoa.familia.find((f) => f.papel === 'mae');
  perderParente(l.estado, mae);
  assert.equal(mae.vivo, false);
  const aberto = tentarEventoAdulto(l.estado, l.rng);
  assert.equal(aberto?.id, 'luto');
}

console.log('Testes da vida pessoal: todos passaram.');
