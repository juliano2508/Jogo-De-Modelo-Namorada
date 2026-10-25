// Janelas de decisão e de aviso: pendências do motor (Seleção, propostas, eventos, aposentadoria)
// e avisos (boas-vindas, resumo da temporada, resultado de eventos, revelação da Noite da Seleção).

import { CAMINHOS_POS_CARREIRA, PERFIS } from '../engine/index.js';
import { ctx } from './ctx.js';
import { h, dinheiro, pct, FASE_NOME, TIER_NOME, barra } from './util.js';
import {
  fecharModal, decidirIrOuFicar, fazerSelecao, aceitarProposta, escolherNoEvento, decidirFimDeCarreira,
} from './acoes.js';

function moldura(titulo, filhos, { classe = '', rotulo = titulo } = {}) {
  return h('div', { class: 'modal-fundo' },
    h('div', { class: `modal ${classe}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': rotulo },
      h('h2', null, titulo), filhos));
}

// Qual janela mostrar agora: primeiro os avisos, depois a pendência do motor.
export function modalAtual() {
  const { estado } = ctx.jogo;
  const m = ctx.ui.modal;
  if (m) {
    if (m.tipo === 'boas-vindas') return boasVindas();
    if (m.tipo === 'resumo-temporada') return resumoTemporada(m.resumo);
    if (m.tipo === 'resultado-evento') return resultadoEvento(m);
    if (m.tipo === 'selecao-revelacao') return (m.el ??= revelacaoSelecao(m));
  }
  const p = estado.pendencia;
  if (!p || estado.aposentada) return null;
  switch (p.tipo) {
    case 'decisao-selecao': return decisaoSelecao();
    case 'selecao': return noiteDaSelecao();
    case 'free-agency':
    case 'proposta-alternativo': return propostas(p);
    case 'evento': return evento(p.evento);
    case 'aposentadoria': return aposentadoria(p);
    default: return null;
  }
}

function boasVindas() {
  const e = ctx.jogo.estado;
  return moldura(`Bem-vinda, ${e.nome}`, [
    h('p', null, `Você tem 18 anos, ${PERFIS[e.perfil].nome.toLowerCase()} no sangue e um sonho: estampar a capa da Vague. Por enquanto, seu mundo é o circuito regional de ${e.origem}.`),
    h('ul', { class: 'passos' },
      h('li', null, h('strong', null, 'Cada semana:'), ' escolha os trabalhos da agenda. Cada um custa energia e tem uma chance de dar certo, com chance de virar destaque.'),
      h('li', null, h('strong', null, 'Cada ano:'), ' seus atributos evoluem. Depois da primeira temporada você decide se vai à Noite da Seleção agora ou ganha mais um ano de preparo.'),
      h('li', null, h('strong', null, 'Sempre:'), ' cuide do dinheiro, das relações e das rivais. Quando o caixa permitir, invista no padrão de vida (aba Vida): é o que mais ajuda a chegar longe. Decisões de hoje voltam como consequência anos depois.')),
    h('div', { class: 'acoes' }, h('button', { class: 'btn grande', onClick: fecharModal }, 'Começar')),
  ]);
}

function resumoTemporada(r) {
  const linha = (rot, val, classe = '') => [h('dt', null, rot), h('dd', { class: classe }, val)];
  return moldura(`Fim da temporada ${r.temporada}`, [
    h('p', { class: 'sub' }, `${r.idade} anos · ${FASE_NOME[r.fase]} · ${r.agencia}`),
    h('dl', { class: 'ficha duas' },
      linha('Trabalhos fechados', `${r.trabalhos} (${r.destaques} destaques)`),
      linha('Cachês', dinheiro(r.ganhos)),
      linha('Resultado do ano', dinheiro(r.liquido), r.liquido < 0 ? 'neg' : ''),
      linha('Saldo', dinheiro(r.dinheiro), r.dinheiro < 0 ? 'neg' : ''),
      linha('Ranking anual', `${r.ranking}º lugar`),
      linha('Overall', String(r.overall)),
      linha('Fama', String(r.fama)),
      r.semanasNoVermelho > 0 && linha('Semanas no vermelho', String(r.semanasNoVermelho), 'neg')),
    h('p', { class: 'dica' }, 'Mais um ano de vida: seus atributos já evoluíram (veja a aba Perfil).'),
    h('div', { class: 'acoes' }, h('button', { class: 'btn grande', onClick: fecharModal }, 'Seguir')),
  ], { rotulo: 'Resumo da temporada' });
}

function resultadoEvento(m) {
  return moldura(m.titulo, [
    m.escolha && h('p', { class: 'sub' }, `Você escolheu: ${m.escolha}`),
    h('p', { class: 'citacao' }, m.resultado),
    h('div', { class: 'acoes' }, h('button', { class: 'btn grande', onClick: fecharModal }, 'Continuar')),
  ]);
}

function decisaoSelecao() {
  const s = ctx.jogo.estado.snapshotSelecao;
  return moldura('Hora de decidir', [
    h('p', null, 'Sua primeira temporada acabou e a Noite da Seleção está chegando. Trinta agências escolhem 60 novatas em duas rodadas.'),
    h('dl', { class: 'ficha duas' },
      h('dt', null, 'Sua avaliação hoje'), h('dd', null, `Overall ${s.overall} · fama ${Math.round(s.fama)}`)),
    h('p', { class: 'dica' }, 'Ir agora é arriscar com a avaliação atual. Ficar mais um ano significa chegar mais forte, mas, se também não for escolhida depois, você segue para o circuito alternativo.'),
    h('div', { class: 'acoes' },
      h('button', { class: 'btn fantasma', onClick: () => decidirIrOuFicar('ficar') }, 'Ficar mais um ano'),
      h('button', { class: 'btn grande', onClick: () => decidirIrOuFicar('ir') }, 'Ir à Seleção agora')),
  ]);
}

function noiteDaSelecao() {
  const e = ctx.jogo.estado;
  return moldura('Noite da Seleção', [
    h('p', null, e.fase === 'regional'
      ? 'Chegou a hora: esta é a Seleção obrigatória depois de dois anos no regional.'
      : 'Mais uma Noite da Seleção. Quem sabe desta vez uma agência grande chama seu nome.'),
    h('p', { class: 'sub' }, `Avaliação: overall ${e.snapshotSelecao.overall} · fama ${Math.round(e.snapshotSelecao.fama)}.`),
    h('div', { class: 'acoes' }, h('button', { class: 'btn grande', onClick: fazerSelecao }, 'Abrir a noite')),
  ]);
}

// Revelação escolha por escolha, com um pouco de suspense antes do nome dela.
function revelacaoSelecao(m) {
  const { noite, escolha } = m.resultado;
  const lista = h('ol', { class: 'noite' });
  const rodape = h('div', { class: 'acoes' });
  const placar = h('p', { class: 'sub' }, 'A noite começa...');
  let i = 0;
  let parado = false;

  const adicionar = (p) => {
    lista.append(h('li', { class: p.jogadora ? 'minha' : '' },
      h('span', { class: 'pos' }, `#${p.posicao}`),
      h('span', { class: 'nome' }, p.nome),
      h('span', { class: 'ag' }, `${p.agenciaNome} · ${TIER_NOME[p.agenciaTier]}`)));
    lista.scrollTop = lista.scrollHeight;
  };

  const terminar = () => {
    parado = true;
    clearTimeout(m.timer);
    const e = ctx.jogo.estado;
    placar.textContent = escolha
      ? `Escolha nº ${escolha.posicao} da ${escolha.rodada}ª rodada, por ${escolha.agenciaNome}!`
      : e.fase === 'alternativo'
        ? 'Seu nome não foi chamado. Você segue para o circuito alternativo.'
        : 'Seu nome não foi chamado. Você volta ao circuito regional por mais um ano.';
    placar.className = escolha ? 'destaque-texto' : 'aviso';
    if (escolha && e.contrato) {
      placar.textContent += ` Garantia de ${dinheiro(e.contrato.garantiaSemanal)} por semana, por ${e.contrato.duracao} temporada(s).`;
    }
    rodape.replaceChildren(h('button', { class: 'btn grande', onClick: () => { clearTimeout(m.timer); fecharModal(); } }, 'Continuar'));
  };

  const proximo = () => {
    if (parado) return;
    if (i >= noite.length) { terminar(); return; }
    const p = noite[i];
    adicionar(p);
    i += 1;
    placar.textContent = `${i} de ${noite.length} escolhas...`;
    const proxEhMinha = noite[i]?.jogadora;
    m.timer = setTimeout(proximo, p.jogadora ? 1500 : proxEhMinha ? 1400 : 130);
  };

  rodape.append(h('button', {
    class: 'btn fantasma',
    onClick: () => { parado = true; clearTimeout(m.timer); while (i < noite.length) adicionar(noite[i++]); terminar(); },
  }, 'Pular para o resultado'));
  m.timer = setTimeout(proximo, 600);

  return moldura('Noite da Seleção', [placar, lista, rodape], { classe: 'larga' });
}

function propostas(p) {
  const alt = p.tipo === 'proposta-alternativo';
  const e = ctx.jogo.estado;
  return moldura(alt ? 'Agências grandes ligaram!' : 'Fim de contrato: free agency', [
    h('p', null, alt
      ? 'Seu desempenho no circuito alternativo chamou atenção. Você pode aceitar uma proposta agora ou seguir onde está.'
      : `Seu contrato com ${e.agencia.nome} terminou. Estas são as propostas na mesa. Compare a garantia, a duração e o peso da agência na sua carreira.`),
    h('ul', { class: 'propostas' }, p.propostas.map((pr, i) => h('li', { class: 'proposta' },
      h('div', null,
        h('strong', null, pr.agenciaNome),
        pr.renovacao && h('span', { class: 'selo nivel' }, 'Renovação'),
        h('small', null, `Agência ${TIER_NOME[pr.tier].toLowerCase()} · ${pr.duracao} temporada(s) · comissão ${pct(pr.comissao)}`)),
      h('div', { class: 'proposta-valor' }, h('strong', null, dinheiro(pr.garantiaSemanal)), h('small', null, 'garantia/semana')),
      h('button', { class: 'btn', onClick: () => aceitarProposta(i) }, 'Assinar')))),
    alt && h('div', { class: 'acoes' }, h('button', { class: 'btn fantasma', onClick: () => aceitarProposta(-1) }, 'Recusar todas')),
  ], { classe: 'larga' });
}

function evento(ev) {
  return moldura(ev.titulo, [
    h('span', { class: `selo natureza-${ev.natureza}` }, { positivo: 'Oportunidade', negativo: 'Problema', neutro: 'Decisão' }[ev.natureza] ?? 'Decisão'),
    h('p', { class: 'citacao' }, ev.texto),
    h('div', { class: 'escolhas' }, ev.escolhas.map((c) => h('button', { class: 'btn escolha', onClick: () => escolherNoEvento(c.id) }, c.texto))),
  ]);
}

const MOTIVOS = {
  saude: 'sua saúde já não é a mesma',
  resistencia: 'sua resistência não acompanha mais o ritmo das semanas de moda',
  longevidade: 'são muitos anos de estrada',
  desempenho: 'o mercado está cada vez mais difícil para você',
  idade: 'chegou a idade em que a carreira se encerra',
};

function aposentadoria(p) {
  const e = ctx.jogo.estado;
  const motivos = p.motivos.map((m) => MOTIVOS[m]).filter(Boolean).join('; ');
  return moldura(p.obrigatoria ? 'O fim de uma era' : 'Hora de pensar na aposentadoria', [
    h('p', null, `${e.nome}, aos ${e.idade} anos: ${motivos}.`),
    h('p', { class: 'dica' }, p.obrigatoria
      ? 'Esta aposentadoria é inevitável. Escolha como será o próximo capítulo.'
      : 'Você pode se aposentar agora, com um novo caminho pela frente, ou continuar mais uma temporada.'),
    h('div', { class: 'escolhas' }, Object.entries(CAMINHOS_POS_CARREIRA).map(([id, c]) => {
      const livre = !c.exige || c.exige(e);
      return h('button', { class: 'btn escolha', disabled: !livre, title: livre ? '' : c.erro, onClick: () => decidirFimDeCarreira('aposentar', id) },
        h('strong', null, `Aposentar-se e ${c.nome.charAt(0).toLowerCase()}${c.nome.slice(1)}`),
        h('small', null, livre ? (c.pontos ? `+${c.pontos} pontos de legado` : 'Sem bônus de legado') : c.erro));
    })),
    !p.obrigatoria && h('div', { class: 'acoes' }, h('button', { class: 'btn fantasma', onClick: () => decidirFimDeCarreira('continuar') }, 'Continuar na carreira')),
  ], { classe: 'larga' });
}
