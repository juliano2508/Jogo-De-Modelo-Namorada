// Telas de abertura: capa do jogo (menu com slots) e criação da modelo.

import { PERFIS, DIFICULDADES, ATRIBUTOS, ROTULOS, CIDADES_DE_ORIGEM } from '../engine/index.js';
import { ctx } from './ctx.js';
import { h, PERFIL_TEXTO, DIFICULDADE_TEXTO, FASE_NOME, toast } from './util.js';
import { SLOTS, lerMeta, apagarSlot } from './save.js';
import { iniciarCarreira, continuarCarreira } from './acoes.js';

export function masthead(pequeno = false) {
  return h('header', { class: `masthead ${pequeno ? 'pequeno' : ''}` },
    h('div', { class: 'masthead-linha' }, h('span', null, 'Edição de estreia'), h('span', null, 'Moda · Fama · Carreira')),
    h('h1', null, 'Primeira Capa'),
    !pequeno && h('p', { class: 'lema' }, 'Da passarela do bairro à capa da Vague.'));
}

export function telaInicio() {
  const slots = SLOTS.map((n) => {
    const meta = lerMeta(n);
    if (!meta) {
      return h('li', { class: 'slot vazio' },
        h('div', null, h('strong', null, `Jogo ${n}`), h('span', { class: 'sub' }, 'Vazio')));
    }
    const detalhe = meta.aposentada
      ? `Aposentada · ${meta.nivel ?? ''}`
      : meta.modo === 'vida' ? 'Crescendo' : `${FASE_NOME[meta.fase] ?? meta.fase} · ${meta.agencia}`;
    return h('li', { class: 'slot' },
      h('div', null,
        h('strong', null, `${meta.nome}`),
        h('span', { class: 'sub' }, `${meta.idade} anos · temporada ${meta.temporada} · ${detalhe}`)),
      h('div', { class: 'slot-acoes' },
        h('button', { class: 'btn', onClick: () => continuarCarreira(n) }, 'Continuar'),
        h('button', {
          class: 'btn fantasma',
          onClick: () => {
            if (confirm(`Apagar o jogo salvo de ${meta.nome}? Isso não pode ser desfeito.`)) {
              apagarSlot(n);
              ctx.render();
            }
          },
        }, 'Apagar')));
  });

  return h('main', { class: 'pagina inicio' },
    masthead(),
    h('section', { class: 'cartao' },
      h('h2', null, 'Sua carreira'),
      h('p', null, 'Nasça, cresça, faça escolhas, descubra que tipo de modelo você vai ser. Depois conquiste uma agência na Noite da Seleção, desfile nas quatro semanas de moda e chegue ao Hall da Fama, sem esquecer da vida fora da passarela.'),
      h('button', { class: 'btn grande', onClick: () => { ctx.tela = 'criacao'; ctx.render(); } }, 'Nova carreira')),
    h('section', { class: 'cartao' }, h('h2', null, 'Jogos salvos'), h('ul', { class: 'slots' }, slots)),
    h('p', { class: 'rodape' }, 'Todos os nomes de marcas, revistas, agências e modelos são paródias fictícias.'));
}

export function telaCriacao() {
  const form = { inicio: 'nascimento', perfil: 'versatil', dificuldade: 'normal', slot: SLOTS.find((n) => !lerMeta(n)) ?? 1 };
  const nome = h('input', { id: 'nome', type: 'text', maxlength: 28, placeholder: 'Como ela se chama?', autocomplete: 'off' });
  const origem = h('select', { id: 'origem' }, CIDADES_DE_ORIGEM.map((c) => h('option', { value: c, selected: c === 'Curitiba' }, c)));
  const semente = h('input', { id: 'semente', type: 'number', min: 1, placeholder: 'Opcional' });

  const grupo = (campo, opcoes) => {
    const caixa = h('div', { class: 'opcoes' });
    const desenhar = () => {
      caixa.replaceChildren(...opcoes.map(([id, titulo, texto, extra]) =>
        h('button', {
          type: 'button', class: `opcao ${form[campo] === id ? 'ativa' : ''}`, 'aria-pressed': form[campo] === id,
          onClick: () => { form[campo] = id; desenhar(); },
        }, h('strong', null, titulo), h('span', null, texto), extra)));
    };
    desenhar();
    return caixa;
  };

  const botao = h('button', { type: 'submit', class: 'btn grande' }, 'Nascer');
  const inicios = grupo('inicio', [
    ['nascimento', 'Ao nascer', 'Viva a infância e a juventude, escolha atividades e enfrente eventos. O seu perfil de modelo nasce de como você viver.'],
    ['aos18', 'Aos 18 anos', 'Pule a infância e comece direto na carreira, escolhendo o perfil.'],
  ]);
  const blocoPerfil = h('div', { class: 'bloco-perfil' });
  const desenharPerfil = () => {
    if (form.inicio !== 'aos18') { blocoPerfil.replaceChildren(); return; }
    blocoPerfil.replaceChildren(h('h3', null, 'Perfil'), perfis,
      h('p', { class: 'dica' }, `Todas começam como novatas, com ${ATRIBUTOS.length} atributos entre 40 e 52. O perfil dá um empurrão em alguns deles e decide quais pesam mais no overall.`));
  };
  inicios.addEventListener('click', () => { desenharPerfil(); botao.textContent = form.inicio === 'nascimento' ? 'Nascer' : 'Começar a carreira'; });
  const perfis = grupo('perfil', Object.entries(PERFIS).map(([id, p]) => {
    const fortes = Object.entries(p.bonus).filter(([, v]) => v > 4).map(([a]) => ROTULOS[a]).join(', ');
    return [id, p.nome, PERFIL_TEXTO[id], h('em', null, `Ponto forte: ${fortes}`)];
  }));
  const dificuldades = grupo('dificuldade', Object.entries(DIFICULDADES).map(([id, d]) => [id, d.nome, DIFICULDADE_TEXTO[id]]));
  const slotsOpcoes = grupo('slot', SLOTS.map((n) => {
    const meta = lerMeta(n);
    return [n, `Jogo ${n}`, meta ? `Substitui o jogo de ${meta.nome}` : 'Vazio'];
  }));

  return h('main', { class: 'pagina criacao' },
    masthead(true),
    h('form', {
      class: 'cartao formulario',
      onSubmit: (ev) => {
        ev.preventDefault();
        const meta = lerMeta(form.slot);
        if (meta && !confirm(`O jogo ${form.slot} guarda a carreira de ${meta.nome}. Substituir?`)) return;
        const s = Number.parseInt(semente.value, 10);
        iniciarCarreira({
          nome: nome.value, origem: origem.value, perfil: form.perfil, dificuldade: form.dificuldade,
          semente: Number.isInteger(s) && s > 0 ? s : undefined, slot: form.slot, inicio: form.inicio,
        });
      },
    },
      h('h2', null, 'Nova modelo'),
      h('div', { class: 'campos' },
        h('label', { for: 'nome' }, 'Nome', nome),
        h('label', { for: 'origem' }, 'Cidade de origem', origem)),
      h('h3', null, 'Começar'), inicios, blocoPerfil,
      h('h3', null, 'Dificuldade'), dificuldades,
      h('h3', null, 'Salvar em'), slotsOpcoes,
      h('details', { class: 'avancado' },
        h('summary', null, 'Opções avançadas'),
        h('label', { for: 'semente' }, 'Semente da carreira (a mesma semente gera a mesma história)', semente)),
      h('div', { class: 'acoes' },
        h('button', { type: 'button', class: 'btn fantasma', onClick: () => { ctx.tela = 'inicio'; ctx.render(); } }, 'Voltar'),
        botao)));
}
