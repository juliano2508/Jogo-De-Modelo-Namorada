export { criarRng } from './rng.js';
export * from './atributos.js';
export * from './mundo.js';
export * from './config.js';
export { criarLiga, atualizarLiga, gerarNovatas } from './liga.js';
export { criarJogo, capacidadeDeEnergia } from './modelo.js';
export {
  TIPOS,
  semanaDeModa,
  calcularChance,
  custoReal,
  gerarAgenda,
  escolherAutomatico,
  simularSemana,
  avancarTemporada,
} from './semana.js';
export {
  CATEGORIAS_VIDA,
  CATEGORIAS,
  criarVidaInicial,
  efeitosVida,
  mudarVida,
  custoSemanalVida,
  calcularImposto,
  liquidarSemana,
} from './vida.js';
export {
  garantiaDeMercado,
  garantiaDeRookie,
  gerarPropostas,
  escolherProposta,
  verificarTroca,
  verificarChamada,
} from './mercado.js';
export { executarSelecao, decidirSelecao, confirmarSelecao } from './selecao.js';
export {
  CHAVES_RELACAO,
  ROTULOS_RELACAO,
  criarRelacoes,
  ajustarRelacao,
  efeitosRelacoes,
  patrocinioSemanal,
} from './relacoes.js';
export {
  criarRivais,
  rankingDaTemporada,
  rivalMaisQuente,
  famaDaRival,
} from './rivais.js';
export {
  EVENTOS,
  temFlag,
  marcarFlag,
  tentarEvento,
  resolverEvento,
  escolhaAutomatica,
} from './eventos.js';
export {
  MARCOS,
  CAMINHOS_POS_CARREIRA,
  verificarMarcos,
  calcularPontos,
  classificar,
  pautaAposentadoria,
  aposentar,
  decidirAposentadoria,
  resumoDeCarreira,
} from './carreira.js';
export {
  POLITICAS_VIDA,
  resolverPendenciaAuto,
  ajustarVidaAuto,
  simularCarreira,
} from './auto.js';
export {
  CLASSES, STATS_PESSOAIS, ROTULOS_STATS, criarPessoa, registrarDiario, parentesco, irmaos, familiaViva,
} from './pessoa.js';
export { ATIVIDADES, atividadesDisponiveis, fazerAtividade, tempoLivreDoAno } from './atividades.js';
export { EVENTOS_VIDA, aplicarFx } from './eventos-vida.js';
export {
  emVida, iniciarVida, avancarAnoDeVida, iniciarCarreiraDeModelo, perfilEmergente, atividadesAutomaticas,
} from './anos.js';
