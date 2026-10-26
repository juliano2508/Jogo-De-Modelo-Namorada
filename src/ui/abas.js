// Abas do painel de jogo: Semana, Perfil, Vida, Relações, Carreira e Notícias.

import {
  ATRIBUTOS, ROTULOS, PERFIS, FASES, CATEGORIAS, ROTULOS_RELACAO, MARCOS, HALL_DA_FAMA,
  calcularChance, custoReal, capacidadeDeEnergia, semanaDeModa, efeitosVida, efeitosRelacoes,
  rankingDaTemporada, famaDaRival, calcularPontos, classificar, patrocinioSemanal, TIPOS,
} from '../engine/index.js';
import { CATEGORIAS_VIDA, criarVidaInicial, inflacao, custoSemanalVida, custoBasico } from '../engine/vida.js';
import { ctx } from './ctx.js';
import {
  h, dinheiro, dinheiroCurto, pct, sinal, barra, FASE_NOME, TIER_NOME, TIPO_EVENTO_ROTULO,
} from './util.js';
import {
  prepararAgenda, alternarOferta, sugerirEscolha, simularEstaSemana, pilotoAutomatico, encerrarTemporada, mudarPadraoDeVida,
} from './acoes.js';

const QUALIDADE = { destaque: ['Destaque ✦', 'q-destaque'], normal: ['Fechou', 'q-normal'], falha: ['Não deu', 'q-falha'] };

// ---------------- Semana ----------------

function cartaoOferta(e, o) {
  const marcada = ctx.ui.selecao.has(o.id);
  const chance = calcularChance(e, o);
  const emLesao = Boolean(e.lesao);
  return h('button', {
    type: 'button', class: `oferta ${marcada ? 'marcada' : ''} ${o.semanaDeModa ? 'moda' : ''}`, disabled: emLesao,
    'aria-pressed': marcada, onClick: () => alternarOferta(o.id),
  },
    h('div', { class: 'oferta-topo' },
      h('span', { class: 'tipo' }, o.tipoNome),
      o.rival && h('span', { class: 'selo rival' }, `Disputa com ${o.rival.nome}`),
      h('span', { class: 'marca-check' }, marcada ? '✓' : '')),
    h('strong', { class: 'cliente' }, o.cliente),
    h('div', { class: 'oferta-dados' },
      h('span', null, h('small', null, 'Cachê'), dinheiro(o.cache)),
      h('span', null, h('small', null, 'Energia'), String(custoReal(e, o))),
      h('span', null, h('small', null, 'Prestígio'), String(o.prestigio)),
      h('span', { class: chance >= 0.65 ? 'bom' : chance < 0.4 ? 'ruim' : '' }, h('small', null, 'Chance'), pct(chance))));
}

function painelResultado(reg) {
  if (!reg) return null;
  const f = reg.fin;
  return h('section', { class: 'cartao resultado' },
    h('h3', null, `Semana ${reg.semana}`),
    reg.emLesao && h('p', { class: 'aviso' }, 'Você passou a semana em recuperação, sem trabalhar.'),
    reg.novaLesao && h('p', { class: 'aviso ruim' }, 'Você se lesionou e ficará fora por algumas semanas.'),
    reg.resultados.length === 0 && !reg.emLesao && h('p', { class: 'sub' }, 'Semana de descanso: nenhum trabalho disputado.'),
    h('ul', { class: 'lista-resultados' }, reg.resultados.map((r) => {
      const [rot, cls] = QUALIDADE[r.qualidade];
      return h('li', null,
        h('span', { class: `selo ${cls}` }, rot),
        h('span', { class: 'r-nome' }, `${r.tipoNome} · ${r.cliente}`),
        h('span', { class: 'r-valor' }, r.cacheRecebido ? dinheiro(r.cacheRecebido) : '—'),
        r.rival && h('span', { class: 'r-rival' }, r.qualidade === 'falha' ? `${r.rival.nome} levou` : `Superou ${r.rival.nome}`));
    })),
    (reg.extras > 0 || reg.patrocinio > 0) && h('p', { class: 'sub' },
      [reg.extras > 0 && `Contratos extras: ${dinheiro(reg.extras)}`, reg.patrocinio > 0 && `Patrocínios: ${dinheiro(reg.patrocinio)}`].filter(Boolean).join(' · ')),
    reg.troca && h('p', { class: 'aviso' }, `${reg.troca.de} trocou você para a ${reg.troca.para}.`),
    h('details', { class: 'contas' },
      h('summary', null, `Contas da semana: ${f.liquido < 0 ? 'prejuízo' : 'lucro'} de ${dinheiro(Math.abs(f.liquido))}`),
      h('dl', null,
        linhaConta('Cachês', f.cachesBrutos), linhaConta('Garantia da agência', f.garantia),
        linhaConta('Comissão da agência', -f.comissao), linhaConta('Agente', -f.agente), linhaConta('Imposto', -f.imposto),
        linhaConta('Ajuda à família', -f.familia), linhaConta('Custo básico', -f.basico), linhaConta('Padrão de vida', -f.vida),
        f.juros > 0 && linhaConta('Juros do vermelho', -f.juros), linhaConta('Resultado', f.liquido, true))),
    f.rebaixou && h('p', { class: 'aviso ruim' }, `Com tanto tempo no vermelho, você teve que cortar gastos: ${CATEGORIAS_VIDA[f.rebaixou].nome}.`));
}

function linhaConta(rotulo, valor, destaque = false) {
  return [h('dt', { class: destaque ? 'forte' : '' }, rotulo), h('dd', { class: `${valor < 0 ? 'neg' : ''} ${destaque ? 'forte' : ''}` }, dinheiro(valor))];
}

// Há folga para subir algum nível sem apertar o caixa (12 semanas de gastos de reserva, depois da taxa)?
function podeInvestirEmVida(e) {
  if (e.fase === 'regional' || e.dinheiro <= 0) return false;
  const gasto = Math.max(1, custoSemanalVida(e) + custoBasico(e));
  const infl = inflacao(e);
  return CATEGORIAS.some((cat) => {
    const atual = e.vida[cat];
    const prox = CATEGORIAS_VIDA[cat].niveis[atual + 1];
    return prox && e.dinheiro - 2 * prox.custo * infl >= gasto * 12 + prox.custo * infl * 10;
  });
}

export function abaSemana() {
  const e = ctx.jogo.estado;
  prepararAgenda();
  const raiz = h('div', { class: 'aba semana' });

  if (e.semana > e.semanasTemporada) {
    raiz.append(h('section', { class: 'cartao destaque-final' },
      h('h2', null, 'Temporada encerrada'),
      h('p', null, `Foram ${e.semanasTemporada} semanas de trabalho. Hora de ver o balanço do ano, o ranking e o que vem pela frente.`),
      h('button', { class: 'btn grande', onClick: encerrarTemporada }, 'Encerrar temporada')));
    if (ctx.ui.ultimo) raiz.append(painelResultado(ctx.ui.ultimo));
    return raiz;
  }

  const moda = semanaDeModa(e);
  const cap = capacidadeDeEnergia(e);
  const gasto = [...ctx.ui.selecao].reduce((s, id) => {
    const o = e.agendaAtual.find((x) => x.id === id);
    return s + (o ? custoReal(e, o) : 0);
  }, 0);

  if (moda) raiz.append(h('div', { class: 'faixa moda' }, h('strong', null, moda.nome), ' — desfiles extras na agenda, com mais prestígio e mais fama em jogo.'));
  if (e.lesao?.licenca) raiz.append(h('div', { class: 'faixa' }, e.lesao.motivo === 'tratamento'
    ? `Em tratamento: ${e.lesao.semanasRestantes} semana(s) afastada. Cuidar de si também é carreira.`
    : `Licença: ${e.lesao.semanasRestantes} semana(s) em família. A agenda espera por você.`));
  else if (e.lesao) raiz.append(h('div', { class: 'faixa ruim' }, `Lesão: ${e.lesao.semanasRestantes} semana(s) de recuperação. Não há como trabalhar; descanse e siga em frente.`));
  if (e.dinheiro < 0) raiz.append(h('div', { class: 'faixa ruim' }, 'Você está no vermelho: juros, pressão e, se durar, corte forçado do padrão de vida. Veja a aba Vida.'));
  if (ctx.ui.piloto) {
    const p = ctx.ui.piloto;
    raiz.append(h('div', { class: 'faixa' }, `Piloto automático: ${p.semanas} semana(s), ${p.trabalhos} trabalhos (${p.destaques} destaques), resultado de ${dinheiro(p.liquido)}.`));
  }

  if (podeInvestirEmVida(e) && ctx.ui.dicaVida !== e.temporada) {
    raiz.append(h('div', { class: 'faixa dica-vida' },
      h('span', null, h('strong', null, 'Seu caixa está folgado. '), 'Melhorar o padrão de vida (moradia, equipe, estilo...) aumenta suas chances, sua fama e a recuperação do cansaço.'),
      h('span', { class: 'faixa-acoes' },
        h('button', { class: 'btn pequeno', onClick: () => { ctx.ui.dicaVida = e.temporada; ctx.ui.aba = 'vida'; ctx.render(); } }, 'Ver aba Vida'),
        h('button', { class: 'btn fantasma pequeno', onClick: () => { ctx.ui.dicaVida = e.temporada; ctx.render(); } }, 'Agora não'))));
  }

  raiz.append(h('section', { class: 'cartao' },
    h('div', { class: 'cartao-cab' },
      h('h2', null, `Agenda da semana ${e.semana}`),
      h('span', { class: 'sub' }, `Energia ${gasto}/${cap}`)),
    barra(gasto, cap, { classe: gasto > cap * 0.85 ? 'alerta' : '', rotulo: 'Energia usada' }),
    h('p', { class: 'dica' }, e.cansaco >= 60 ? 'Você está cansada: isso derruba suas chances. Considere pegar menos trabalhos.' : 'Escolha os trabalhos que quer disputar. Quem sobra energia descansa e se recupera.'),
    h('div', { class: 'ofertas' }, e.agendaAtual.map((o) => cartaoOferta(e, o))),
    h('div', { class: 'acoes' },
      h('button', { class: 'btn fantasma', onClick: sugerirEscolha, disabled: Boolean(e.lesao) }, 'Sugestão automática'),
      h('button', { class: 'btn fantasma', onClick: pilotoAutomatico }, 'Piloto automático da temporada'),
      h('button', { class: 'btn grande', onClick: simularEstaSemana },
        e.lesao ? 'Descansar a semana' : ctx.ui.selecao.size ? `Simular semana (${ctx.ui.selecao.size})` : 'Descansar a semana'))));

  if (ctx.ui.ultimo) raiz.append(painelResultado(ctx.ui.ultimo));
  return raiz;
}

// ---------------- Perfil ----------------

export function abaPerfil() {
  const e = ctx.jogo.estado;
  const c = e.contrato;
  return h('div', { class: 'aba perfil' },
    h('section', { class: 'cartao' },
      h('div', { class: 'cartao-cab' }, h('h2', null, 'Atributos'), h('span', { class: 'overall' }, h('small', null, 'Overall'), String(e.overall))),
      h('p', { class: 'sub' }, `Perfil ${PERFIS[e.perfil].nome}. Atributos em destaque pesam mais no overall.`),
      h('ul', { class: 'atributos' }, ATRIBUTOS.map((a) => h('li', { class: PERFIS[e.perfil].pesos[a] >= 2.5 ? 'chave' : '' },
        h('span', { class: 'a-nome' }, ROTULOS[a]),
        barra(e.atributos[a], 99, { rotulo: ROTULOS[a] }),
        h('span', { class: 'a-valor' }, String(e.atributos[a])))))),
    h('section', { class: 'cartao' },
      h('h2', null, 'Contrato'),
      c ? h('dl', { class: 'ficha' },
        h('dt', null, 'Agência'), h('dd', null, `${e.agencia.nome} (${TIER_NOME[e.agencia.tier]})`),
        h('dt', null, 'Garantia semanal'), h('dd', null, dinheiro(c.garantiaSemanal)),
        h('dt', null, 'Comissão'), h('dd', null, pct(c.comissao)),
        h('dt', null, 'Temporadas restantes'), h('dd', null, String(Math.max(0, c.restante))))
        : h('p', null, `${e.agencia.nome} (${TIER_NOME[e.agencia.tier]}). Sem contrato com garantia: você vive dos cachês.`),
      e.extras.length > 0 && h('div', { class: 'extras' },
        h('h3', null, 'Contratos extras'),
        h('ul', null, e.extras.map((x) => h('li', null, `${x.tipo === 'exclusividade' ? 'Exclusividade' : 'Embaixadora'} · ${x.marca}: ${dinheiro(x.semanal)}/semana, mais ${Math.ceil(x.semanasRestantes / 40 * 10) / 10} temporada(s)`)))),
      patrocinioSemanal(e) > 0 && h('p', { class: 'sub' }, `Patrocínios rendendo ${dinheiro(patrocinioSemanal(e))}/semana pela sua imagem na mídia.`)),
    h('section', { class: 'cartao' },
      h('h2', null, 'Condição'),
      h('dl', { class: 'ficha' },
        h('dt', null, 'Fama'), h('dd', null, `${Math.round(e.fama)}/100`),
        h('dt', null, 'Cansaço'), h('dd', null, `${Math.round(e.cansaco)}/100`),
        h('dt', null, 'Energia por semana'), h('dd', null, String(capacidadeDeEnergia(e))),
        h('dt', null, 'Origem'), h('dd', null, e.origem))));
}

// ---------------- Vida ----------------

// Resumo curto do que um nível entrega sozinho (sem os outros gastos), para ajudar a decidir onde investir.
function efeitoDoNivel(cat, nivel) {
  const ef = efeitosVida({ ...criarVidaInicial(), [cat]: nivel, tipoRelacionamento: 'mulher' });
  const partes = [];
  if (ef.chance > 0.001) partes.push(`+${(ef.chance * 100).toFixed(1).replace('.', ',')} pts de chance`);
  if (ef.fama > 0.001) partes.push(`+${Math.round(ef.fama * 100)}% de fama`);
  if (ef.custoEnergia > 0.001) partes.push(`−${Math.round(ef.custoEnergia * 100)}% de energia`);
  if (ef.recuperacao > 0.01) partes.push(`+${ef.recuperacao.toFixed(1).replace('.', ',')} de recuperação`);
  if (ef.lesao > 0.001) partes.push(`−${Math.round(ef.lesao * 100)}% de lesão`);
  return partes.join(' · ');
}

const EFEITOS_ROTULO = (ef) => [
  ['Chance de sucesso', `+${(ef.chance * 100).toFixed(1).replace('.', ',')} pontos`],
  ['Fama por trabalho', `+${Math.round(ef.fama * 100)}%`],
  ['Custo de energia', `−${Math.round(ef.custoEnergia * 100)}%`],
  ['Recuperação do cansaço', `+${ef.recuperacao.toFixed(1).replace('.', ',')}/semana`],
  ['Risco de lesão', `−${Math.round(ef.lesao * 100)}%`],
];

export function abaVida() {
  const e = ctx.jogo.estado;
  const infl = inflacao(e);
  const gastoVida = custoSemanalVida(e);
  const gastoBasico = custoBasico(e);
  const ef = efeitosVida(e.vida);

  const categoria = (cat) => {
    const def = CATEGORIAS_VIDA[cat];
    const atual = e.vida[cat];
    const minimo = cat === 'moradia' && e.fase !== 'regional' ? 1 : 0;
    let tipo = e.vida.tipoRelacionamento;
    const seletor = cat === 'relacionamento'
      ? h('label', { class: 'tipo-rel' }, 'Parceiro(a): ',
        h('select', { onChange: (ev) => { tipo = ev.target.value; } },
          ['mulher', 'homem'].map((t) => h('option', { value: t, selected: t === (tipo ?? 'mulher') }, t === 'mulher' ? 'Mulher' : 'Homem'))))
      : null;
    if (cat === 'relacionamento' && !tipo) tipo = 'mulher';
    return h('section', { class: 'cartao vida-cat' },
      h('h3', null, def.nome),
      seletor,
      h('ul', { class: 'niveis' }, def.niveis.map((n, i) => {
        const custo = Math.round(n.custo * infl);
        const taxa = i > atual ? Math.round(2 * n.custo * infl) : 0;
        const bloqueado = i < minimo || (taxa > 0 && e.dinheiro < taxa);
        return h('li', null, h('button', {
          type: 'button', class: `nivel ${i === atual ? 'atual' : ''}`, disabled: bloqueado || i === atual,
          'aria-pressed': i === atual,
          title: bloqueado && i >= minimo ? 'Dinheiro insuficiente para a taxa de mudança' : '',
          onClick: () => mudarPadraoDeVida(cat, i, cat === 'relacionamento' ? tipo : null),
        },
        h('span', { class: 'n-nome' }, n.nome),
        h('span', { class: 'n-custo' }, custo === 0 ? 'Grátis' : `${dinheiro(custo)}/sem`),
        h('span', { class: 'n-efeito' }, efeitoDoNivel(cat, i) || 'Sem efeito'),
        taxa > 0 && h('span', { class: 'n-taxa' }, `Taxa única ${dinheiro(taxa)}`)));
      })));
  };

  return h('div', { class: 'aba vida' },
    h('section', { class: 'cartao resumo-vida' },
      h('h2', null, 'Finanças'),
      h('dl', { class: 'ficha' },
        h('dt', null, 'Saldo'), h('dd', { class: e.dinheiro < 0 ? 'neg' : '' }, dinheiro(e.dinheiro)),
        h('dt', null, 'Padrão de vida'), h('dd', null, `${dinheiro(gastoVida)}/semana`),
        h('dt', null, 'Custo básico'), h('dd', null, `${dinheiro(gastoBasico)}/semana`),
        h('dt', null, 'Inflação acumulada'), h('dd', null, `${((infl - 1) * 100).toFixed(1).replace('.', ',')}%`)),
      h('p', { class: 'dica' }, 'Cada categoria tem retorno decrescente: o primeiro nível ajuda muito, o último quase nada a mais. Subir de nível cobra uma taxa única de duas semanas do novo custo. No vermelho há juros e, depois de seis semanas, o padrão de vida cai à força.'),
      h('details', { class: 'contas' }, h('summary', null, 'O que seu padrão de vida entrega hoje'),
        h('dl', null, EFEITOS_ROTULO(ef).flatMap(([r, v]) => [h('dt', null, r), h('dd', null, v)])))),
    h('div', { class: 'grade-vida' }, CATEGORIAS.map(categoria)));
}

// ---------------- Relações ----------------

const DESCRICAO_RELACAO = {
  agente: 'Mais ofertas na agenda, mais chance de sucesso e de destaque.',
  bastidores: 'Clima na agência: ajuda a render e a se recuperar do cansaço.',
  direcao: 'Pesa na renovação do contrato e no risco de ser trocada de agência.',
  midia: 'Multiplica a fama de cada trabalho e libera patrocínios semanais.',
  estilistas: 'Mais chance em castings, desfiles e campanhas.',
  fotografos: 'Mais chance em ensaios e campanhas.',
};

function rotuloRelacao(v) {
  if (v >= 85) return 'Excelente';
  if (v >= 70) return 'Ótima';
  if (v >= 55) return 'Boa';
  if (v >= 45) return 'Neutra';
  if (v >= 30) return 'Fria';
  return 'Ruim';
}

export function abaRelacoes() {
  const e = ctx.jogo.estado;
  const rel = efeitosRelacoes(e);
  const rank = rankingDaTemporada(e);
  const rivais = [...e.rivais].sort((a, b) => b.intensidade - a.intensidade || b.overall - a.overall);
  return h('div', { class: 'aba relacoes' },
    h('section', { class: 'cartao' },
      h('h2', null, 'Relações'),
      h('ul', { class: 'relacoes' }, Object.keys(ROTULOS_RELACAO).map((k) => {
        const v = e.relacoes[k];
        return h('li', null,
          h('div', { class: 'rel-topo' }, h('strong', null, ROTULOS_RELACAO[k]), h('span', { class: `rel-nivel n${Math.floor(v / 25)}` }, `${rotuloRelacao(v)} · ${Math.round(v)}`)),
          barra(v, 100, { classe: v < 30 ? 'alerta' : '', rotulo: ROTULOS_RELACAO[k] }),
          h('small', null, DESCRICAO_RELACAO[k]));
      })),
      h('p', { class: 'dica' }, `Efeito atual: ${sinal(Math.round(rel.agendaExtra))} oferta(s) na agenda, destaques em ${pct(rel.fracaoDestaque)} dos acertos, fama ×${rel.fama.toFixed(2).replace('.', ',')}.`)),
    h('section', { class: 'cartao' },
      h('div', { class: 'cartao-cab' }, h('h2', null, 'Rivais'), h('span', { class: 'sub' }, `Você está em ${rank.posicao}º de ${rank.total}`)),
      h('ul', { class: 'rivais' }, rivais.map((r) => h('li', null,
        h('div', { class: 'rival-nome' }, h('strong', null, r.nome), h('small', null, `${r.idade} anos · overall ${r.overall} · fama ${famaDaRival(r)}`)),
        h('div', { class: 'rival-hist' }, `${r.vitorias} × ${r.derrotas}`),
        barra(r.intensidade, 100, { classe: 'rivalidade', rotulo: `Rivalidade com ${r.nome}` }))))),
      h('p', { class: 'dica' }, 'O placar mostra quantas disputas você ganhou × perdeu. A barra é a intensidade da rivalidade, que esfria aos poucos com os anos.'));
}

// ---------------- Carreira ----------------

export function abaCarreira() {
  const e = ctx.jogo.estado;
  const c = e.carreira;
  const pontos = calcularPontos(e);
  const nivel = classificar(pontos);
  const tetos = [['Destaque', HALL_DA_FAMA.destaque], ['Hall da Fama', HALL_DA_FAMA.hall], ['Lenda', HALL_DA_FAMA.lenda]];
  const conquistados = new Set(e.marcos.map((m) => m.id));
  const stat = (r, v) => [h('dt', null, r), h('dd', null, String(v))];

  return h('div', { class: 'aba carreira' },
    h('section', { class: 'cartao' },
      h('div', { class: 'cartao-cab' }, h('h2', null, 'Legado'), h('span', { class: 'selo nivel' }, nivel)),
      h('p', { class: 'sub' }, `${pontos.toLocaleString('pt-BR')} pontos de legado.`),
      barra(pontos, HALL_DA_FAMA.lenda, { rotulo: 'Pontos de legado' }),
      h('div', { class: 'tetos' }, tetos.map(([n, v]) => h('span', { class: pontos >= v ? 'ok' : '' }, `${n} · ${v}`))),
      h('dl', { class: 'ficha duas' },
        stat('Trabalhos fechados', c.trabalhos), stat('Destaques', c.destaques), stat('Capas', c.capas),
        stat('Desfiles em semanas de moda', c.desfilesDeModa), stat('Campanhas de elite', c.campanhasElite),
        stat('Títulos do ranking', c.titulosRanking), stat('Melhor ranking', c.melhorRanking ? `${c.melhorRanking}º` : '—'),
        stat('Pico de overall', c.picoOverall || '—'), stat('Ganhos totais', dinheiroCurto(c.ganhosTotais)))),
    h('section', { class: 'cartao' },
      h('h2', null, `Marcos (${e.marcos.length}/${MARCOS.length})`),
      h('ul', { class: 'marcos' }, MARCOS.map((m) => h('li', { class: conquistados.has(m.id) ? 'feito' : '' },
        h('span', { class: 'marca' }, conquistados.has(m.id) ? '✦' : '○'), m.texto)))),
    h('section', { class: 'cartao largo' },
      h('h2', null, 'Temporadas'),
      e.resumos.length === 0 ? h('p', { class: 'sub' }, 'Ainda não há temporadas fechadas.')
        : h('div', { class: 'tabela-wrap' }, h('table', { class: 'tabela' },
          h('thead', null, h('tr', null, ['Temp.', 'Idade', 'Fase', 'Agência', 'Rank', 'Overall', 'Fama', 'Trabalhos', 'Líquido', 'Saldo'].map((t) => h('th', null, t)))),
          h('tbody', null, [...e.resumos].reverse().map((r) => h('tr', null,
            h('td', null, r.temporada), h('td', null, r.idade), h('td', null, FASE_NOME[r.fase]), h('td', null, r.agencia),
            h('td', null, `${r.ranking}º`), h('td', null, r.overall), h('td', null, r.fama), h('td', null, `${r.trabalhos} (${r.destaques}✦)`),
            h('td', { class: r.liquido < 0 ? 'neg' : '' }, dinheiroCurto(r.liquido)), h('td', { class: r.dinheiro < 0 ? 'neg' : '' }, dinheiroCurto(r.dinheiro)))))))));
}

// ---------------- Notícias ----------------

export function abaNoticias() {
  const e = ctx.jogo.estado;
  const itens = [...e.eventos].reverse().slice(0, 80);
  return h('div', { class: 'aba noticias' },
    h('section', { class: 'cartao' },
      h('h2', null, 'Notícias da carreira'),
      itens.length === 0 ? h('p', { class: 'sub' }, 'Nada por aqui ainda. As notícias aparecem conforme a carreira anda.')
        : h('ul', { class: 'noticias-lista' }, itens.map((n) => h('li', null,
          h('span', { class: `selo tipo-${n.tipo}` }, TIPO_EVENTO_ROTULO[n.tipo] ?? 'Notícia'),
          h('span', { class: 'quando' }, `T${n.temporada} · S${n.semana}`),
          h('p', null, n.texto))))));
}

export const ABAS = [
  ['semana', 'Semana', abaSemana],
  ['perfil', 'Perfil', abaPerfil],
  ['vida', 'Vida', abaVida],
  ['relacoes', 'Relações', abaRelacoes],
  ['carreira', 'Carreira', abaCarreira],
  ['noticias', 'Notícias', abaNoticias],
];

export { FASES, TIPOS };
