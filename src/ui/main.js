// Ponto de entrada: desenha a tela atual e guarda a posição de rolagem entre redesenhos.

import { ctx } from './ctx.js';
import { telaInicio, telaCriacao } from './inicio.js';
import { telaJogo } from './jogo.js';

const raiz = document.getElementById('app');
let ultimaTela = null;

ctx.render = () => {
  const antes = window.scrollY;
  const nova = ctx.tela === 'criacao' ? telaCriacao() : ctx.tela === 'jogo' && ctx.jogo ? telaJogo() : telaInicio();
  raiz.replaceChildren(nova);
  const chave = `${ctx.tela}:${ctx.ui.aba}`;
  window.scrollTo(0, chave === ultimaTela ? antes : 0);
  ultimaTela = chave;
  const foco = nova.querySelector('.modal button:not([disabled])');
  if (foco && !nova.querySelector('.modal.larga')) foco.focus({ preventScroll: true });
};

window.addEventListener('error', (e) => console.error('Erro não tratado:', e.error ?? e.message));
ctx.render();
