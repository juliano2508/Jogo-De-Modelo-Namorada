// Vida pessoal (estilo BitLife): diário, atividades, família, hábitos e o painel da infância/juventude.

import {
  PERFIS, ROTULOS_STATS, atividadesDisponiveis, HABITOS, CHAVES_HABITO, SUBSTANCIAS, DEPENDENCIA_AJUDA_MIN,
  DEPENDENCIA_TRAVA, custoDeAjuda, STATUS_PARCEIRO, CLASSES,
} from '../engine/index.js';
import { ctx } from './ctx.js';
import { h, dinheiro, barra } from './util.js';
import { envelhecer, comecarCarreira, fazerAtividadeUI, definirHabito, pedirAjuda } from './acoes.js';

const primeiro = (nome) => (nome ?? '').split(' ')[0];
const PAPEL = { mae: 'Mãe', pai: 'Pai', avo: 'Avó', irmao: 'Irmão', irma: 'Irmã' };

function rotuloLaco(v) {
  if (v >= 85) return 'Inseparáveis';
  if (v >= 70) return 'Muito próximos';
  if (v >= 55) return 'Próximos';
  if (v >= 40) return 'Distantes';
  if (v >= 25) return 'Frios';
  return 'Afastados';
}

// ---------------- Diário e atividades ----------------

function linhaAtividade(e, a) {
  const p = e.pessoa;
  let seletor = null;
  if (a.alvo === 'familia') {
    seletor = h('select', { 'aria-label': `Com quem: ${a.nome}` },
      p.familia.filter((f) => f.vivo).map((f) => h('option', { value: f.id }, `${PAPEL[f.papel] ?? f.papel}: ${primeiro(f.nome)}`)));
  } else if (a.alvo === 'amigo') {
    seletor = h('select', { 'aria-label': `Com quem: ${a.nome}` },
      [h('option', { value: '' }, p.amigos.length ? 'Fazer um amigo novo' : 'Fazer um amigo')]
        .concat(p.amigos.map((am) => h('option', { value: am.id }, primeiro(am.nome)))));
  }
  return h('li', { class: 'atividade' },
    h('div', null, h('strong', null, a.nome), h('small', null, a.descricao)),
    seletor,
    h('button', {
      class: 'btn pequeno', disabled: p.tempoLivre <= 0,
      onClick: () => fazerAtividadeUI(a.id, seletor ? seletor.value || null : null),
    }, 'Fazer'));
}

function feedDoDiario(e) {
  const itens = (e.diario ?? []).slice(-80).reverse();
  if (itens.length === 0) return h('p', { class: 'sub' }, 'Sua história começa agora.');
  const grupos = [];
  for (const d of itens) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.idade === d.idade) ultimo.linhas.push(d);
    else grupos.push({ idade: d.idade, linhas: [d] });
  }
  return h('div', { class: 'diario' }, grupos.map((g) => h('section', { class: 'diario-ano' },
    h('h4', null, g.idade === 0 ? 'Ao nascer' : `Aos ${g.idade} ano${g.idade === 1 ? '' : 's'}`),
    h('ul', null, g.linhas.map((d) => h('li', { class: `d-${d.tipo}` }, d.texto))))));
}

export function abaDiario() {
  const e = ctx.jogo.estado;
  const p = e.pessoa;
  const ativs = atividadesDisponiveis(e);
  return h('div', { class: 'aba diario-aba' },
    h('section', { class: 'cartao' },
      h('div', { class: 'cartao-cab' },
        h('h2', null, e.modo === 'vida' ? (e.idade === 0 ? 'Ao nascer' : `Aos ${e.idade} ${e.idade === 1 ? 'ano' : 'anos'}`) : 'Tempo livre'),
        h('span', { class: 'selo nivel' }, `${p.tempoLivre} ${p.tempoLivre === 1 ? 'atividade' : 'atividades'} neste ano`)),
      e.modo === 'vida'
        ? h('p', { class: 'sub' }, 'Escolha como usar seu tempo. Cada atividade molda quem você vai ser e, com o tempo, que tipo de modelo.')
        : h('p', { class: 'sub' }, 'Entre uma temporada e outra, sobra tempo para cuidar da vida fora da passarela.'),
      p.tempoLivre === 0 && h('p', { class: 'aviso' }, e.modo === 'vida' ? 'Você usou todo o tempo livre. Hora de envelhecer um ano.' : 'Você usou todo o tempo livre deste ano. Ele volta na próxima temporada.'),
      h('ul', { class: 'atividades' }, ativs.map((a) => linhaAtividade(e, a)))),
    h('section', { class: 'cartao' }, h('h2', null, 'Diário'), feedDoDiario(e)));
}

// ---------------- Família ----------------

function cartaoPessoa({ titulo, nome, detalhe, relacao, nota, apagado = false }) {
  return h('li', { class: `pessoa ${apagado ? 'apagada' : ''}` },
    h('div', { class: 'pessoa-topo' }, h('div', null, h('strong', null, nome), h('small', null, `${titulo}${detalhe ? ` · ${detalhe}` : ''}`)),
      !apagado && relacao !== undefined && h('span', { class: 'sub' }, rotuloLaco(relacao))),
    !apagado && relacao !== undefined && barra(relacao, 100, { classe: relacao < 30 ? 'alerta' : '', rotulo: `Relação com ${nome}` }),
    nota && h('small', null, nota));
}

export function abaFamilia() {
  const e = ctx.jogo.estado;
  const p = e.pessoa;
  const par = p.parceiro;
  return h('div', { class: 'aba familia' },
    h('section', { class: 'cartao' },
      h('h2', null, 'Família'),
      h('p', { class: 'sub' }, `Origem: ${CLASSES[p.classe].nome}, sobrenome ${p.sobrenome}.`),
      h('ul', { class: 'pessoas' }, p.familia.map((f) => cartaoPessoa({
        titulo: PAPEL[f.papel] ?? f.papel, nome: f.nome, detalhe: f.vivo ? `${f.idade} anos${f.profissao ? ` · ${f.profissao}` : ''}` : 'faleceu',
        relacao: f.relacao, apagado: !f.vivo, nota: f.vivo && f.ausente ? 'Ausente da sua vida.' : null,
      })))),
    h('section', { class: 'cartao' },
      h('h2', null, 'Amor e filhos'),
      par ? h('ul', { class: 'pessoas' }, cartaoPessoa({
        titulo: STATUS_PARCEIRO[par.status], nome: par.nome, detalhe: `${par.idade} anos · ${par.profissao}`, relacao: par.relacao,
      })) : h('p', { class: 'sub' }, e.modo === 'vida' ? 'Ainda é cedo para isso. Primeiro, viver.' : 'Você está solteira. Quem sabe quem aparece?'),
      p.filhos.length > 0 && h('ul', { class: 'pessoas' }, p.filhos.map((f) => cartaoPessoa({ titulo: 'Filho(a)', nome: f.nome, detalhe: `${f.idade} ano${f.idade === 1 ? '' : 's'}`, relacao: f.relacao }))),
      p.ex.length > 0 && h('p', { class: 'dica' }, `Relacionamentos que ficaram para trás: ${p.ex.map((x) => primeiro(x.nome)).join(', ')}.`)),
    h('section', { class: 'cartao' },
      h('h2', null, 'Amigos'),
      p.amigos.length === 0 ? h('p', { class: 'sub' }, 'Você ainda não tem amigos próximos. Saia com alguém nas atividades para fazer um.')
        : h('ul', { class: 'pessoas' }, [...p.amigos].sort((a, b) => b.relacao - a.relacao).map((a) => cartaoPessoa({
          titulo: 'Amigo(a)', nome: a.nome, detalhe: `${a.idade} anos`, relacao: a.relacao,
        })))));
}

// ---------------- Eu (infância/juventude) ----------------

export function abaEu() {
  const e = ctx.jogo.estado;
  const p = e.pessoa;
  const pontos = Object.entries(p.afinidades).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  return h('div', { class: 'aba eu' },
    h('section', { class: 'cartao' },
      h('h2', null, 'Como você está'),
      h('ul', { class: 'stats-pessoais' }, Object.entries(ROTULOS_STATS).map(([k, rot]) => h('li', null,
        h('div', { class: 'rel-topo' }, h('strong', null, rot), h('span', { class: 'sub' }, String(Math.round(p.stats[k])))),
        barra(p.stats[k], 100, { classe: p.stats[k] < 30 ? 'alerta' : '', rotulo: rot })))),
      h('p', { class: 'dica' }, 'Estudos, disciplina e saúde viram atributos de verdade quando a carreira começa. Quanto melhor você chegar aos 18, mais longe começa.')),
    h('section', { class: 'cartao' },
      h('h2', null, 'Para onde a moda te puxa'),
      pontos.length === 0 ? h('p', { class: 'sub' }, 'Ainda sem preferência: viva, experimente e descubra.')
        : h('ul', { class: 'stats-pessoais' }, pontos.map(([perfil]) => h('li', null, h('strong', null, PERFIS[perfil].nome)))),
      h('p', { class: 'dica' }, 'Seu perfil de modelo vai nascer do que você viveu: dança e passarela, teatro e fotografia, redes e contato com o público, ou um pouco de tudo.')));
}

// ---------------- Hábitos ----------------

function meterDependencia(e, subst) {
  const v = e.pessoa.dependencia[subst];
  if (e.pessoa.habitos[subst] === 0 && v < 5) return null;
  const nivel = v >= DEPENDENCIA_TRAVA ? 'Dependência' : v >= DEPENDENCIA_AJUDA_MIN ? 'Hábito difícil de largar' : v >= 15 ? 'Começando a pesar' : 'Sob controle';
  return h('div', { class: 'dependencia' },
    h('div', { class: 'rel-topo' }, h('small', null, 'Dependência'), h('small', { class: v >= DEPENDENCIA_AJUDA_MIN ? 'neg' : '' }, nivel)),
    barra(v, 100, { classe: v >= DEPENDENCIA_AJUDA_MIN ? 'alerta' : '', rotulo: `Dependência: ${HABITOS[subst].nome}` }));
}

export function abaHabitos() {
  const e = ctx.jogo.estado;
  const p = e.pessoa;
  return h('div', { class: 'aba habitos' },
    h('section', { class: 'cartao' },
      h('h2', null, 'Hábitos'),
      h('p', { class: 'sub' }, 'O que você faz todo dia pesa mais que um grande dia. Os custos são semanais e sobem com a inflação.'),
      h('ul', { class: 'habitos' }, CHAVES_HABITO.map((k) => {
        const hab = HABITOS[k];
        const atual = p.habitos[k];
        const trava = SUBSTANCIAS.includes(k) && p.dependencia[k] >= DEPENDENCIA_TRAVA;
        const precisaAjuda = SUBSTANCIAS.includes(k) && (p.dependencia[k] >= DEPENDENCIA_AJUDA_MIN || p.habitos[k] >= 2);
        return h('li', { class: 'habito' },
          h('div', null, h('strong', null, hab.nome), h('small', null, hab.descricao)),
          h('div', { class: 'niveis' }, hab.niveis.map((n, i) => h('button', {
            type: 'button', class: `nivel ${i === atual ? 'ativo' : ''}`, 'aria-pressed': i === atual,
            disabled: i !== atual && trava && i < 1,
            onClick: () => definirHabito(k, i),
          }, h('span', null, n.nome), h('small', null, n.custo ? `${dinheiro(n.custo)}/sem` : 'Grátis')))),
          SUBSTANCIAS.includes(k) && meterDependencia(e, k),
          precisaAjuda && h('div', { class: 'acoes' },
            h('button', { class: 'btn fantasma pequeno', onClick: () => pedirAjuda(k) }, `Buscar ajuda profissional (${dinheiro(custoDeAjuda(e))})`)),
          trava && h('p', { class: 'aviso ruim' }, 'Você não consegue parar sozinha. Procure ajuda profissional: são 6 semanas afastada, mas é o caminho.'));
      }))));
}

// ---------------- Painel da infância/juventude ----------------

export function barraDeVida() {
  const e = ctx.jogo.estado;
  const p = e.pessoa;
  if (p.aguardandoCarreira) {
    return h('div', { class: 'barra-acao' },
      h('p', null, 'Você fez 18 anos. Sua história de modelo está pronta para começar.'),
      h('button', { class: 'btn grande', onClick: comecarCarreira }, 'Começar a carreira de modelo'));
  }
  return h('div', { class: 'barra-acao' },
    h('p', { class: 'sub' }, p.tempoLivre > 0 ? `Ainda dá para fazer ${p.tempoLivre} ${p.tempoLivre === 1 ? 'atividade' : 'atividades'} este ano.` : 'Ano tranquilo. Pronta para o próximo?'),
    h('button', { class: 'btn grande', onClick: envelhecer }, `Envelhecer para ${e.idade + 1} ${e.idade + 1 === 1 ? 'ano' : 'anos'}`));
}
