// Eventos com escolhas e consequências de longo prazo.
//
// A memória guarda "flags" com prazo de validade (em semanas). Decisões de anos atrás liberam eventos
// futuros: quem aceitou um ensaio ousado pode enfrentar um escândalo, quem manteve uma marca em polêmica
// pode ser alvo de boicote, e assim por diante.

import { limitar as limitarAttr, calcularOverall } from './atributos.js';
import { MARCAS, FOTOGRAFOS } from './mundo.js';
import { DIFICULDADES } from './config.js';
import { inflacao } from './vida.js';
import { ajustarRelacao } from './relacoes.js';
import { rivalMaisQuente, rivalPorId } from './rivais.js';
import { registrarEvento } from './mercado.js';
import { temFlag, marcarFlag } from './memoria.js';
import { EVENTOS_VIDA, abrirProximoEventoDeVida } from './eventos-vida.js';
import { registrarDiario } from './pessoa.js';

import { SEMANAS_POR_ANO } from './memoria.js';
const arred50 = (v) => Math.round(v / 50) * 50;
const limitar = (v, min, max) => Math.max(min, Math.min(max, v));

// ---------- Memória ----------
// (as flags ficam em memoria.js, compartilhadas com os eventos da vida pessoal)

export { temFlag, marcarFlag };

const ganharFama = (estado, v) => {
  estado.fama = limitar(estado.fama + v, 0, 100);
};
const mudarAtributo = (estado, attr, delta) => {
  estado.atributos[attr] = limitarAttr(estado.atributos[attr] + delta);
  estado.overall = calcularOverall(estado.atributos, estado.perfil);
};
const garantia = (estado) => estado.contrato?.garantiaSemanal ?? 500;
const marcaAleatoria = (rng, minimo, maximo = 100) =>
  rng.escolher(MARCAS.filter((m) => m.prestigio >= minimo && m.prestigio <= maximo));
const profissionalOuAlt = (estado) => estado.fase !== 'regional';
const exclusividadeAtiva = (estado) => estado.extras.some((e) => e.tipo === 'exclusividade');

// ---------- Catálogo ----------
// tipo: 'positivo' | 'negativo' | 'neutro'  (negativos pesam mais nas dificuldades altas)
// padraoAuto: escolha segura usada no modo automático

export const EVENTOS = [
  {
    id: 'ensaio-ousado',
    titulo: 'Convite para um ensaio ousado',
    tipo: 'neutro',
    peso: 3,
    condicao: (e) => profissionalOuAlt(e) && e.fama >= 15 && !temFlag(e, 'ensaio_ousado'),
    preparar: (e, rng) => ({ fotografo: rng.escolher(FOTOGRAFOS) }),
    texto: (e, c) => `${c.fotografo} quer fazer um ensaio conceitual e provocativo com você. Pode render muita visibilidade, mas seu agente e a direção da agência torcem o nariz.`,
    padraoAuto: 'recusar',
    escolhas: [
      {
        id: 'aceitar',
        texto: 'Aceitar o ensaio',
        aplicar(e, rng, c) {
          ganharFama(e, 4);
          ajustarRelacao(e, 'midia', 6);
          ajustarRelacao(e, 'fotografos', 6);
          ajustarRelacao(e, 'agente', -5);
          ajustarRelacao(e, 'direcao', -3);
          marcarFlag(e, 'ensaio_ousado', 4 * SEMANAS_POR_ANO, { fotografo: c.fotografo });
          return 'O ensaio bombou nas redes. Seu agente ficou desconfortável com a exposição.';
        },
      },
      {
        id: 'recusar',
        texto: 'Recusar educadamente',
        aplicar(e) {
          ajustarRelacao(e, 'fotografos', -3);
          ajustarRelacao(e, 'agente', 2);
          return 'Você recusou. O fotógrafo entendeu, mas a porta ficou um pouco mais fechada.';
        },
      },
    ],
  },
  {
    id: 'exclusividade-grife',
    titulo: 'Proposta de exclusividade',
    tipo: 'positivo',
    peso: 2,
    condicao: (e) => e.fase === 'profissional' && e.fama >= 35 && !exclusividadeAtiva(e),
    preparar: (e, rng) => {
      const marca = marcaAleatoria(rng, 70);
      return { marca: marca.nome, semanal: arred50((200 + e.fama * 20 + e.overall * 5) * inflacao(e)) };
    },
    texto: (e, c) => `${c.marca} quer exclusividade por 3 temporadas, pagando R$ ${c.semanal} por semana. Em troca, você aparece menos para o resto do mercado.`,
    padraoAuto: 'assinar',
    escolhas: [
      {
        id: 'assinar',
        texto: 'Assinar a exclusividade',
        aplicar(e, rng, c) {
          e.extras.push({ tipo: 'exclusividade', marca: c.marca, semanal: c.semanal, semanasRestantes: 3 * SEMANAS_POR_ANO, famaMult: 0.8 });
          marcarFlag(e, `exclusiva_${c.marca}`, null);
          ajustarRelacao(e, 'estilistas', 3);
          return `Contrato assinado com ${c.marca}. A renda extra é boa, mas sua fama cresce mais devagar enquanto durar.`;
        },
      },
      {
        id: 'recusar',
        texto: 'Manter a liberdade',
        aplicar(e) {
          ajustarRelacao(e, 'estilistas', 1);
          return 'Você manteve a agenda aberta para todas as marcas.';
        },
      },
    ],
  },
  {
    id: 'boato-rival',
    titulo: 'Boato plantado por uma rival',
    tipo: 'negativo',
    peso: 3,
    condicao: (e) => rivalMaisQuente(e, 30) !== null,
    preparar: (e) => ({ rival: rivalMaisQuente(e, 30).id, rivalNome: rivalMaisQuente(e, 30).nome }),
    texto: (e, c) => `Corre nos bastidores um boato de que você é difícil de trabalhar. A fonte parece ser ${c.rivalNome}, com quem a rivalidade já esquentou.`,
    padraoAuto: 'ignorar',
    escolhas: [
      {
        id: 'responder',
        texto: 'Responder em público',
        aplicar(e, rng, c) {
          const rival = rivalPorId(e, c.rival);
          if (rival) rival.intensidade = limitar(rival.intensidade + 8, 0, 100);
          if (rng.chance(0.5)) {
            ajustarRelacao(e, 'midia', 4);
            return 'Sua resposta foi aplaudida e o boato perdeu força.';
          }
          ajustarRelacao(e, 'midia', -6);
          return 'A resposta saiu pior do que o boato e virou notícia por conta própria.';
        },
      },
      {
        id: 'ignorar',
        texto: 'Ignorar',
        aplicar(e, rng, c) {
          const rival = rivalPorId(e, c.rival);
          if (rival) rival.intensidade = limitar(rival.intensidade - 3, 0, 100);
          ajustarRelacao(e, 'bastidores', -1);
          ajustarRelacao(e, 'midia', -2);
          return 'Você ignorou e o assunto esfriou, deixando uma pequena marca nos bastidores.';
        },
      },
      {
        id: 'midia',
        texto: 'Contar sua versão para a mídia',
        aplicar(e, rng, c) {
          const rival = rivalPorId(e, c.rival);
          if (rival) rival.intensidade = limitar(rival.intensidade + 2, 0, 100);
          if (e.atributos.profissionalismo >= 60) {
            ajustarRelacao(e, 'midia', 6);
            return 'Sua postura profissional virou a notícia, e o boato ficou para trás.';
          }
          ajustarRelacao(e, 'midia', -4);
          return 'A entrevista deixou dúvidas e a imprensa insistiu no assunto.';
        },
      },
    ],
  },
  {
    id: 'recuperacao-lesao',
    titulo: 'Recuperação da lesão',
    tipo: 'neutro',
    peso: 6,
    urgente: true,
    condicao: (e) => Boolean(e.lesao) && e.lesao.semanasRestantes >= 3 && !temFlag(e, 'decidiu_lesao'),
    preparar: () => ({}),
    texto: (e) => `Faltam ${e.lesao.semanasRestantes} semanas de recuperação, mas a agenda está cheia. Dá para voltar mais cedo, com risco de recaída.`,
    padraoAuto: 'descansar',
    escolhas: [
      {
        id: 'voltar',
        texto: 'Voltar mais cedo',
        aplicar(e) {
          e.lesao.semanasRestantes = 1;
          mudarAtributo(e, 'saude', -1);
          marcarFlag(e, 'recaida_risco', 8);
          marcarFlag(e, 'decidiu_lesao', 8);
          return 'Você voltou rápido. Nas próximas semanas o risco de nova lesão fica mais alto.';
        },
      },
      {
        id: 'descansar',
        texto: 'Respeitar a recuperação completa',
        aplicar(e) {
          mudarAtributo(e, 'saude', 1);
          marcarFlag(e, 'decidiu_lesao', 8);
          return 'Você se recuperou direito e voltou mais forte.';
        },
      },
    ],
  },
  {
    id: 'reality-novela',
    titulo: 'Convite para reality ou novela',
    tipo: 'neutro',
    peso: 1.5,
    condicao: (e) => profissionalOuAlt(e) && e.fama >= 50 && e.idade >= 21 && !temFlag(e, 'reality'),
    preparar: (e) => ({ cache: arred50(garantia(e) * 8) }),
    texto: (e, c) => `Uma emissora convidou você para um programa de grande audiência, com cachê de R$ ${c.cache}. A moda de alto nível pode torcer o nariz para quem vira "celebridade de TV".`,
    padraoAuto: 'recusar',
    escolhas: [
      {
        id: 'aceitar',
        texto: 'Aceitar o convite',
        aplicar(e, rng, c) {
          ganharFama(e, 6);
          e.dinheiro += c.cache;
          ajustarRelacao(e, 'midia', 8);
          ajustarRelacao(e, 'estilistas', -8);
          marcarFlag(e, 'reality', 2 * SEMANAS_POR_ANO);
          return 'A audiência foi enorme, mas parte do mundo da moda ficou com um pé atrás.';
        },
      },
      {
        id: 'recusar',
        texto: 'Seguir focada na moda',
        aplicar(e) {
          ajustarRelacao(e, 'estilistas', 2);
          ajustarRelacao(e, 'agente', -1);
          return 'Você manteve o foco na passarela e nas campanhas.';
        },
      },
    ],
  },
  {
    id: 'marca-polemica',
    titulo: 'Marca em polêmica',
    tipo: 'neutro',
    peso: 2,
    condicao: (e) => e.fase === 'profissional' && e.fama >= 25 && !temFlag(e, 'marca_polemica'),
    preparar: (e, rng) => {
      const marca = marcaAleatoria(rng, 40);
      return { marca: marca.nome, bonus: arred50(garantia(e) * 10) };
    },
    texto: (e, c) => `${c.marca} está no centro de uma polêmica, mas oferece um bônus de R$ ${c.bonus} para você continuar na campanha.`,
    padraoAuto: 'romper',
    escolhas: [
      {
        id: 'manter',
        texto: 'Manter a campanha e receber o bônus',
        aplicar(e, rng, c) {
          e.dinheiro += c.bonus;
          ajustarRelacao(e, 'midia', -6);
          marcarFlag(e, 'marca_polemica', 3 * SEMANAS_POR_ANO, { marca: c.marca });
          return 'O dinheiro entrou, mas sua imagem ficou associada à polêmica.';
        },
      },
      {
        id: 'romper',
        texto: 'Romper o contrato',
        aplicar(e) {
          ajustarRelacao(e, 'direcao', -4);
          ajustarRelacao(e, 'midia', 3);
          ajustarRelacao(e, 'estilistas', -2);
          return 'Você saiu da campanha. A agência reclamou, mas o público gostou da postura.';
        },
      },
    ],
  },
  {
    id: 'escandalo-ensaio',
    titulo: 'Fotos do ensaio viralizam',
    tipo: 'negativo',
    peso: 6,
    condicao: (e) => temFlag(e, 'ensaio_ousado') && !temFlag(e, 'escandalo_visto'),
    preparar: (e) => ({ fotografo: e.memoria.flags.ensaio_ousado.dados.fotografo ?? 'o fotógrafo' }),
    texto: (e, c) => `Imagens do ensaio com ${c.fotografo}, tiradas de contexto, viralizaram e estão rendendo críticas. É o lado ruim daquela decisão.`,
    padraoAuto: 'nota',
    escolhas: [
      {
        id: 'nota',
        texto: 'Divulgar uma nota pública',
        aplicar(e) {
          ajustarRelacao(e, 'midia', -2);
          ganharFama(e, 1);
          marcarFlag(e, 'escandalo_visto', 5 * SEMANAS_POR_ANO);
          return 'A nota esclareceu o contexto e o assunto perdeu força em poucos dias.';
        },
      },
      {
        id: 'processar',
        texto: 'Acionar a Justiça contra quem distorceu',
        aplicar(e) {
          e.dinheiro -= arred50(5000 * inflacao(e));
          ajustarRelacao(e, 'fotografos', -10);
          ajustarRelacao(e, 'midia', 3);
          marcarFlag(e, 'escandalo_visto', 5 * SEMANAS_POR_ANO);
          return 'O processo custou caro e esfriou a relação com fotógrafos, mas mostrou firmeza.';
        },
      },
      {
        id: 'passar',
        texto: 'Deixar passar',
        aplicar(e) {
          ajustarRelacao(e, 'midia', -5);
          ajustarRelacao(e, 'bastidores', -2);
          marcarFlag(e, 'escandalo_visto', 5 * SEMANAS_POR_ANO);
          return 'O silêncio deixou a polêmica correr solta por semanas.';
        },
      },
    ],
  },
  {
    id: 'boicote-marca',
    titulo: 'Boicote à marca da polêmica',
    tipo: 'negativo',
    peso: 6,
    condicao: (e) => temFlag(e, 'marca_polemica') && !temFlag(e, 'boicote_visto'),
    preparar: (e) => ({ marca: e.memoria.flags.marca_polemica.dados.marca ?? 'a marca' }),
    texto: (e, c) => `Consumidores iniciaram um boicote a ${c.marca}, e seu nome está sendo citado por ter mantido a campanha.`,
    padraoAuto: 'pedido',
    escolhas: [
      {
        id: 'pedido',
        texto: 'Fazer um pedido público de desculpas',
        aplicar(e) {
          ajustarRelacao(e, 'midia', 2);
          e.dinheiro -= arred50(2000 * inflacao(e));
          marcarFlag(e, 'boicote_visto', 4 * SEMANAS_POR_ANO);
          return 'O pedido de desculpas custou uma assessoria de imprensa, mas segurou os danos.';
        },
      },
      {
        id: 'agenda',
        texto: 'Mudar de agenda e se afastar da marca',
        aplicar(e) {
          ajustarRelacao(e, 'estilistas', -3);
          ganharFama(e, -2);
          marcarFlag(e, 'boicote_visto', 4 * SEMANAS_POR_ANO);
          return 'Você se afastou da marca e perdeu algumas oportunidades no processo.';
        },
      },
      {
        id: 'aguardar',
        texto: 'Aguardar a poeira baixar',
        aplicar(e) {
          ajustarRelacao(e, 'midia', -6);
          ganharFama(e, -3);
          marcarFlag(e, 'boicote_visto', 4 * SEMANAS_POR_ANO);
          return 'A poeira demorou a baixar, e a imagem pública ficou arranhada.';
        },
      },
    ],
  },
  {
    id: 'mentoria',
    titulo: 'Oferta de mentoria',
    tipo: 'positivo',
    peso: 2,
    condicao: (e) => profissionalOuAlt(e) && e.fama >= 55 && e.idade >= 24 && !temFlag(e, 'mentoria'),
    preparar: () => ({}),
    texto: () => 'Uma ex-supermodelo respeitada se ofereceu para ser sua mentora por uma temporada. Vai exigir tempo e energia.',
    padraoAuto: 'aceitar',
    escolhas: [
      {
        id: 'aceitar',
        texto: 'Aceitar a mentoria',
        aplicar(e) {
          mudarAtributo(e, 'profissionalismo', 2);
          mudarAtributo(e, 'expressao', 1);
          e.cansaco = limitar(e.cansaco + 10, 0, 100);
          ajustarRelacao(e, 'bastidores', 3);
          marcarFlag(e, 'mentoria', 5 * SEMANAS_POR_ANO);
          return 'As conversas com a mentora renderam lições valiosas e abriram portas.';
        },
      },
      {
        id: 'recusar',
        texto: 'Agradecer e recusar',
        aplicar() {
          return 'Você agradeceu e seguiu seu caminho sozinha.';
        },
      },
    ],
  },
  {
    id: 'esgotamento',
    titulo: 'Esgotamento',
    tipo: 'negativo',
    peso: 6,
    urgente: true,
    condicao: (e) => e.cansaco >= 70 && !temFlag(e, 'esgotamento_recente'),
    preparar: () => ({}),
    texto: () => 'Você está exausta depois de semanas seguidas de agenda lotada. Seu corpo está pedindo uma pausa.',
    padraoAuto: 'pausa',
    escolhas: [
      {
        id: 'pausa',
        texto: 'Fazer uma pausa de 2 semanas',
        aplicar(e) {
          e.lesao = { semanasRestantes: 2 };
          e.cansaco = 0;
          mudarAtributo(e, 'saude', 1);
          marcarFlag(e, 'esgotamento_recente', 12);
          return 'A pausa fez bem: você volta descansada, mas perde duas semanas de agenda.';
        },
      },
      {
        id: 'continuar',
        texto: 'Continuar no ritmo',
        aplicar(e) {
          mudarAtributo(e, 'saude', -2);
          marcarFlag(e, 'recaida_risco', 6);
          marcarFlag(e, 'esgotamento_recente', 12);
          return 'Você insistiu, e o corpo cobrou: a saúde caiu e o risco de lesão aumentou.';
        },
      },
    ],
  },
  {
    id: 'festa-bastidores',
    titulo: 'Festa antes de um grande desfile',
    tipo: 'neutro',
    peso: 2,
    condicao: (e) => profissionalOuAlt(e),
    preparar: () => ({}),
    texto: () => 'As modelos da agência combinaram uma festa na véspera de um grande trabalho. Todo mundo vai.',
    padraoAuto: 'ficar',
    escolhas: [
      {
        id: 'ir',
        texto: 'Ir à festa',
        aplicar(e, rng) {
          ajustarRelacao(e, 'bastidores', 5);
          e.cansaco = limitar(e.cansaco + 12, 0, 100);
          if (rng.chance(0.2)) {
            ajustarRelacao(e, 'midia', -3);
            return 'A festa uniu o grupo, mas uma foto sua circulou do jeito errado.';
          }
          return 'A festa fortaleceu a amizade com as colegas.';
        },
      },
      {
        id: 'ficar',
        texto: 'Descansar em casa',
        aplicar(e) {
          ajustarRelacao(e, 'bastidores', -1);
          e.cansaco = limitar(e.cansaco - 8, 0, 100);
          return 'Você dormiu cedo e acordou descansada.';
        },
      },
    ],
  },
  {
    id: 'beneficente',
    titulo: 'Desfile beneficente',
    tipo: 'positivo',
    peso: 2,
    condicao: (e) => profissionalOuAlt(e) && e.fama >= 20,
    preparar: () => ({}),
    texto: () => 'Convidaram você para um desfile beneficente. Não paga nada e tem custos de produção, mas dá visibilidade positiva.',
    padraoAuto: 'aceitar',
    escolhas: [
      {
        id: 'aceitar',
        texto: 'Participar',
        aplicar(e) {
          e.dinheiro -= arred50(1500 * inflacao(e));
          ajustarRelacao(e, 'midia', 6);
          ajustarRelacao(e, 'bastidores', 2);
          ganharFama(e, 2);
          return 'O evento foi um sucesso e sua imagem saiu fortalecida.';
        },
      },
      {
        id: 'recusar',
        texto: 'Recusar',
        aplicar(e) {
          ajustarRelacao(e, 'agente', -1);
          return 'Você recusou por conta da agenda.';
        },
      },
    ],
  },
  {
    id: 'campanha-dupla',
    titulo: 'Campanha dupla com uma rival',
    tipo: 'neutro',
    peso: 2,
    condicao: (e) => rivalMaisQuente(e, 20) !== null,
    preparar: (e) => ({ rival: rivalMaisQuente(e, 20).id, rivalNome: rivalMaisQuente(e, 20).nome }),
    texto: (e, c) => `A marca quer você e ${c.rivalNome} juntas numa campanha. Dá para cooperar ou transformar em competição.`,
    padraoAuto: 'cooperar',
    escolhas: [
      {
        id: 'cooperar',
        texto: 'Cooperar e dividir os holofotes',
        aplicar(e, rng, c) {
          const rival = rivalPorId(e, c.rival);
          if (rival) rival.intensidade = limitar(rival.intensidade - 10, 0, 100);
          ganharFama(e, 2);
          ajustarRelacao(e, 'bastidores', 2);
          ajustarRelacao(e, 'midia', 2);
          return 'A parceria surpreendeu e a rivalidade esfriou.';
        },
      },
      {
        id: 'competir',
        texto: 'Competir pelo destaque',
        aplicar(e, rng, c) {
          const rival = rivalPorId(e, c.rival);
          if (rival) rival.intensidade = limitar(rival.intensidade + 6, 0, 100);
          if (rng.chance(0.5)) {
            ganharFama(e, 3);
            ajustarRelacao(e, 'estilistas', 2);
            return 'Você roubou a cena e a marca adorou.';
          }
          ajustarRelacao(e, 'estilistas', -2);
          return 'A rival levou o destaque e a rivalidade ficou mais acirrada.';
        },
      },
    ],
  },
  {
    id: 'embaixadora',
    titulo: 'Proposta de embaixadora',
    tipo: 'positivo',
    peso: 2,
    condicao: (e) => e.relacoes.midia >= 55 && e.fama >= 30 && !e.extras.some((x) => x.tipo === 'embaixadora'),
    preparar: (e, rng) => {
      const marca = marcaAleatoria(rng, 40, 75);
      return { marca: marca.nome, semanal: arred50((150 + e.relacoes.midia * 8 + e.fama * 8) * inflacao(e)) };
    },
    texto: (e, c) => `${c.marca} quer você como embaixadora por 2 temporadas, pagando R$ ${c.semanal} por semana.`,
    padraoAuto: 'aceitar',
    escolhas: [
      {
        id: 'aceitar',
        texto: 'Aceitar',
        aplicar(e, rng, c) {
          e.extras.push({ tipo: 'embaixadora', marca: c.marca, semanal: c.semanal, semanasRestantes: 2 * SEMANAS_POR_ANO, famaMult: 1 });
          ajustarRelacao(e, 'midia', 3);
          return `Você é a nova embaixadora de ${c.marca}.`;
        },
      },
      {
        id: 'recusar',
        texto: 'Recusar',
        aplicar() {
          return 'Você recusou a proposta.';
        },
      },
    ],
  },
  {
    id: 'critica-moda',
    titulo: 'Crítica ácida de um colunista',
    tipo: 'negativo',
    peso: 3,
    condicao: (e) => profissionalOuAlt(e) && e.fama >= 20,
    preparar: () => ({}),
    texto: () => 'Um colunista de moda publicou uma crítica ácida sobre seu último desfile. O texto está circulando.',
    padraoAuto: 'elegancia',
    escolhas: [
      {
        id: 'elegancia',
        texto: 'Responder com elegância',
        aplicar(e) {
          if (e.atributos.carisma >= 60) {
            ajustarRelacao(e, 'midia', 4);
            return 'Seu carisma transformou a crítica em simpatia.';
          }
          ajustarRelacao(e, 'midia', -2);
          return 'A resposta soou forçada e não ajudou muito.';
        },
      },
      {
        id: 'ignorar',
        texto: 'Ignorar',
        aplicar(e) {
          ajustarRelacao(e, 'midia', -1);
          return 'Você ignorou e o assunto morreu em poucos dias.';
        },
      },
    ],
  },
  {
    id: 'treino-intensivo',
    titulo: 'Curso intensivo',
    tipo: 'positivo',
    peso: 2,
    condicao: (e) => profissionalOuAlt(e) && e.dinheiro >= 6000 * inflacao(e),
    preparar: (e, rng) => ({
      atributo: rng.escolher(['passarela', 'fotogenia', 'expressao', 'carisma']),
      custo: arred50(4000 * inflacao(e)),
    }),
    texto: (e, c) => `Uma escola renomada oferece um curso intensivo de ${c.atributo} por R$ ${c.custo}. Exige dedicação, mas pode compensar.`,
    padraoAuto: 'aceitar',
    escolhas: [
      {
        id: 'aceitar',
        texto: 'Fazer o curso',
        aplicar(e, rng, c) {
          e.dinheiro -= c.custo;
          mudarAtributo(e, c.atributo, 2);
          e.cansaco = limitar(e.cansaco + 10, 0, 100);
          return `O curso melhorou seu ${c.atributo}.`;
        },
      },
      {
        id: 'recusar',
        texto: 'Não agora',
        aplicar() {
          return 'Você deixou o curso para outra hora.';
        },
      },
    ],
  },
];

// ---------- Sorteio e resolução ----------

// Tenta abrir um evento ao fim de uma semana. Só na carreira profissional e no circuito alternativo.
export function tentarEvento(estado, rng) {
  if (estado.fase === 'regional' || estado.pendencia) return null;
  if (estado.eventoCooldown > 0) return null;

  const cfg = DIFICULDADES[estado.dificuldade];
  const elegiveis = EVENTOS.filter((ev) => ev.condicao(estado));
  if (elegiveis.length === 0) return null;

  // Eventos urgentes (lesão, esgotamento) aparecem quase sempre; os demais, de vez em quando.
  const urgentes = elegiveis.filter((ev) => ev.urgente);
  const probabilidade = urgentes.length > 0 ? 0.5 : 0.08;
  if (!rng.chance(probabilidade)) return null;

  const pool = urgentes.length > 0 ? urgentes : elegiveis;
  const pesos = pool.map((ev) => ev.peso * (ev.tipo === 'negativo' ? cfg.eventosNegativos : 1));
  const total = pesos.reduce((a, b) => a + b, 0);
  let sorteio = rng.proximo() * total;
  let escolhido = pool[0];
  for (let i = 0; i < pool.length; i++) {
    sorteio -= pesos[i];
    if (sorteio <= 0) {
      escolhido = pool[i];
      break;
    }
  }

  const ctx = escolhido.preparar(estado, rng);
  estado.eventoCooldown = 3;
  estado.pendencia = {
    tipo: 'evento',
    evento: {
      id: escolhido.id,
      titulo: escolhido.titulo,
      natureza: escolhido.tipo,
      texto: escolhido.texto(estado, ctx),
      ctx,
      escolhas: escolhido.escolhas.map((c) => ({ id: c.id, texto: c.texto })),
      padraoAuto: escolhido.padraoAuto,
    },
  };
  return estado.pendencia.evento;
}

export function resolverEvento(estado, rng, escolhaId) {
  const pend = estado.pendencia;
  if (pend?.tipo !== 'evento') throw new Error('Não há evento pendente.');
  const def = [...EVENTOS, ...EVENTOS_VIDA].find((e) => e.id === pend.evento.id);
  const escolha = def.escolhas.find((c) => c.id === escolhaId);
  if (!escolha) throw new Error(`Escolha inválida para o evento ${def.id}: ${escolhaId}`);

  estado.pendencia = null;
  const resultado = escolha.aplicar(estado, rng, pend.evento.ctx);
  estado.memoria.decisoes.push({ evento: def.id, escolha: escolhaId, temporada: estado.temporada, semana: estado.semana });
  if (def.vida) {
    registrarDiario(estado, `${def.titulo}: ${resultado}`, 'evento');
    abrirProximoEventoDeVida(estado, rng);
  } else {
    registrarEvento(estado, 'evento', `${def.titulo}: ${escolha.texto}. ${resultado}`);
  }
  return { evento: def.id, escolha: escolhaId, resultado };
}

// Modo automático: segue a escolha segura na maior parte das vezes, variando às vezes.
export function escolhaAutomatica(estado, rng) {
  const ev = estado.pendencia.evento;
  if (rng.chance(0.7)) return ev.padraoAuto;
  return rng.escolher(ev.escolhas).id;
}
