// Painel principal do jogo (cabeçalho, abas, janelas) e a tela final de legado.

import { ctx } from './ctx.js';
import { h, dinheiro, dinheiroCurto, barra, FASE_NOME, TIER_NOME } from './util.js';
import { ABAS } from './abas.js';
import { modalAtual } from './modais.js';
import { masthead } from './inicio.js';
import { voltarAoMenu } from './acoes.js';

function cabecalho(e) {
  const stat = (rot, val, classe = '') => h('div', { class: `stat ${classe}` }, h('small', null, rot), h('strong', null, val));
  return h('header', { class: 'topo' },
    h('div', { class: 'topo-linha' },
      h('div', { class: 'topo-id' },
        h('span', { class: 'marca-mini' }, 'Primeira Capa'),
        h('h1', null, e.nome),
        h('p', null, `${e.idade} anos · ${e.origem} · ${FASE_NOME[e.fase]} · ${e.agencia.nome} (${TIER_NOME[e.agencia.tier]})`)),
      h('button', { class: 'btn fantasma pequeno', onClick: voltarAoMenu }, 'Menu')),
    h('div', { class: 'stats' },
      stat('Temporada', `${e.temporada} · sem. ${Math.min(e.semana, e.semanasTemporada)}/${e.semanasTemporada}`),
      stat('Saldo', dinheiroCurto(e.dinheiro), e.dinheiro < 0 ? 'neg' : ''),
      stat('Overall', String(e.overall)),
      stat('Fama', String(Math.round(e.fama))),
      h('div', { class: 'stat' }, h('small', null, 'Cansaço'), barra(e.cansaco, 100, { classe: e.cansaco >= 60 ? 'alerta' : '', rotulo: 'Cansaço' }))));
}

export function telaJogo() {
  const e = ctx.jogo.estado;
  if (e.aposentada) return telaLegado(e);

  const abas = h('nav', { class: 'abas', role: 'tablist' }, ABAS.map(([id, nome]) => h('button', {
    type: 'button', role: 'tab', class: `aba-btn ${ctx.ui.aba === id ? 'ativa' : ''}`, 'aria-selected': ctx.ui.aba === id,
    onClick: () => { ctx.ui.aba = id; ctx.render(); },
  }, nome)));

  const [, , desenhar] = ABAS.find(([id]) => id === ctx.ui.aba) ?? ABAS[0];
  const modal = modalAtual();
  return h('main', { class: 'pagina jogo' }, cabecalho(e), abas, desenhar(), modal);
}

function telaLegado(e) {
  const l = e.legado;
  const s = l.estatisticas;
  const caminho = { agencia: 'abriu a própria agência', mentora: 'virou mentora de novas modelos', jurada: 'virou jurada de programas de moda', tranquila: 'escolheu uma vida tranquila' }[l.caminhoPosCarreira] ?? '';
  const stat = (r, v) => [h('dt', null, r), h('dd', null, String(v))];
  return h('main', { class: 'pagina legado' },
    masthead(true),
    h('section', { class: `cartao capa ${l.hallDaFama ? 'hall' : ''}` },
      h('p', { class: 'sub' }, `${l.nome} · ${l.idadeAposentadoria} anos · ${l.temporadasProfissionais} temporadas profissionais`),
      h('h2', null, l.nivel),
      h('p', { class: 'pontos' }, `${l.pontos.toLocaleString('pt-BR')} pontos de legado`),
      h('p', null, `Depois de se aposentar, ${l.nome} ${caminho}.`),
      l.hallDaFama && h('p', { class: 'destaque-texto' }, 'Seu nome entrou para o Hall da Fama da moda.')),
    h('div', { class: 'duas-colunas' },
      h('section', { class: 'cartao' },
        h('h3', null, 'Em números'),
        h('dl', { class: 'ficha duas' },
          stat('Trabalhos fechados', s.trabalhos), stat('Destaques', s.destaques), stat('Capas', s.capas),
          stat('Desfiles de semana de moda', s.desfilesDeModa), stat('Campanhas de elite', s.campanhasElite),
          stat('Títulos do ranking', s.titulosRanking), stat('Melhor ranking', s.melhorRanking ? `${s.melhorRanking}º` : '—'),
          stat('Pico de overall', s.picoOverall), stat('Pico de fama', s.picoFama),
          stat('Ganhos totais', dinheiroCurto(s.ganhosTotais)), stat('Patrimônio final', dinheiroCurto(l.patrimonio)))),
      h('section', { class: 'cartao' },
        h('h3', null, `Marcos (${l.marcos.length})`),
        l.marcos.length ? h('ul', { class: 'marcos' }, l.marcos.map((m) => h('li', { class: 'feito' }, h('span', { class: 'marca' }, '✦'), m))) : h('p', { class: 'sub' }, 'Nenhum marco registrado.'),
        l.principalRival && h('p', { class: 'dica' }, `Maior rival: ${l.principalRival.nome} (${l.principalRival.vitorias} × ${l.principalRival.derrotas} nas disputas).`),
        h('p', { class: 'dica' }, `Agências: ${l.agencias.join(', ')}.`))),
    h('div', { class: 'acoes' }, h('button', { class: 'btn grande', onClick: voltarAoMenu }, 'Voltar ao menu')));
}
