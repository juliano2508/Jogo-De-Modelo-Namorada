// Sistema Vida: onde a modelo gasta o dinheiro, o que cada gasto devolve e o que acontece no vermelho.
// Regras: custos reais, retorno decrescente em cada categoria e despesas fixas que crescem.

import { FASES, COMISSAO_POR_TIER, PERCENTUAL_AGENTE, INFLACAO_ANUAL, FAIXAS_IMPOSTO } from './config.js';

// Custos por semana de jogo, por nível.
export const CATEGORIAS_VIDA = {
  moradia: {
    nome: 'Moradia',
    niveis: [
      { nome: 'Casa da família', custo: 0 },
      { nome: 'Quarto compartilhado', custo: 350 },
      { nome: 'Apartamento simples', custo: 900 },
      { nome: 'Apartamento bom', custo: 2000 },
      { nome: 'Cobertura', custo: 4500 },
    ],
  },
  transporte: {
    nome: 'Transporte',
    niveis: [
      { nome: 'Transporte público', custo: 0 },
      { nome: 'Aplicativo', custo: 150 },
      { nome: 'Carro popular', custo: 500 },
      { nome: 'Carro bom', custo: 1200 },
      { nome: 'Carro de luxo', custo: 3000 },
    ],
  },
  equipe: {
    nome: 'Equipe pessoal',
    niveis: [
      { nome: 'Sem equipe', custo: 0 },
      { nome: 'Assessora meio período', custo: 300 },
      { nome: 'Assessora e treinadora', custo: 900 },
      { nome: 'Equipe com estilista', custo: 2000 },
      { nome: 'Equipe completa', custo: 4500 },
    ],
  },
  estilo: {
    nome: 'Estilo e guarda-roupa',
    niveis: [
      { nome: 'Guarda-roupa básico', custo: 0 },
      { nome: 'Peças selecionadas', custo: 200 },
      { nome: 'Estilo cuidado', custo: 600 },
      { nome: 'Grife ocasional', custo: 1500 },
      { nome: 'Alta-costura', custo: 4000 },
    ],
  },
  pet: {
    nome: 'Pet',
    niveis: [
      { nome: 'Sem pet', custo: 0 },
      { nome: 'Pet', custo: 120 },
    ],
  },
  relacionamento: {
    nome: 'Relacionamento',
    niveis: [
      { nome: 'Solteira', custo: 0 },
      { nome: 'Namoro simples', custo: 150 },
      { nome: 'Relacionamento sério', custo: 500 },
      { nome: 'Vida de casal de celebridade', custo: 1500 },
    ],
  },
};

export const CATEGORIAS = Object.keys(CATEGORIAS_VIDA);

export function criarVidaInicial() {
  return { moradia: 0, transporte: 0, equipe: 0, estilo: 0, pet: 0, relacionamento: 0, tipoRelacionamento: null };
}

export const nivelMaximo = (categoria) => CATEGORIAS_VIDA[categoria].niveis.length - 1;
export const custoDoNivel = (categoria, nivel) => CATEGORIAS_VIDA[categoria].niveis[nivel].custo;

// Retorno decrescente: o 1º nível rende muito, o 4º quase nada a mais.
const beneficio = (nivel) => 1 - 0.6 ** nivel;

export function efeitosVida(vida) {
  return {
    chance: 0.06 * beneficio(vida.equipe) + 0.03 * beneficio(vida.estilo),
    fama: 0.1 * beneficio(vida.equipe) + 0.12 * beneficio(vida.estilo),
    custoEnergia: 0.08 * beneficio(vida.transporte),
    recuperacao: 3 * beneficio(vida.moradia) + (vida.pet ? 1 : 0) + 2 * beneficio(vida.relacionamento),
    lesao: 0.1 * beneficio(vida.relacionamento) + 0.1 * beneficio(vida.moradia),
  };
}

export const inflacao = (estado) => (1 + INFLACAO_ANUAL) ** (estado.temporada - 1);

export function custoSemanalVida(estado) {
  let total = 0;
  for (const c of CATEGORIAS) total += custoDoNivel(c, estado.vida[c]);
  return Math.round(total * inflacao(estado));
}

export function custoBasico(estado) {
  return Math.round(FASES[estado.fase].custoBasico * inflacao(estado));
}

// Muda o nível de uma categoria. Subir custa uma taxa única (2x o custo semanal do novo nível).
export function mudarVida(estado, categoria, nivel, tipoRelacionamento = null) {
  if (!CATEGORIAS_VIDA[categoria]) throw new Error(`Categoria inválida: ${categoria}`);
  if (!Number.isInteger(nivel) || nivel < 0 || nivel > nivelMaximo(categoria)) {
    throw new Error(`Nível inválido para ${categoria}: ${nivel}`);
  }
  if (categoria === 'moradia' && estado.fase !== 'regional' && nivel < 1) {
    throw new Error('Fora do circuito regional a moradia mínima é o quarto compartilhado.');
  }
  if (categoria === 'relacionamento' && nivel > 0 && !['homem', 'mulher'].includes(tipoRelacionamento ?? estado.vida.tipoRelacionamento)) {
    throw new Error('Informe o tipo de relacionamento: "homem" ou "mulher".');
  }

  const atual = estado.vida[categoria];
  let taxa = 0;
  if (nivel > atual) {
    taxa = Math.round(2 * custoDoNivel(categoria, nivel) * inflacao(estado));
    if (estado.dinheiro < taxa) throw new Error('Dinheiro insuficiente para essa mudança.');
    estado.dinheiro -= taxa;
  }
  estado.vida[categoria] = nivel;
  if (categoria === 'relacionamento') {
    estado.vida.tipoRelacionamento = nivel === 0 ? null : tipoRelacionamento ?? estado.vida.tipoRelacionamento;
  }
  return { taxa };
}

// No vermelho por muito tempo, o padrão de vida cai à força: o gasto mais pesado é o primeiro a baixar.
export function rebaixarVidaForcado(estado) {
  let alvo = null;
  let maior = 0;
  for (const c of CATEGORIAS) {
    const nivel = estado.vida[c];
    const minimo = c === 'moradia' && estado.fase !== 'regional' ? 1 : 0;
    if (nivel > minimo && custoDoNivel(c, nivel) > maior) {
      maior = custoDoNivel(c, nivel);
      alvo = c;
    }
  }
  if (!alvo) return null;
  estado.vida[alvo] -= 1;
  if (alvo === 'relacionamento' && estado.vida.relacionamento === 0) estado.vida.tipoRelacionamento = null;
  return alvo;
}

// As faixas acompanham a inflação (o valor da receita é trazido para o preço do 1º ano).
export function calcularImposto(receita, infl = 1) {
  const base = receita / infl;
  let imposto = 0;
  let anterior = 0;
  for (const [limite, aliquota] of FAIXAS_IMPOSTO) {
    const faixa = Math.max(0, Math.min(base, limite) - anterior);
    imposto += faixa * aliquota;
    anterior = limite;
    if (base <= limite) break;
  }
  return Math.round(imposto * infl);
}

// Fecha as contas da semana: receita, comissão, agente, imposto, família, custo de vida e juros.
export function liquidarSemana(estado, cachesBrutos) {
  const infl = inflacao(estado);
  const garantia = estado.contrato?.garantiaSemanal ?? 0;
  const comissaoPct = estado.contrato?.comissao ?? COMISSAO_POR_TIER[estado.agencia.tier];

  const comissao = Math.round(cachesBrutos * comissaoPct);
  const agente = estado.fase === 'regional' ? 0 : Math.round((cachesBrutos + garantia) * PERCENTUAL_AGENTE);
  const receita = cachesBrutos - comissao + garantia - agente;
  const imposto = calcularImposto(receita, infl);
  const familia = estado.fase === 'regional' ? 0 : Math.round((60 + estado.fama * 5) * infl + Math.max(0, receita) * 0.04);
  const basico = custoBasico(estado);
  const vida = custoSemanalVida(estado);
  const juros = estado.dinheiro < 0 ? Math.round(-estado.dinheiro * 0.01) : 0;

  const liquido = receita - imposto - familia - basico - vida - juros;
  estado.dinheiro += liquido;

  // Tempo no vermelho: juros, pressão e, depois de 6 semanas, corte forçado de padrão de vida.
  let rebaixou = null;
  if (estado.dinheiro < 0) {
    estado.semanasNoVermelho += 1;
    if (estado.semanasNoVermelho >= 6) {
      rebaixou = rebaixarVidaForcado(estado);
      estado.semanasNoVermelho = 3;
    }
  } else {
    estado.semanasNoVermelho = 0;
  }

  return {
    cachesBrutos, comissao, garantia, agente, receita, imposto, familia, basico, vida, juros,
    liquido, saldo: estado.dinheiro, rebaixou,
  };
}
