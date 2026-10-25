// Contexto compartilhado entre as telas: o jogo em andamento e o estado da interface.
export const ctx = {
  jogo: null, // { estado, rng, slot }
  tela: 'inicio', // 'inicio' | 'criacao' | 'jogo'
  ui: {
    aba: 'semana',
    selecao: new Set(), // ofertas marcadas na semana
    ultimo: null, // registro da última semana simulada
    modal: null, // modal de aviso (resumo da temporada, resultado de evento, revelação da Seleção...)
  },
  render: () => {},
};
