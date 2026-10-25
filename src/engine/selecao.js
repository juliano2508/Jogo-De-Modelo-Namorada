// Noite da Seleção: as 30 agências escolhem entre as novatas (2 rodadas, 60 escolhas, 120 candidatas).
// As agências mais fracas escolhem primeiro; cada uma pondera avaliação e necessidade de perfil.

import { DIFICULDADES } from './config.js';
import { gerarNovatas } from './liga.js';
import { inflacao } from './vida.js';
import {
  garantiaDeRookie, criarContrato, entrarFase, entrarNoAlternativo, registrarEvento,
} from './mercado.js';

export const RODADAS = 2;

// Avaliação que as agências enxergam da jogadora: overall + um pouco de fama e destaques da temporada.
function avaliacaoDaJogadora(snapshot) {
  return snapshot.overall + snapshot.fama * 0.15 + snapshot.destaques * 0.1;
}

// Executa a noite inteira e devolve cada escolha em ordem (a interface pode revelar uma a uma, com suspense).
// São 120 candidatas (119 novatas e a jogadora) para 60 vagas: metade fica de fora.
export function executarSelecao(estado, rng) {
  if (!estado.snapshotSelecao) throw new Error('Sem dados de fim de temporada para a Seleção.');
  const cfg = DIFICULDADES[estado.dificuldade];

  const novatas = gerarNovatas(rng, 119).map((n) => ({ ...n, avaliacao: n.overall }));
  const jogadora = {
    id: 'jogadora',
    nome: estado.nome,
    perfil: estado.perfil,
    overall: estado.snapshotSelecao.overall,
    avaliacao: avaliacaoDaJogadora(estado.snapshotSelecao),
    jogadora: true,
  };
  const candidatas = [...novatas, jogadora];

  // Ordem: agências mais fracas primeiro, com um sorteio para não ser sempre igual.
  const ordem = Object.values(estado.liga.agencias)
    .map((a) => ({ a, k: a.forca + rng.inteiro(0, 15) }))
    .sort((x, y) => x.k - y.k)
    .map((x) => x.a);

  const noite = [];
  let posicao = 1;
  for (let rodada = 1; rodada <= RODADAS; rodada++) {
    for (const agencia of ordem) {
      let melhor = -1;
      let melhorValor = -Infinity;
      candidatas.forEach((c, i) => {
        // Cada agência vê a candidata com um ruído (a precisão dos olheiros depende da dificuldade).
        const percebido = c.avaliacao + rng.normal(0, cfg.ruidoOlheiros);
        const necessidade = agencia.necessidades[c.perfil] ?? 0.5;
        const valor = percebido + necessidade * 8;
        if (valor > melhorValor) {
          melhorValor = valor;
          melhor = i;
        }
      });
      const [escolhida] = candidatas.splice(melhor, 1);
      agencia.necessidades[escolhida.perfil] = Math.max(0, Math.round((agencia.necessidades[escolhida.perfil] - 0.35) * 100) / 100);
      noite.push({
        posicao,
        rodada,
        agenciaId: agencia.id,
        agenciaNome: agencia.nome,
        agenciaTier: agencia.tier,
        nome: escolhida.nome,
        perfil: escolhida.perfil,
        jogadora: Boolean(escolhida.jogadora),
      });
      posicao++;
    }
  }

  const escolha = noite.find((e) => e.jogadora) ?? null;
  return { noite, escolhida: Boolean(escolha), escolha, naoEscolhidas: candidatas.length };
}

// Aplica o resultado: contrato de novata se foi escolhida.
function aplicarResultado(estado, rng, resultado) {
  estado.ultimaSelecao = resultado.escolha
    ? { posicao: resultado.escolha.posicao, agencia: resultado.escolha.agenciaNome }
    : { posicao: null, agencia: null };

  if (!resultado.escolha) {
    registrarEvento(estado, 'selecao', `${estado.nome} não foi escolhida na Noite da Seleção.`);
    return null;
  }

  const { posicao, rodada, agenciaId } = resultado.escolha;
  const melhor = estado.carreira.melhorPosicaoSelecao;
  estado.carreira.melhorPosicaoSelecao = melhor === null ? posicao : Math.min(melhor, posicao);
  const agencia = estado.liga.agencias[agenciaId];
  const contrato = criarContrato({
    duracao: rodada === 1 ? 3 : 2,
    garantiaSemanal: garantiaDeRookie(posicao, inflacao(estado)),
    tier: agencia.tier,
  });
  entrarFase(estado, rng, 'profissional', { agencia, contrato });
  registrarEvento(estado, 'selecao', `${estado.nome} foi a escolha nº ${posicao} da Seleção, por ${agencia.nome} (garantia de R$ ${contrato.garantiaSemanal}/semana).`);
  return contrato;
}

// Depois da 1ª temporada regional a jogadora decide: ir à Seleção agora ou ficar mais um ano.
export function decidirSelecao(estado, rng, escolha) {
  if (estado.pendencia?.tipo !== 'decisao-selecao') throw new Error('Não há decisão de Seleção pendente.');
  if (!['ir', 'ficar'].includes(escolha)) throw new Error('Escolha "ir" ou "ficar".');
  estado.pendencia = null;
  if (escolha === 'ficar') {
    registrarEvento(estado, 'selecao', `${estado.nome} decidiu ficar mais um ano no circuito regional.`);
    return { ficou: true };
  }
  const resultado = executarSelecao(estado, rng);
  aplicarResultado(estado, rng, resultado);
  // Se não for escolhida, volta ao regional por mais um ano (sem ir ao alternativo ainda).
  return resultado;
}

// Seleção obrigatória: fim da 2ª temporada regional, ou a cada ano no circuito alternativo.
export function confirmarSelecao(estado, rng) {
  if (estado.pendencia?.tipo !== 'selecao') throw new Error('Não há Seleção pendente.');
  estado.pendencia = null;
  const resultado = executarSelecao(estado, rng);
  const contrato = aplicarResultado(estado, rng, resultado);
  if (!contrato && estado.fase === 'regional') entrarNoAlternativo(estado, rng);
  return resultado;
}
