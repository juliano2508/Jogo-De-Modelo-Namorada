// Ponto de entrada: desenha a tela atual e guarda a posição de rolagem entre redesenhos.

import { ctx } from './ctx.js';
import { telaInicio, telaCriacao, masthead } from './inicio.js';
import { h } from './util.js';
import { telaJogo } from './jogo.js';

const raiz = document.getElementById('app');
let ultimaTela = null;

// Se algo inesperado quebrar o desenho, mostra um aviso com saída para o menu em vez de uma tela em branco.
function telaDeErro(erro) {
  console.error(erro);
  return h('main', { class: 'pagina' },
    masthead(true),
    h('section', { class: 'cartao' },
      h('h2', null, 'Algo deu errado'),
      h('p', null, 'O jogo encontrou um problema inesperado. Seu progresso até a última ação está salvo.'),
      h('div', { class: 'acoes' }, h('button', { class: 'btn grande', onClick: () => { ctx.tela = 'inicio'; ctx.jogo = null; ctx.render(); } }, 'Voltar ao menu'))));
}

ctx.render = () => {
  const antes = window.scrollY;
  let nova;
  try {
    nova = ctx.tela === 'criacao' ? telaCriacao() : ctx.tela === 'jogo' && ctx.jogo ? telaJogo() : telaInicio();
  } catch (erro) {
    nova = telaDeErro(erro);
  }
  raiz.replaceChildren(nova);
  const chave = `${ctx.tela}:${ctx.ui.aba}`;
  window.scrollTo(0, chave === ultimaTela ? antes : 0);
  ultimaTela = chave;
  const foco = nova.querySelector('.modal button:not([disabled])');
  if (foco && !nova.querySelector('.modal.larga')) foco.focus({ preventScroll: true });
};

window.addEventListener('error', (e) => console.error('Erro não tratado:', e.error ?? e.message));
ctx.render();
