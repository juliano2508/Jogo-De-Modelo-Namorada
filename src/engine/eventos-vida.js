// Eventos da vida pessoal (estilo BitLife): infância, adolescência e, depois, a vida adulta.
// Mesmo formato dos eventos da carreira, com uma pequena linguagem de efeitos ("fx") para não repetir código.
//
// Cada ano da vida sorteia alguns eventos; cada um vira uma pendência com escolhas. As decisões deixam
// marcas (flags) que liberam eventos futuros, como o olheiro que procura a família e a agência que cobra taxa.

import { DIFICULDADES } from './config.js';
import { temFlag, marcarFlag } from './memoria.js';
import {
  STATS_PESSOAIS, CLASSES, mudarStat, ganharAfinidade, mexerNaFamilia, parentesco, irmaos, familiaViva,
  conhecerAmigo, registrarDiario,
} from './pessoa.js';

const prim = (nome) => (nome ?? '').split(' ')[0];
const nomeDe = (e, papel, padrao) => prim(parentesco(e, papel)?.nome) || padrao;
const mae = (e) => nomeDe(e, 'mae', 'sua mãe');
const pai = (e) => nomeDe(e, 'pai', 'seu pai');
const avo = (e) => nomeDe(e, 'avo', 'sua avó');
const amigoAleatorio = (e, rng) => (e.pessoa.amigos.length ? rng.escolher(e.pessoa.amigos) : null);

// Aplica o pacote de efeitos de uma escolha.
//   stats: { felicidade: 3, estudos: -2 }   afin: { passarela: 2 }   familia: { mae: 4, pai: -2, irmaos: 3, avo: 2 }
//   amigos: 4 (todos os amigos)   novoAmigo: true   flag: 'chave' | ['a', 'b']   dinheiro: -100
export function aplicarFx(e, rng, fx = {}) {
  for (const stat of STATS_PESSOAIS) if (fx[stat]) mudarStat(e, stat, fx[stat]);
  for (const [perfil, n] of Object.entries(fx.afin ?? {})) ganharAfinidade(e, perfil, n);
  for (const [alvo, delta] of Object.entries(fx.familia ?? {})) {
    if (alvo === 'irmaos') irmaos(e).forEach((i) => mexerNaFamilia(e, i.id, delta));
    else mexerNaFamilia(e, alvo, delta);
  }
  if (fx.amigos) for (const a of e.pessoa.amigos) a.relacao = Math.max(0, Math.min(100, a.relacao + fx.amigos));
  if (fx.novoAmigo) conhecerAmigo(e, rng);
  if (fx.dinheiro) e.dinheiro += fx.dinheiro;
  for (const f of [fx.flag].flat().filter(Boolean)) marcarFlag(e, f, null);
}

// Atalho para montar uma escolha com efeitos fixos e um texto de resultado.
const esc = (id, texto, resultado, fx = {}) => ({
  id,
  texto,
  aplicar(e, rng, c) {
    aplicarFx(e, rng, fx);
    return typeof resultado === 'function' ? resultado(e, c) : resultado;
  },
});

const classeNome = (e) => CLASSES[e.pessoa.classe].nome;

// ---------- Catálogo ----------
// tipo: 'positivo' | 'negativo' | 'neutro'. idadeExata força o evento nessa idade; os demais são sorteados
// dentro de idadeMin..idadeMax. Por padrão cada evento acontece uma vez só na vida (unico: false repete).

export const EVENTOS_VIDA = [
  // ----- Marcos fixos -----
  {
    id: 'nascimento', titulo: 'Você nasceu', tipo: 'neutro', peso: 1, idadeExata: 0,
    texto: (e) => {
      const m = parentesco(e, 'mae');
      const p = parentesco(e, 'pai');
      const irm = irmaos(e).length;
      return `Você nasceu em ${e.origem}, em uma ${classeNome(e)}. ${prim(m.nome)}, sua mãe, trabalha como ${m.profissao}. ${p.ausente ? `${prim(p.nome)}, seu pai, não está por perto.` : `${prim(p.nome)}, seu pai, é ${p.profissao}.`} ${irm ? `Você tem ${irm === 1 ? 'um irmão ou irmã' : `${irm} irmãos`} por perto.` : 'Você é filha única.'} A família ${e.pessoa.sobrenome} tem uma nova integrante.`;
    },
    padraoAuto: 'ok',
    escolhas: [esc('ok', 'Começar a viver', 'Sua história começa agora.')],
  },
  {
    id: 'primeiro-dia-escola', titulo: 'Primeiro dia de aula', tipo: 'neutro', peso: 1, idadeExata: 6,
    texto: (e) => `Hoje é o seu primeiro dia na escola. ${mae(e)} arrumou sua mochila e tirou uma foto na porta de casa. A sala é grande, cheia de gente que você nunca viu.`,
    padraoAuto: 'corajosa',
    escolhas: [
      esc('corajosa', 'Entrar de cabeça erguida e se apresentar', 'Você levantou a mão e se apresentou para a turma. Gostaram de você.', { estudos: 3, social: 4, novoAmigo: true }),
      esc('timida', 'Ficar agarrada na mãe', (e) => `Você demorou a soltar a mão de ${mae(e)}, mas ela ficou ali até você se acalmar.`, { felicidade: -2, familia: { mae: 4 }, social: 1 }),
      esc('observar', 'Sentar no fundo e observar tudo', 'Você preferiu observar. Aos poucos, uma colega puxou assunto.', { criatividade: 3, social: 1, novoAmigo: true }),
    ],
  },
  {
    id: 'conversa-sobre-futuro', titulo: 'E depois do colégio?', tipo: 'neutro', peso: 1, idadeExata: 17,
    texto: (e) => {
      const base = `Está chegando o último ano de escola. ${mae(e)} e ${pai(e)} querem conversar sobre o seu futuro.`;
      if (temFlag(e, 'olheiro_contato')) return `${base} A moda já bateu na sua porta: a agência de ${e.origem} continua interessada, e a família está dividida.`;
      return `${base} A moda vem chamando você mais alto do que qualquer outra coisa, mas a família quer segurança.`;
    },
    padraoAuto: 'dupla',
    escolhas: [
      esc('moda', 'Apostar tudo na carreira de modelo', (e) => `Você disse que vai tentar. ${mae(e)} respirou fundo e apoiou, mesmo com medo.`, { felicidade: 5, disciplina: 2, familia: { mae: -2, pai: -2 }, flag: 'apostou_na_moda' }),
      esc('dupla', 'Tentar a moda e fazer faculdade ao mesmo tempo', 'Você prometeu que não vai largar os estudos. Seus pais ficaram mais tranquilos.', { estudos: 4, familia: { mae: 4, pai: 3 }, flag: 'prometeu_estudar' }),
      esc('tempo', 'Pedir um tempo para pensar', 'Você disse que ainda não sabe. Ninguém insistiu, mas a pergunta ficou no ar.', { felicidade: -1 }),
    ],
  },

  // ----- Infância -----
  {
    id: 'brincadeira-favorita', titulo: 'A brincadeira preferida', tipo: 'positivo', peso: 3, idadeMin: 3, idadeMax: 7,
    texto: () => 'Na hora de brincar, você sempre acaba escolhendo a mesma coisa. Qual é a sua brincadeira favorita?',
    padraoAuto: 'desfilar',
    escolhas: [
      esc('desfilar', 'Desfilar pela sala com as roupas da mamãe', 'Você desfilou pelo corredor com os sapatos da família. Foi um sucesso.', { afin: { passarela: 2 }, criatividade: 2, felicidade: 3 }),
      esc('desenhar', 'Desenhar e inventar vestidos', 'Você encheu o caderno de vestidos e personagens.', { afin: { editorial: 2 }, criatividade: 4, felicidade: 2 }),
      esc('turma', 'Brincar com a turma toda', 'Você virou a organizadora das brincadeiras da rua.', { afin: { comercial: 2 }, social: 4, novoAmigo: true }),
      esc('correr', 'Correr e jogar bola', 'Você voltou para casa suada e feliz.', { afin: { versatil: 1 }, saude: 4, disciplina: 2 }),
    ],
  },
  {
    id: 'festa-de-aniversario', titulo: 'Festa de aniversário', tipo: 'positivo', peso: 3, idadeMin: 4, idadeMax: 11,
    texto: (e) => `Seu aniversário está chegando e ${mae(e)} perguntou como você quer comemorar${e.pessoa.classe === 'humilde' ? ' (com um bolo caseiro e a casa cheia, como sempre)' : ''}.`,
    padraoAuto: 'amigos',
    escolhas: [
      esc('amigos', 'Uma festa com a turma da escola', 'A casa lotou de crianças e o parabéns foi o mais barulhento do ano.', { social: 4, felicidade: 4, amigos: 5 }),
      esc('familia', 'Um almoço só com a família', (e) => `Você passou o dia com ${mae(e)}, ${pai(e)} e o resto da família.`, { felicidade: 3, familia: { mae: 5, pai: 4, avo: 5, irmaos: 4 } }),
      esc('fantasia', 'Uma festa a fantasia', 'Você apareceu de rainha e deu uma volta completa, só para todo mundo ver.', { afin: { editorial: 2, passarela: 1 }, criatividade: 3, felicidade: 4 }),
    ],
  },
  {
    id: 'gripe-forte', titulo: 'Gripe forte', tipo: 'negativo', peso: 2, idadeMin: 2, idadeMax: 12,
    texto: () => 'Você acordou com febre e dor no corpo. A semana de provas está começando.',
    padraoAuto: 'descansar',
    escolhas: [
      esc('descansar', 'Ficar em casa e se recuperar', (e) => `${mae(e)} cuidou de você com chá e sopa. Em três dias você já estava boa.`, { saude: 2, familia: { mae: 4 }, estudos: -1 }),
      esc('insistir', 'Ir para a escola mesmo assim', 'Você fez a prova com febre. Passou, mas passou mal.', { estudos: 2, saude: -6, felicidade: -2 }),
    ],
  },
  {
    id: 'briga-no-recreio', titulo: 'Confusão no recreio', tipo: 'negativo', peso: 2, idadeMin: 7, idadeMax: 12,
    texto: () => 'Um colega empurrou você no recreio e a turma toda parou para ver o que você ia fazer.',
    padraoAuto: 'professora',
    escolhas: [
      esc('revidar', 'Revidar', 'Você revidou. Foi parar na diretoria, e a bronca em casa foi grande.', { disciplina: -4, social: -2, familia: { mae: -3, pai: -3 } }),
      esc('professora', 'Chamar a professora', 'A professora resolveu a situação e o colega pediu desculpas.', { disciplina: 2, felicidade: 1 }),
      esc('ignorar', 'Ignorar e sair andando', 'Você saiu de cabeça erguida. Algumas pessoas notaram a sua calma.', { disciplina: 3, social: 1, felicidade: -1 }),
    ],
  },
  {
    id: 'aula-de-danca', titulo: 'Uma aula experimental de dança', tipo: 'positivo', peso: 3, idadeMin: 5, idadeMax: 10,
    texto: (e) => `${mae(e)} viu um cartaz de uma escola de dança no bairro e ficou imaginando se você gostaria de fazer uma aula experimental.`,
    padraoAuto: 'aceitar',
    escolhas: [
      esc('aceitar', 'Topar na hora', 'Você amou. Voltou para casa fazendo giros pelo corredor e pediu para voltar na semana seguinte.', { afin: { passarela: 3 }, disciplina: 3, saude: 3, felicidade: 4, flag: 'fez_danca' }),
      esc('recusar', 'Dizer que não quer', 'Você preferiu ficar em casa. Quem sabe mais tarde.', { felicidade: 1 }),
    ],
  },
  {
    id: 'peca-de-teatro', titulo: 'A peça da escola', tipo: 'positivo', peso: 3, idadeMin: 6, idadeMax: 12,
    texto: () => 'A escola vai montar uma peça de fim de ano. A professora perguntou quem quer participar.',
    padraoAuto: 'papel',
    escolhas: [
      {
        id: 'protagonista', texto: 'Fazer o teste para a protagonista',
        aplicar(e, rng) {
          const deu = e.pessoa.stats.social + e.pessoa.stats.criatividade + rng.inteiro(-30, 30) > 100;
          if (deu) { mudarStat(e, 'felicidade', 6); ganharAfinidade(e, 'editorial', 3); return 'Você ganhou o papel principal e brilhou no palco. A plateia aplaudiu de pé.'; }
          mudarStat(e, 'felicidade', -2); ganharAfinidade(e, 'editorial', 1);
          return 'Não ficou com a protagonista, mas a professora elogiou a sua coragem.';
        },
      },
      esc('papel', 'Pegar um papel pequeno', 'Você teve poucas falas, mas cada uma foi caprichada.', { afin: { editorial: 2 }, criatividade: 3, social: 2, felicidade: 2 }),
      esc('bastidores', 'Ajudar nos bastidores', 'Você cuidou dos figurinos e descobriu que adora ver tudo funcionando.', { afin: { versatil: 2 }, criatividade: 4, disciplina: 2 }),
    ],
  },
  {
    id: 'ciume-do-irmao', titulo: 'Ciúme em casa', tipo: 'negativo', peso: 2, idadeMin: 4, idadeMax: 11,
    condicao: (e) => irmaos(e).length > 0,
    preparar: (e, rng) => ({ irmao: rng.escolher(irmaos(e)).id }),
    texto: (e, c) => { const i = e.pessoa.familia.find((f) => f.id === c.irmao); return `${prim(i.nome)} ganhou toda a atenção da família esta semana e você sentiu ciúme.`; },
    padraoAuto: 'conversar',
    escolhas: [
      esc('conversar', 'Conversar sobre o que sentiu', (e, c) => `Você e ${prim(e.pessoa.familia.find((f) => f.id === c.irmao).nome)} conversaram e fizeram as pazes.`, { disciplina: 1, felicidade: 1 }),
      esc('brigar', 'Brigar com o irmão', (e, c) => `A briga foi feia e vocês ficaram sem se falar por dias.`, { felicidade: -3, familia: { irmaos: -8, mae: -2 } }),
      esc('chamar', 'Chamar para brincar junto', (e, c) => `Brincaram até a hora do jantar e a rivalidade acabou ali.`, { felicidade: 3, familia: { irmaos: 8 } }),
    ],
  },
  {
    id: 'viagem-em-familia', titulo: 'Viagem em família', tipo: 'positivo', peso: 2, idadeMin: 5, idadeMax: 12,
    texto: (e) => `A família ${e.pessoa.sobrenome} decidiu viajar nas férias. ${e.pessoa.classe === 'humilde' ? 'Vai ser uma viagem curta e econômica, mas a primeira da vida toda.' : 'Todo mundo está animado com os preparativos.'}`,
    padraoAuto: 'curtir',
    escolhas: [
      esc('curtir', 'Curtir cada minuto', 'Foi uma viagem inesquecível. Você voltou com a mala cheia de histórias.', { felicidade: 6, familia: { mae: 5, pai: 5, avo: 4, irmaos: 5 } }),
      esc('fotos', 'Passar a viagem tirando fotos', 'Você tirou fotos de tudo, até de quem não queria. Algumas ficaram lindas.', { afin: { editorial: 2 }, criatividade: 4, felicidade: 3 }),
    ],
  },
  {
    id: 'nota-ruim', titulo: 'Nota vermelha', tipo: 'negativo', peso: 2, idadeMin: 8, idadeMax: 13,
    texto: () => 'Você tirou uma nota baixa em uma prova importante. O boletim sai amanhã.',
    padraoAuto: 'contar',
    escolhas: [
      esc('contar', 'Contar para os pais antes do boletim', (e) => `${mae(e)} ficou chateada, mas gostou da sua sinceridade. Vocês montaram um plano de estudos.`, { estudos: 3, disciplina: 3, familia: { mae: 3 } }),
      esc('esconder', 'Esconder o boletim', 'A verdade apareceu. A bronca foi maior por ter escondido.', { estudos: -2, felicidade: -3, familia: { mae: -6, pai: -4 } }),
      esc('estudar', 'Estudar em silêncio para recuperar', 'Você se trancou no quarto e recuperou a nota no bimestre seguinte.', { estudos: 6, disciplina: 4, felicidade: -2 }),
    ],
  },
  {
    id: 'amiga-nova', titulo: 'Uma amizade começa', tipo: 'positivo', peso: 3, idadeMin: 5, idadeMax: 12,
    preparar: (e, rng) => ({ amigo: conhecerAmigo(e, rng, 'escola').id }),
    texto: (e, c) => `${prim(e.pessoa.amigos.find((a) => a.id === c.amigo).nome)} sentou ao seu lado na aula e dividiu o lanche com você.`,
    padraoAuto: 'casa',
    escolhas: [
      esc('casa', 'Convidar para brincar na sua casa', (e) => `${mae(e)} gostou da nova amiga. A casa nunca esteve tão animada.`, { social: 4, felicidade: 4, familia: { mae: 2 }, amigos: 5 }),
      esc('escola', 'Continuar amigas só na escola', 'A amizade segue tranquila, no recreio e na sala.', { social: 2 }),
    ],
  },
  {
    id: 'mudanca-de-escola', titulo: 'Escola nova', tipo: 'neutro', peso: 2, idadeMin: 7, idadeMax: 13,
    texto: () => 'Por causa de uma mudança da família, você vai ter que trocar de escola no meio do ano.',
    padraoAuto: 'abrir',
    escolhas: [
      esc('abrir', 'Se abrir para conhecer gente nova', 'Foi difícil nas primeiras semanas, mas você acabou fazendo amizades.', { social: 3, felicidade: 1, novoAmigo: true }),
      esc('recolher', 'Ficar na sua até se acostumar', 'Você ficou mais reservada, mas a escola nova virou rotina.', { estudos: 2, felicidade: -3, social: -2 }),
      esc('manter', 'Manter contato com os amigos antigos', 'Vocês continuaram se falando, e a saudade ficou menor.', { felicidade: 1, amigos: 6 }),
    ],
  },
  {
    id: 'pai-ausente', titulo: 'A falta do pai', tipo: 'negativo', peso: 3, idadeMin: 6, idadeMax: 14,
    condicao: (e) => Boolean(parentesco(e, 'pai')?.ausente),
    texto: (e) => `Todos os colegas receberam os pais na reunião da escola. ${pai(e)} não veio, como quase sempre.`,
    padraoAuto: 'conversar',
    escolhas: [
      esc('conversar', 'Conversar com a mãe sobre isso', (e) => `${mae(e)} abraçou você e falou com sinceridade. Doeu, mas ajudou.`, { felicidade: 1, familia: { mae: 6 } }),
      esc('ligar', 'Ligar para o pai', (e) => `${pai(e)} prometeu aparecer mais. Pode ser que cumpra, pode ser que não.`, { felicidade: -1, familia: { pai: 6 } }),
      esc('guardar', 'Guardar para si', 'Você guardou o que sentia e seguiu em frente, um pouco mais fechada.', { felicidade: -4, disciplina: 2 }),
    ],
  },
  {
    id: 'apelido-girafa', titulo: 'O apelido', tipo: 'negativo', peso: 3, idadeMin: 9, idadeMax: 13,
    texto: () => 'Os colegas inventaram um apelido para você por causa do seu jeito de andar e do corpo comprido. Todo mundo riu.',
    padraoAuto: 'humor',
    escolhas: [
      esc('humor', 'Rir junto e responder à altura', 'Você devolveu na hora com humor, e o apelido perdeu a graça.', { afin: { comercial: 2 }, social: 3, felicidade: 1 }),
      esc('mae', 'Contar para a mãe', (e) => `${mae(e)} falou com a escola e te lembrou de que você é muito mais do que um apelido.`, { felicidade: 2, familia: { mae: 5 } }),
      esc('chorar', 'Guardar a mágoa', 'Você chorou escondida. Por semanas evitou se destacar.', { felicidade: -5, social: -3 }),
      esc('encarar', 'Andar com ainda mais postura', 'Você decidiu andar de cabeça erguida. Aos poucos, ficou conhecida pela elegância.', { afin: { passarela: 3 }, disciplina: 2, felicidade: 2, flag: 'virou_postura' }),
    ],
  },
  {
    id: 'animal-de-estimacao', titulo: 'Um novo amigo de quatro patas', tipo: 'positivo', peso: 2, idadeMin: 5, idadeMax: 12,
    texto: () => 'Um cachorrinho apareceu na porta de casa, magro e assustado. Você implorou para ficar com ele.',
    padraoAuto: 'ficar',
    escolhas: [
      esc('ficar', 'Pedir muito para ficar', (e) => `${mae(e)} cedeu. O cachorrinho virou parte da família.`, { felicidade: 6, disciplina: 3, flag: 'tem_animal' }),
      esc('doar', 'Procurar um novo lar para ele', 'Você achou uma família boa para o cachorrinho e ficou orgulhosa.', { felicidade: 2, disciplina: 2 }),
    ],
  },
  {
    id: 'vizinha-costureira', titulo: 'A vizinha costureira', tipo: 'positivo', peso: 3, idadeMin: 6, idadeMax: 13,
    texto: () => 'A vizinha costura vestidos para as clientes do bairro e deixou você brincar com os tecidos e os moldes.',
    padraoAuto: 'aprender',
    escolhas: [
      esc('aprender', 'Pedir para aprender a costurar', 'Você aprendeu a fazer uma barra e uma costura reta. Seu olho para roupa começou a se formar.', { afin: { editorial: 2, versatil: 1 }, criatividade: 5, disciplina: 2, flag: 'sabe_costura' }),
      esc('provar', 'Posar com as roupas prontas', 'Você desfilou com cada vestido enquanto a vizinha ajustava as barras.', { afin: { passarela: 2, comercial: 1 }, social: 2, felicidade: 3 }),
    ],
  },
  {
    id: 'desfile-na-escola', titulo: 'Festa junina e desfile', tipo: 'positivo', peso: 2, idadeMin: 8, idadeMax: 13,
    texto: () => 'A escola vai fazer um desfile no fim do ano e pediu voluntárias para abrir a apresentação.',
    padraoAuto: 'voluntaria',
    escolhas: [
      esc('voluntaria', 'Abrir o desfile', 'O frio na barriga foi enorme, mas você atravessou o pátio com a cabeça erguida. Os professores comentaram por semanas.', { afin: { passarela: 3 }, social: 3, felicidade: 4, flag: 'abriu_desfile' }),
      esc('bastidores', 'Ajudar a organizar', 'Você cuidou da ordem da apresentação e viu tudo de perto.', { afin: { versatil: 2 }, disciplina: 3, social: 2 }),
      esc('plateia', 'Ficar na plateia', 'Você aplaudiu as colegas e tomou nota mentalmente de como se faz.', { criatividade: 2 }),
    ],
  },
  {
    id: 'revista-no-salao', titulo: 'Uma revista no salão', tipo: 'positivo', peso: 3, idadeMin: 9, idadeMax: 15,
    texto: (e) => `Enquanto ${mae(e)} fazia o cabelo no salão, você folheou uma revista de moda e ficou hipnotizada pelas capas.`,
    padraoAuto: 'sonhar',
    escolhas: [
      esc('recortar', 'Recortar as fotos e colar no caderno', 'Seu caderno virou uma colagem de editoriais. Você aprendeu o nome dos fotógrafos e das revistas.', { afin: { editorial: 3 }, criatividade: 4, felicidade: 3, flag: 'sonha_com_moda' }),
      esc('sonhar', 'Imaginar que é você na capa', 'Você passou a tarde sonhando acordada.', { felicidade: 4, criatividade: 2, flag: 'sonha_com_moda' }),
      esc('ignorar', 'Pegar outra coisa para ler', 'A revista foi só uma revista naquele dia.', { estudos: 1 }),
    ],
  },
  {
    id: 'time-da-escola', titulo: 'Seleção da escola', tipo: 'positivo', peso: 2, idadeMin: 9, idadeMax: 15,
    texto: () => 'O professor de educação física está montando os times da escola para o campeonato.',
    padraoAuto: 'entrar',
    escolhas: [
      esc('entrar', 'Entrar para o time', 'Você treinou toda semana e a escola chegou à semifinal.', { saude: 5, disciplina: 4, social: 3, afin: { versatil: 1 }, felicidade: 2 }),
      esc('recusar', 'Preferir outras atividades', 'Você usou a tarde livre do jeito que quis.', { felicidade: 1 }),
    ],
  },
  {
    id: 'professora-incentiva', titulo: 'O elogio da professora', tipo: 'positivo', peso: 2, idadeMin: 8, idadeMax: 16,
    texto: () => 'Uma professora elogiou a sua presença e a sua forma de se comunicar, e sugeriu que você participasse das apresentações da escola.',
    padraoAuto: 'aceitar',
    escolhas: [
      esc('aceitar', 'Aceitar o convite', 'Você apresentou trabalhos e eventos da escola. Ficou mais segura e mais conhecida.', { afin: { comercial: 3 }, social: 4, felicidade: 3 }),
      esc('agradecer', 'Agradecer e ficar de fora', 'Você ficou feliz com o elogio, mas seguiu no seu canto.', { felicidade: 2 }),
    ],
  },

  // ----- Adolescência -----
  {
    id: 'primeiro-celular', titulo: 'Seu primeiro celular', tipo: 'neutro', peso: 3, idadeMin: 11, idadeMax: 14,
    texto: (e) => `${mae(e)} e ${pai(e)} finalmente deram um celular para você. Um mundo novo se abriu na palma da sua mão.`,
    padraoAuto: 'equilibrio',
    escolhas: [
      esc('postar', 'Criar um perfil e postar bastante', 'Seu perfil cresceu rápido, e a atenção também trouxe pressão.', { afin: { comercial: 3, editorial: 1 }, social: 4, felicidade: 1, flag: 'redes_cedo' }),
      esc('equilibrio', 'Usar com moderação', 'Você usou para falar com os amigos e pouco mais. Sobrou tempo para o resto.', { disciplina: 3, estudos: 2, felicidade: 2 }),
      esc('jogos', 'Passar horas em jogos e vídeos', 'As horas voaram. As notas e o sono sentiram.', { felicidade: 2, estudos: -3, saude: -2, criatividade: 1 }),
    ],
  },
  {
    id: 'formatura-fundamental', titulo: 'Formatura do fundamental', tipo: 'positivo', peso: 1, idadeExata: 14,
    texto: (e) => `Terminou o ensino fundamental. ${mae(e)} chorou na cerimônia e a turma toda tirou fotos juntas.`,
    padraoAuto: 'curtir',
    escolhas: [
      esc('curtir', 'Aproveitar a festa com a turma', 'Foi uma noite inesquecível. Você se despediu de muita gente querida.', { felicidade: 5, social: 3, amigos: 6 }),
      esc('discurso', 'Fazer o discurso da turma', 'Você subiu ao palco, falou sem papel e arrancou lágrimas e aplausos.', { afin: { comercial: 2, editorial: 1 }, social: 4, felicidade: 4, familia: { mae: 4, pai: 4 } }),
    ],
  },
  {
    id: 'primeira-paixao', titulo: 'Uma paixão de colégio', tipo: 'neutro', peso: 3, idadeMin: 13, idadeMax: 16,
    texto: () => 'Você começou a reparar muito em um colega da turma. Seu coração acelera toda vez que ele passa.',
    padraoAuto: 'segredo',
    escolhas: [
      {
        id: 'declarar', texto: 'Se declarar',
        aplicar(e, rng) {
          if (rng.chance(0.5)) { mudarStat(e, 'felicidade', 6); mudarStat(e, 'social', 2); return 'Ele sorriu e disse que também gostava de você. Vocês ficaram de mãos dadas no intervalo.'; }
          mudarStat(e, 'felicidade', -4); mudarStat(e, 'disciplina', 2); return 'Ele agradeceu, mas não sentia o mesmo. Doeu, e você aprendeu com isso.';
        },
      },
      esc('segredo', 'Guardar o segredo', 'Você escreveu tudo num caderno e seguiu a vida. O coração se acalmou com o tempo.', { criatividade: 3, felicidade: -1 }),
      esc('amiga', 'Contar só para uma amiga', 'A amiga guardou o segredo e deu os melhores conselhos do mundo.', { amigos: 6, felicidade: 2 }),
    ],
  },
  {
    id: 'festa-da-turma', titulo: 'A festa da turma', tipo: 'neutro', peso: 3, idadeMin: 14, idadeMax: 17,
    texto: () => 'Uma colega vai dar uma festa no sábado. Todo mundo vai, mas a prova da segunda-feira é importante.',
    padraoAuto: 'ir',
    escolhas: [
      esc('ir', 'Ir e aproveitar até o fim', 'A festa foi ótima. A prova nem tanto.', { afin: { comercial: 1 }, social: 5, felicidade: 5, estudos: -2, novoAmigo: true }),
      esc('metade', 'Ir um pouco e voltar cedo', 'Você aproveitou o começo e voltou a tempo de dormir bem.', { social: 3, felicidade: 3, disciplina: 2 }),
      esc('estudar', 'Ficar em casa estudando', 'Você foi muito bem na prova, mas ouviu falar da festa por uma semana.', { estudos: 5, disciplina: 3, social: -2, felicidade: -1 }),
    ],
  },
  {
    id: 'concurso-da-escola', titulo: 'Concurso de talentos', tipo: 'positivo', peso: 3, idadeMin: 13, idadeMax: 17,
    texto: () => 'A escola abriu inscrições para um concurso de talentos. Quem quiser pode se apresentar em frente a todo mundo.',
    padraoAuto: 'passarela',
    escolhas: [
      esc('passarela', 'Apresentar um desfile autoral', 'Você montou o look, a trilha e a sequência. A plateia aplaudiu muito.', { afin: { passarela: 3, editorial: 1 }, criatividade: 3, social: 3, felicidade: 4, flag: 'concurso_desfile' }),
      esc('cantar', 'Apresentar uma música', 'A voz tremeu, mas a emoção chegou até o fundo do ginásio.', { afin: { comercial: 2 }, social: 4, criatividade: 2 }),
      esc('assistir', 'Só assistir', 'Você aplaudiu quem teve coragem e ficou pensando na própria timidez.', { felicidade: 1 }),
    ],
  },
  {
    id: 'ensaio-do-amigo', titulo: 'O ensaio do amigo fotógrafo', tipo: 'positivo', peso: 3, idadeMin: 14, idadeMax: 17,
    condicao: (e) => e.pessoa.amigos.length > 0,
    preparar: (e, rng) => ({ amigo: rng.escolher(e.pessoa.amigos).id }),
    texto: (e, c) => `${prim(e.pessoa.amigos.find((a) => a.id === c.amigo).nome)} está estudando fotografia e pediu para fazer um ensaio com você, de graça, para treinar.`,
    padraoAuto: 'topar',
    escolhas: [
      esc('topar', 'Topar e se divertir', 'As fotos ficaram lindas. Você se viu de um jeito que nunca tinha visto.', { afin: { editorial: 3 }, criatividade: 3, felicidade: 4, social: 2, flag: 'fez_ensaio_amigo' }),
      esc('recusar', 'Ficar com vergonha e recusar', 'Você ficou com vergonha da câmera. O amigo entendeu.', { felicidade: -1 }),
    ],
  },
  {
    id: 'intercambio', titulo: 'Intercâmbio', tipo: 'positivo', peso: 2, idadeMin: 15, idadeMax: 17,
    condicao: (e) => e.pessoa.classe !== 'humilde' && e.pessoa.stats.estudos >= 45,
    texto: (e) => `A escola anunciou um intercâmbio de seis meses. ${e.pessoa.classe === 'confortavel' ? 'A família pode pagar sem grande esforço.' : 'A família teria que apertar o orçamento, mas faria o possível.'}`,
    padraoAuto: 'ir',
    escolhas: [
      esc('ir', 'Ir para o intercâmbio', 'Foram seis meses de aprendizado, saudade e muitas descobertas. Seu inglês melhorou muito e você ganhou outro olhar sobre o mundo.', { afin: { versatil: 4 }, estudos: 4, social: 3, felicidade: 3, familia: { mae: -2, pai: -2 }, flag: 'fez_intercambio' }),
      esc('ficar', 'Ficar em casa', 'Você preferiu ficar perto de quem ama. A decisão foi tranquila.', { familia: { mae: 4, pai: 3 }, felicidade: 1 }),
    ],
  },
  {
    id: 'bico-na-loja', titulo: 'Um bico na loja', tipo: 'neutro', peso: 3, idadeMin: 14, idadeMax: 17,
    texto: () => 'Uma loja de roupas do bairro está precisando de ajuda nos fins de semana e convidou você.',
    padraoAuto: 'aceitar',
    escolhas: [
      esc('aceitar', 'Aceitar o trabalho', 'Você aprendeu a lidar com clientes e a arrumar vitrines. O dinheiro veio devagar.', { afin: { comercial: 3 }, disciplina: 3, social: 2, estudos: -1, dinheiro: 600 }),
      esc('recusar', 'Recusar para focar nos estudos', 'Você ficou com mais tempo para os livros.', { estudos: 3 }),
    ],
  },
  {
    id: 'olheiro', titulo: 'Um olheiro de agência', tipo: 'positivo', peso: 5, idadeMin: 14, idadeMax: 16,
    condicao: (e) => !temFlag(e, 'olheiro_contato'),
    texto: (e) => `Um homem se aproximou de você e de ${mae(e)} no shopping e entregou um cartão: é olheiro de uma agência de modelos. Disse que você tem o perfil e quer conversar com a família.`,
    padraoAuto: 'contato',
    escolhas: [
      esc('contato', 'Passar o contato dos pais', (e) => `${mae(e)} ficou desconfiada, mas anotou o telefone da agência. Você mal dormiu naquela noite.`, { felicidade: 5, flag: 'olheiro_contato' }),
      esc('pesquisar', 'Pegar o cartão e pesquisar antes', (e) => `Você e ${mae(e)} pesquisaram a agência na internet antes de qualquer resposta. Ela existe mesmo, e tem histórico.`, { disciplina: 3, familia: { mae: 3 }, flag: ['olheiro_contato', 'pesquisou_agencia'] }),
      esc('recusar', 'Recusar educadamente', 'Você agradeceu e disse que não estava pronta. O coração ficou batendo forte por horas.', { felicidade: -2, flag: 'olheiro_recusou' }),
    ],
  },
  {
    id: 'olheiro-volta', titulo: 'A agência procura de novo', tipo: 'positivo', peso: 4, idadeMin: 16, idadeMax: 17,
    condicao: (e) => temFlag(e, 'olheiro_recusou') && !temFlag(e, 'olheiro_contato'),
    texto: () => 'Quase um ano depois, uma agência entrou em contato de novo: viram o seu perfil nas redes e querem conhecer você pessoalmente.',
    padraoAuto: 'aceitar',
    escolhas: [
      esc('aceitar', 'Marcar uma conversa', 'Dessa vez você disse sim. A reunião foi simpática e cheia de promessas.', { felicidade: 4, flag: 'olheiro_contato' }),
      esc('recusar', 'Continuar recusando', 'Você manteve a decisão. A moda ainda vai esperar um pouco.', { felicidade: -1 }),
    ],
  },
  {
    id: 'agencia-cobra-taxa', titulo: 'Uma agência pede dinheiro', tipo: 'negativo', peso: 5, idadeMin: 15, idadeMax: 17,
    condicao: (e) => temFlag(e, 'olheiro_contato') && !e.pessoa.eventosVistos.includes('agencia-cobra-taxa'),
    texto: () => 'Depois de elogiar muito o seu perfil, a agência disse que, para cuidar da sua carreira, é preciso pagar um "book profissional" de 3 mil reais. Os pais ficaram sem saber o que fazer.',
    padraoAuto: 'pesquisar',
    escolhas: [
      esc('pagar', 'Pagar a taxa para não perder a chance', (e) => `${mae(e)} e ${pai(e)} pagaram. As fotos ficaram ruins e a agência sumiu. Foi uma lição cara.`, { felicidade: -6, familia: { mae: -6, pai: -6 }, flag: 'caiu_em_golpe' }),
      esc('pesquisar', 'Pesquisar antes de decidir', 'Você descobriu que boas agências não cobram para agenciar. Recusou e ficou com a cabeça mais fria, e mais esperta.', { disciplina: 4, estudos: 2, flag: 'sabe_diferenciar_golpe' }),
      esc('ajuda', 'Pedir ajuda a alguém que entende do mercado', 'Uma conhecida que trabalhou na área explicou como identificar golpes e te indicou uma agência séria da cidade.', { social: 3, disciplina: 2, flag: 'indicada_agencia_seria' }),
    ],
  },
  {
    id: 'comparacao-nas-redes', titulo: 'A pressão das redes', tipo: 'negativo', peso: 3, idadeMin: 13, idadeMax: 17,
    texto: () => 'Você passou a noite vendo perfis de modelos e influenciadoras e saiu se sentindo pequena. A comparação pesa mais do que você esperava.',
    padraoAuto: 'limitar',
    escolhas: [
      esc('limitar', 'Reduzir o tempo de tela e seguir perfis que fazem bem', 'Você limpou seu feed e passou a seguir gente que inspira. O humor melhorou.', { felicidade: 4, disciplina: 3, criatividade: 2 }),
      esc('conversar', 'Conversar com alguém de confiança', (e) => `Você abriu o coração para ${mae(e)}, que ouviu sem julgar e lembrou do que você tem de único.`, { felicidade: 3, familia: { mae: 5 } }),
      esc('continuar', 'Continuar rolando o feed', 'A comparação continuou, e a autoestima foi junto.', { felicidade: -6, social: -1 }),
    ],
  },
  {
    id: 'avo-doente', titulo: 'A avó adoece', tipo: 'negativo', peso: 2, idadeMin: 12, idadeMax: 17,
    condicao: (e) => Boolean(parentesco(e, 'avo')?.vivo),
    texto: (e) => `${avo(e)} está internada e a família se revezando no hospital. Todo mundo está abalado.`,
    padraoAuto: 'visitar',
    escolhas: [
      esc('visitar', 'Visitar todos os dias', (e) => `Você leu histórias e segurou a mão de ${avo(e)}. Ficou muito cansada, mas em paz.`, { felicidade: -2, saude: -2, familia: { avo: 10, mae: 3 }, flag: 'avo_doente' }),
      esc('algumas', 'Visitar quando der', (e) => `Você foi em alguns dias e mandou mensagens carinhosas. ${avo(e)} agradeceu.`, { familia: { avo: 4 }, flag: 'avo_doente' }),
      esc('evitar', 'Evitar o hospital, não aguento ver', 'Você ficou em casa, com o peso de não ter ido.', { felicidade: -5, familia: { avo: -6, mae: -3 }, flag: 'avo_doente' }),
    ],
  },
  {
    id: 'avo-se-recupera', titulo: 'A avó melhora', tipo: 'positivo', peso: 4, idadeMin: 13, idadeMax: 17,
    condicao: (e) => temFlag(e, 'avo_doente') && Boolean(parentesco(e, 'avo')?.vivo),
    texto: (e) => `${avo(e)} teve alta! A família fez um almoço de comemoração.`,
    padraoAuto: 'ok',
    escolhas: [esc('ok', 'Comemorar com todo mundo', 'Foi um dia de abraços longos e de agradecimentos.', { felicidade: 6, familia: { avo: 6, mae: 3, pai: 3, irmaos: 3 } })],
  },
  {
    id: 'aperto-financeiro', titulo: 'Mês apertado', tipo: 'negativo', peso: 3, idadeMin: 10, idadeMax: 17,
    condicao: (e) => e.pessoa.classe === 'humilde',
    texto: (e) => `As contas apertaram em casa. ${mae(e)} está preocupada e fazendo as contas todo dia.`,
    padraoAuto: 'ajudar',
    escolhas: [
      esc('ajudar', 'Ajudar com o que puder em casa', 'Você assumiu algumas tarefas e economizou onde deu. A união da família ficou mais forte.', { disciplina: 4, felicidade: -1, familia: { mae: 6, pai: 4, irmaos: 3 } }),
      esc('pedir', 'Pedir menos coisas e entender a situação', 'Você guardou os pedidos e entendeu o momento. Doeu um pouco.', { disciplina: 3, felicidade: -3, familia: { mae: 4 } }),
      esc('reclamar', 'Reclamar das coisas que não pode ter', 'A reclamação gerou discussão, e a casa ficou pesada.', { felicidade: -4, familia: { mae: -5, pai: -3 } }),
    ],
  },
  {
    id: 'prova-importante', titulo: 'Semana de provas', tipo: 'neutro', peso: 3, idadeMin: 12, idadeMax: 17,
    texto: () => 'A semana de provas chegou, e você tem pouco tempo para estudar tudo.',
    padraoAuto: 'planejar',
    escolhas: [
      esc('planejar', 'Montar um cronograma e seguir', 'Você estudou um pouco por dia, dormiu bem e foi bem em tudo.', { estudos: 5, disciplina: 4, felicidade: 1 }),
      esc('virada', 'Virar a noite estudando na véspera', 'Passou, mas você ficou exausta e irritada.', { estudos: 3, saude: -4, felicidade: -2 }),
      esc('grupo', 'Estudar em grupo com os amigos', 'O grupo se ajudou. Todo mundo passou e riu muito no meio disso.', { estudos: 3, social: 4, felicidade: 3, amigos: 4 }),
    ],
  },
  {
    id: 'briga-de-amigas', titulo: 'Briga entre amigos', tipo: 'negativo', peso: 2, idadeMin: 12, idadeMax: 17,
    condicao: (e) => e.pessoa.amigos.length > 0,
    preparar: (e, rng) => ({ amigo: rng.escolher(e.pessoa.amigos).id }),
    texto: (e, c) => `Você e ${prim(e.pessoa.amigos.find((a) => a.id === c.amigo).nome)} tiveram uma discussão feia por causa de um mal-entendido nas redes.`,
    padraoAuto: 'desculpas',
    escolhas: [
      {
        id: 'desculpas', texto: 'Pedir desculpas primeiro',
        aplicar(e, rng, c) { const a = e.pessoa.amigos.find((x) => x.id === c.amigo); if (a) a.relacao = Math.min(100, a.relacao + 8); mudarStat(e, 'felicidade', 3); mudarStat(e, 'disciplina', 2); return 'Você engoliu o orgulho e pediu desculpas. A amizade ficou mais forte do que antes.'; },
      },
      {
        id: 'esperar', texto: 'Esperar o outro vir falar',
        aplicar(e, rng, c) { const a = e.pessoa.amigos.find((x) => x.id === c.amigo); if (a) a.relacao = Math.max(0, a.relacao - 12); mudarStat(e, 'felicidade', -3); return 'Ninguém deu o primeiro passo, e a amizade esfriou.'; },
      },
      {
        id: 'cortar', texto: 'Cortar a amizade',
        aplicar(e, rng, c) { const a = e.pessoa.amigos.find((x) => x.id === c.amigo); if (a) e.pessoa.amigos.splice(e.pessoa.amigos.indexOf(a), 1); mudarStat(e, 'felicidade', -4); mudarStat(e, 'social', -3); return 'Você decidiu se afastar. Foi um alívio e uma perda ao mesmo tempo.'; },
      },
    ],
  },
  {
    id: 'primeiro-namoro', titulo: 'Primeiro namoro', tipo: 'neutro', peso: 3, idadeMin: 16, idadeMax: 17,
    texto: () => 'Um colega que você já gostava de longe convidou você para um passeio. Parece um começo de namoro.',
    padraoAuto: 'devagar',
    escolhas: [
      esc('namorar', 'Aceitar e namorar', 'Vocês começaram a namorar, com muito carinho e muito frio na barriga. Durou um tempo, e ensinou muito.', { felicidade: 6, social: 3, estudos: -2, flag: 'primeiro_namoro' }),
      esc('devagar', 'Ir com calma, como amigos primeiro', 'Vocês foram se conhecendo. A amizade valeu a pena, com ou sem namoro.', { felicidade: 3, novoAmigo: true }),
      esc('foco', 'Dizer que prefere focar nos estudos agora', 'Você agradeceu e explicou. Cada um seguiu o seu caminho.', { estudos: 3, disciplina: 2 }),
    ],
  },

  // ----- Dias comuns (repetem) -----
  {
    id: 'dia-bom', titulo: 'Um dia simples e feliz', tipo: 'positivo', peso: 1, idadeMin: 3, idadeMax: 17, unico: false,
    texto: () => 'Nada de especial aconteceu, e foi justamente isso que tornou o dia bom.',
    padraoAuto: 'curtir',
    escolhas: [esc('curtir', 'Curtir o momento', 'Você foi dormir com a sensação de que a vida é boa.', { felicidade: 3, saude: 1 })],
  },
  {
    id: 'dia-dificil', titulo: 'Um dia difícil', tipo: 'negativo', peso: 1, idadeMin: 6, idadeMax: 17, unico: false,
    texto: () => 'Hoje nada deu certo: tudo pareceu pesado e você ficou sem vontade de nada.',
    padraoAuto: 'conversar',
    escolhas: [
      esc('conversar', 'Conversar com alguém', (e) => `Você contou o que sentia para ${mae(e)}. O peso diminuiu.`, { felicidade: 2, familia: { mae: 3 } }),
      esc('sozinha', 'Ficar um tempo sozinha', 'Você se recolheu e, no dia seguinte, a coisa já estava mais leve.', { felicidade: -1, criatividade: 1 }),
    ],
  },
];

for (const ev of EVENTOS_VIDA) ev.vida = true;

const porId = (id) => EVENTOS_VIDA.find((e) => e.id === id);

// ---------- Sorteio e abertura ----------

function elegivel(estado, ev, vistos) {
  if (ev.idadeExata !== undefined) return ev.idadeExata === estado.idade && !vistos.has(ev.id);
  if (estado.idade < ev.idadeMin || estado.idade > ev.idadeMax) return false;
  if (ev.unico !== false && vistos.has(ev.id)) return false;
  return true;
}

// Sorteia os eventos do ano que começa (idade atual) e abre o primeiro.
export function prepararEventosDoAno(estado, rng) {
  const p = estado.pessoa;
  const cfg = DIFICULDADES[estado.dificuldade];
  const vistos = new Set(p.eventosVistos);
  const idade = estado.idade;

  const forcados = EVENTOS_VIDA.filter((ev) => ev.idadeExata !== undefined && elegivel(estado, ev, vistos) && (!ev.condicao || ev.condicao(estado)));
  let quantidade;
  if (idade <= 2) quantidade = 0;
  else if (idade <= 5) quantidade = 1;
  else if (idade <= 12) quantidade = rng.chance(0.6) ? 2 : 1;
  else quantidade = rng.chance(0.5) ? 3 : 2;

  const pool = EVENTOS_VIDA.filter((ev) => ev.idadeExata === undefined && elegivel(estado, ev, vistos) && (!ev.condicao || ev.condicao(estado)));
  const escolhidos = [];
  for (let i = 0; i < quantidade && pool.length > 0; i++) {
    const pesos = pool.map((ev) => ev.peso * (ev.tipo === 'negativo' ? cfg.eventosNegativos : 1));
    let sorteio = rng.proximo() * pesos.reduce((a, b) => a + b, 0);
    let idx = 0;
    for (let j = 0; j < pool.length; j++) {
      sorteio -= pesos[j];
      if (sorteio <= 0) { idx = j; break; }
    }
    escolhidos.push(pool[idx]);
    pool.splice(idx, 1);
  }
  p.fila = [...forcados, ...escolhidos].map((ev) => ev.id);
  abrirProximoEventoDeVida(estado, rng);
}

// Abre o próximo evento da fila do ano (se houver e se nada estiver pendente).
export function abrirProximoEventoDeVida(estado, rng) {
  const p = estado.pessoa;
  if (!p || estado.pendencia) return null;
  while (p.fila.length > 0) {
    const ev = porId(p.fila.shift());
    if (!ev || (ev.condicao && !ev.condicao(estado))) continue;
    if (ev.unico !== false) p.eventosVistos.push(ev.id);
    const ctx = ev.preparar ? ev.preparar(estado, rng) : {};
    estado.pendencia = {
      tipo: 'evento',
      evento: {
        id: ev.id, titulo: ev.titulo, natureza: ev.tipo, vida: true, texto: ev.texto(estado, ctx), ctx,
        escolhas: ev.escolhas.map((c) => ({ id: c.id, texto: c.texto })), padraoAuto: ev.padraoAuto,
      },
    };
    return estado.pendencia.evento;
  }
  return null;
}

export { registrarDiario };
