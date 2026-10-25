// Parâmetros de balanceamento do jogo. Mexa aqui para calibrar sem tocar na lógica.

// Cada fase da carreira tem seu próprio mercado.
export const FASES = {
  regional: {
    nome: 'Circuito regional',
    semanas: 20, // simulação mais rápida, como a faculdade no basquete
    prestigioMax: 35, // só clientes locais
    multiplicadorCache: 0.3,
    custoBasico: 150, // mora com a família
  },
  alternativo: {
    nome: 'Circuito alternativo',
    semanas: 20,
    prestigioMax: 60,
    multiplicadorCache: 0.5,
    custoBasico: 250,
  },
  profissional: {
    nome: 'Carreira profissional',
    semanas: 40,
    prestigioMax: 100,
    multiplicadorCache: 1,
    custoBasico: 450,
  },
};

// Níveis de dificuldade. Eventos negativos só entram na Fase 3.
export const DIFICULDADES = {
  facil: { nome: 'Fácil', ruidoOlheiros: 2, riscoLesao: 0.6, eventosNegativos: 0.5 },
  normal: { nome: 'Normal', ruidoOlheiros: 5, riscoLesao: 1, eventosNegativos: 1 },
  dificil: { nome: 'Difícil', ruidoOlheiros: 9, riscoLesao: 1.5, eventosNegativos: 1.6 },
};

// Quanto a agência fica do cachê, por tier.
export const COMISSAO_POR_TIER = { 1: 0.15, 2: 0.18, 3: 0.2, 4: 0.25 };

// Agências maiores pagam garantia semanal maior.
export const FATOR_GARANTIA_TIER = { 1: 1.15, 2: 1, 3: 0.9, 4: 0.7 };

// Bônus de acesso a clientes de maior prestígio, por tier da agência.
export const BONUS_ACESSO_POR_TIER = { 1: 15, 2: 8, 3: 3, 4: 0 };

// Despesas fixas
export const PERCENTUAL_AGENTE = 0.05; // fora do circuito regional
export const INFLACAO_ANUAL = 0.03;

// Faixas de imposto sobre a receita semanal: [limite, alíquota marginal]
export const FAIXAS_IMPOSTO = [
  [700, 0],
  [1400, 0.075],
  [2300, 0.15],
  [3500, 0.225],
  [Infinity, 0.275],
];

export const DINHEIRO_INICIAL = 800;
