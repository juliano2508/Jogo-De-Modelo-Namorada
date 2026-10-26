// Eventos da vida adulta: amor, família, amizades, saúde, hábitos, dinheiro e fama.
// Sorteados durante a carreira (ver tentarEvento) e misturados com os eventos profissionais.

import { temFlag } from './memoria.js';
import { parentesco, registrarDiario, mexerNaFamilia } from './pessoa.js';
import { criarParceiro, terminarRelacao, adicionarFilho } from './pessoa-adulta.js';
import { prim, mae, pai, avo, esc, aplicarFx } from './fx.js';

const par = (e) => prim(e.pessoa.parceiro?.nome) || 'seu par';
const temPar = (e) => Boolean(e.pessoa.parceiro);
const semPar = (e) => !e.pessoa.parceiro;
const licenca = (e, semanas) => { e.lesao = { semanasRestantes: semanas, licenca: true, motivo: 'licenca' }; };
const mudarHabito = (e, h, n) => { e.pessoa.habitos[h] = n; };

const adulto = { idadeMin: 18, idadeMax: 99 };

export const EVENTOS_ADULTOS = [
  // ----- Romance -----
  {
    id: 'conhecer-alguem', titulo: 'Alguém interessante', tipo: 'positivo', peso: 5, ...adulto, unico: false,
    condicao: (e) => semPar(e),
    texto: () => 'Em um evento depois do trabalho, alguém puxa assunto e a conversa dura horas. Há química no ar.',
    padraoAuto: 'aceitar',
    escolhas: [
      { id: 'aceitar', texto: 'Aceitar o convite para sair', aplicar(e, rng) { const p = criarParceiro(e, rng); aplicarFx(e, rng, { felicidade: 5, social: 2 }); return `Você e ${prim(p.nome)} começaram a se ver.`; } },
      esc('devagar', 'Trocar contatos e ir com calma', 'Vocês trocaram mensagens por semanas. Nada de pressa.', { felicidade: 1 }),
      esc('foco', 'Agradecer e focar na carreira', 'A agenda falou mais alto. Você ficou com a sensação de curiosidade.', { disciplina: 2, felicidade: -1 }),
    ],
  },
  {
    id: 'viagem-a-dois', titulo: 'Escapada a dois', tipo: 'positivo', peso: 3, ...adulto, unico: false,
    condicao: (e) => temPar(e) && e.pessoa.parceiro.relacao >= 45 && e.dinheiro > 3000,
    texto: (e) => `${par(e)} propõe uma viagem curta de fim de semana, só vocês dois.`,
    padraoAuto: 'viajar',
    escolhas: [
      esc('viajar', 'Aceitar e se desligar do celular', 'Foi o descanso de que vocês precisavam.', { dinheiro: -1200, felicidade: 6, parceiro: 8, cansaco: -15 }),
      esc('adiar', 'Adiar por causa do trabalho', 'A agenda ganhou, e o clima ficou um pouco estranho.', { parceiro: -5, rel: { agente: 1 } }),
    ],
  },
  {
    id: 'ciumes', titulo: 'Ciúmes dos bastidores', tipo: 'negativo', peso: 3, ...adulto, unico: false,
    condicao: (e) => temPar(e) && e.fama >= 20,
    texto: (e) => `${par(e)} anda desconfortável com as fotos e os colegas de trabalho que aparecem nas suas redes. A conversa esquentou.`,
    padraoAuto: 'conversar',
    escolhas: [
      esc('conversar', 'Sentar e conversar com calma', 'Vocês colocaram tudo na mesa e saíram mais próximos.', { parceiro: 5, felicidade: 2 }),
      esc('defender', 'Dizer que o trabalho vem primeiro', 'A discussão não terminou bem.', { parceiro: -10, felicidade: -3, disciplina: 1 }),
      esc('apresentar', 'Levar para conhecer o pessoal', 'Conhecer a equipe ajudou a desfazer o mal-estar.', { parceiro: 4, rel: { bastidores: 2 }, cansaco: 5 }),
    ],
  },
  {
    id: 'pedido-de-casamento', titulo: 'O pedido', tipo: 'positivo', peso: 4, ...adulto, unico: true,
    condicao: (e) => temPar(e) && e.pessoa.parceiro.status === 'namoro' && e.pessoa.parceiro.relacao >= 68 && e.idade >= 22,
    texto: (e) => `${par(e)} prepara um jantar e, no meio da noite, tira uma caixinha do bolso e faz o pedido.`,
    padraoAuto: 'sim',
    escolhas: [
      { id: 'sim', texto: 'Dizer sim', aplicar(e, rng) { e.pessoa.parceiro.status = 'noivado'; aplicarFx(e, rng, { felicidade: 10, parceiro: 6 }); return 'Vocês estão noivos.'; } },
      esc('tempo', 'Pedir mais tempo', 'Foi sincera. Ele(a) entendeu, mas ficou abalado(a).', { parceiro: -8, felicidade: -2 }),
    ],
  },
  {
    id: 'casamento', titulo: 'O grande dia', tipo: 'positivo', peso: 6, ...adulto, unico: true,
    condicao: (e) => temPar(e) && e.pessoa.parceiro.status === 'noivado',
    texto: (e) => `Chegou a hora de casar com ${par(e)}. A família toda está a caminho.`,
    padraoAuto: 'festa',
    escolhas: [
      { id: 'festa', texto: 'Festa grande com todo mundo', aplicar(e, rng) { e.pessoa.parceiro.status = 'casados'; aplicarFx(e, rng, { dinheiro: -4000, felicidade: 10, parceiro: 8, familia: { mae: 5, pai: 3 }, amigos: 4, fama: 1 }); return 'Foi uma festa linda. Vocês estão casados.'; } },
      { id: 'simples', texto: 'Cerimônia íntima', aplicar(e, rng) { e.pessoa.parceiro.status = 'casados'; aplicarFx(e, rng, { dinheiro: -800, felicidade: 8, parceiro: 8 }); return 'Pouca gente, muito carinho. Vocês estão casados.'; } },
    ],
  },
  {
    id: 'traicao', titulo: 'Uma mensagem suspeita', tipo: 'negativo', peso: 2, ...adulto, unico: false,
    condicao: (e) => temPar(e) && e.pessoa.parceiro.relacao < 55,
    texto: (e) => `Você viu uma mensagem no celular de ${par(e)} que não deveria ver.`,
    padraoAuto: 'conversa',
    escolhas: [
      esc('conversa', 'Confrontar e ouvir a explicação', 'A conversa foi pesada. Ficou a dúvida.', { parceiro: -4, felicidade: -4 }),
      { id: 'terminar', texto: 'Terminar na hora', aplicar(e, rng) { const nome = par(e); terminarRelacao(e, 'traicao'); aplicarFx(e, rng, { felicidade: -8, amigos: 3 }); return `Você terminou com ${nome}. Dói, mas é um alívio.`; } },
      esc('ignorar', 'Fingir que não viu', 'Você guardou para si. O mal-estar ficou.', { felicidade: -5, parceiro: -2 }),
    ],
  },
  {
    id: 'termino', titulo: 'O fim de um ciclo', tipo: 'negativo', peso: 4, ...adulto, unico: false,
    condicao: (e) => temPar(e) && e.pessoa.parceiro.relacao < 38,
    texto: (e) => `Você e ${par(e)} não conversam como antes. A pergunta que ninguém quer fazer paira no ar.`,
    padraoAuto: 'terminar',
    escolhas: [
      { id: 'terminar', texto: 'Terminar com respeito', aplicar(e, rng) { const nome = par(e); terminarRelacao(e, 'fim'); aplicarFx(e, rng, { felicidade: -4, amigos: 3 }); return `Você e ${nome} se despediram com carinho.`; } },
      esc('terapia', 'Propor terapia de casal', 'Vocês toparam tentar.', { parceiro: 12, dinheiro: -600, felicidade: 1 }),
    ],
  },
  {
    id: 'gravidez', titulo: 'Uma notícia inesperada', tipo: 'neutro', peso: 3, ...adulto, unico: false,
    condicao: (e) => temPar(e) && e.pessoa.parceiro.relacao >= 62 && e.idade >= 24 && e.idade <= 40 && e.pessoa.filhos.length < 3 && !e.lesao && !e.pessoa.gestacao,
    texto: (e) => `O teste deu positivo. ${par(e)} e você estão esperando um bebê.`,
    padraoAuto: 'licenca',
    escolhas: [
      { id: 'licenca', texto: 'Tirar uma licença da carreira', aplicar(e, rng) { licenca(e, 10); adicionarFilho(e, rng); aplicarFx(e, rng, { felicidade: 8, parceiro: 6, familia: { mae: 5 }, cansaco: 10 }); return 'Você se afastou 10 semanas para viver a chegada do bebê.'; } },
      { id: 'curta', texto: 'Voltar logo ao trabalho', aplicar(e, rng) { licenca(e, 4); adicionarFilho(e, rng); aplicarFx(e, rng, { felicidade: 5, parceiro: 2, cansaco: 25, rel: { agente: 2 } }); return 'Foram só 4 semanas de licença. O cansaço pesou.'; } },
    ],
  },
  {
    id: 'filho-doente', titulo: 'Febre de madrugada', tipo: 'negativo', peso: 3, ...adulto, unico: false,
    condicao: (e) => e.pessoa.filhos.some((f) => f.idade < 12),
    texto: (e) => `${e.pessoa.filhos.find((f) => f.idade < 12).nome} acordou com febre alta e a agenda do dia estava cheia.`,
    padraoAuto: 'ficar',
    escolhas: [
      esc('ficar', 'Ficar em casa cuidando', 'Passou a noite ao lado. A febre baixou.', { filhos: 8, felicidade: 1, cansaco: 10, rel: { agente: -2 } }),
      esc('trabalhar', 'Deixar com alguém e trabalhar', 'Você foi, mas ficou ansiosa o dia todo.', { filhos: -4, felicidade: -3, rel: { agente: 1 } }),
    ],
  },

  // ----- Família -----
  {
    id: 'mae-doente', titulo: 'Ligação da família', tipo: 'negativo', peso: 3, ...adulto, unico: false,
    condicao: (e) => parentesco(e, 'mae')?.vivo,
    texto: (e) => `${mae(e)} está internada para exames. Nada grave, segundo os médicos, mas a família pede sua presença.`,
    padraoAuto: 'visitar',
    escolhas: [
      esc('visitar', 'Ir visitar e ajudar', 'Sua presença fez diferença.', { familia: { mae: 10, pai: 3 }, felicidade: 2, cansaco: 10, dinheiro: -300 }),
      esc('ligar', 'Ligar todo dia e mandar dinheiro', 'Ajudou, mas ela sentiu sua falta.', { familia: { mae: 3 }, dinheiro: -500 }),
    ],
  },
  {
    id: 'pedido-de-dinheiro', titulo: 'Pedido de ajuda', tipo: 'neutro', peso: 3, ...adulto, unico: false,
    condicao: (e) => e.dinheiro > 3000 && e.pessoa.familia.some((f) => f.vivo),
    texto: (e) => `${pai(e)} ligou: a situação em casa apertou e precisaram de ajuda com as contas.`,
    padraoAuto: 'ajudar',
    escolhas: [
      esc('ajudar', 'Ajudar generosamente', 'Você ajudou sem pedir nada em troca.', { dinheiro: -1500, familia: { mae: 6, pai: 6 }, felicidade: 2 }),
      esc('pouco', 'Ajudar com uma parte', 'Ajudou um pouco, com limites.', { dinheiro: -500, familia: { mae: 2, pai: 2 } }),
      esc('recusar', 'Dizer que agora não dá', 'Você recusou. O clima esfriou.', { familia: { mae: -6, pai: -6 }, felicidade: -2 }),
    ],
  },
  {
    id: 'reencontro-do-pai', titulo: 'Uma ligação do passado', tipo: 'neutro', peso: 2, ...adulto, unico: true,
    condicao: (e) => parentesco(e, 'pai')?.ausente && parentesco(e, 'pai').vivo,
    texto: (e) => `${prim(parentesco(e, 'pai').nome)}, seu pai, que não esteve presente, pede para conversar.`,
    padraoAuto: 'ouvir',
    escolhas: [
      { id: 'ouvir', texto: 'Ouvir o que ele tem a dizer', aplicar(e, rng) { const p = parentesco(e, 'pai'); p.ausente = false; aplicarFx(e, rng, { familia: { pai: 18 }, felicidade: 2 }); return 'Foi uma conversa difícil e honesta. Vocês combinaram de se ver de novo.'; } },
      esc('recusar', 'Recusar o contato', 'Você preferiu preservar sua paz.', { felicidade: 1, familia: { pai: -4 } }),
    ],
  },
  {
    id: 'luto', titulo: 'Uma despedida', tipo: 'negativo', peso: 0, ...adulto, unico: false,
    condicao: (e) => Boolean(e.pessoa.ultimoLuto),
    texto: (e) => `${prim(e.pessoa.familia.find((f) => f.id === e.pessoa.ultimoLuto.id)?.nome)} faleceu. A família está reunida para o velório.`,
    padraoAuto: 'ir',
    escolhas: [
      esc('ir', 'Ir ao velório e ficar com a família', 'Foi um dia de lágrimas e abraços.', { felicidade: -6, familia: { mae: 6, pai: 4 }, cansaco: 10 }),
      esc('trabalho', 'Cumprir os compromissos e ir só ao enterro', 'O luto veio em silêncio.', { felicidade: -8, disciplina: 1 }),
    ],
  },

  // ----- Amizades -----
  {
    id: 'amigo-em-crise', titulo: 'Amiga precisando de você', tipo: 'neutro', peso: 3, ...adulto, unico: false,
    condicao: (e) => e.pessoa.amigos.length > 0,
    texto: (e) => `${prim(e.pessoa.amigos[0].nome)} apareceu chorando na sua porta, e você tem um dia de trabalho pela frente.`,
    padraoAuto: 'acolher',
    escolhas: [
      { id: 'acolher', texto: 'Acolher e ouvir', aplicar(e, rng) { const a = e.pessoa.amigos[0]; a.relacao = Math.min(100, a.relacao + 15); aplicarFx(e, rng, { cansaco: 8, felicidade: 1 }); return 'Vocês conversaram até tarde. A amizade ficou mais forte.'; } },
      { id: 'marcar', texto: 'Marcar para depois', aplicar(e) { const a = e.pessoa.amigos[0]; a.relacao = Math.max(0, a.relacao - 8); return 'Vocês se falaram só depois. Ficou um vazio.'; } },
    ],
  },
  {
    id: 'amigo-interesseiro', titulo: 'Amigos de agora', tipo: 'negativo', peso: 3, ...adulto, unico: false,
    condicao: (e) => e.fama >= 35,
    texto: () => 'Depois do sucesso, pessoas que nunca ligaram começam a aparecer pedindo favores e convites.',
    padraoAuto: 'seletiva',
    escolhas: [
      esc('seletiva', 'Manter só quem sempre esteve ao seu lado', 'O círculo diminuiu, mas ficou mais verdadeiro.', { amigos: 3, felicidade: 1 }),
      esc('generosa', 'Receber todo mundo', 'A casa ficou cheia, e o bolso um pouco mais vazio.', { dinheiro: -600, social: 3, felicidade: -1, rel: { midia: 2 } }),
    ],
  },
  {
    id: 'reencontro-amigos', titulo: 'Reencontro', tipo: 'positivo', peso: 3, ...adulto, unico: false,
    condicao: (e) => e.pessoa.amigos.length > 0,
    texto: () => 'Os amigos de longa data marcam um jantar. Tem muita história para contar.',
    padraoAuto: 'ir',
    escolhas: [
      esc('ir', 'Ir e aproveitar', 'Foi a melhor noite do mês.', { amigos: 6, felicidade: 5, cansaco: -5 }),
      esc('faltar', 'Faltar por cansaço', 'Você ficou em casa descansando.', { amigos: -4, cansaco: -8 }),
    ],
  },

  // ----- Saúde e hábitos -----
  {
    id: 'festa-open-bar', titulo: 'Festa depois do desfile', tipo: 'neutro', peso: 4, ...adulto, unico: false,
    condicao: (e) => e.pessoa.habitos.bebida < 2,
    texto: () => 'Depois de um evento importante, rola uma festa com open bar e todo mundo do meio está lá.',
    padraoAuto: 'agua',
    escolhas: [
      { id: 'beber', texto: 'Beber com a turma', aplicar(e, rng) { if (e.pessoa.habitos.bebida < 1) mudarHabito(e, 'bebida', 1); aplicarFx(e, rng, { rel: { bastidores: 3 }, dependencia: { bebida: 8 }, felicidade: 2, cansaco: 10 }); return 'Foi divertido e rendeu contatos, mas a ressaca pesou.'; } },
      esc('agua', 'Ficar na água e socializar', 'Você curtiu e acordou inteira no dia seguinte.', { rel: { bastidores: 1 }, felicidade: 1 }),
      esc('sair', 'Ir embora cedo', 'Você descansou, mas ouviram dizer que sumiu.', { rel: { bastidores: -1 }, cansaco: -8 }),
    ],
  },
  {
    id: 'cigarro-nos-bastidores', titulo: 'Pausa para um cigarro', tipo: 'neutro', peso: 3, ...adulto, unico: true,
    condicao: (e) => e.pessoa.habitos.cigarro === 0,
    texto: () => 'Nos bastidores, quase todo mundo sai para fumar. Alguém oferece um cigarro para você.',
    padraoAuto: 'recusar',
    escolhas: [
      { id: 'aceitar', texto: 'Aceitar só dessa vez', aplicar(e, rng) { mudarHabito(e, 'cigarro', 1); aplicarFx(e, rng, { dependencia: { cigarro: 12 }, rel: { bastidores: 1 } }); return 'Virou hábito de pausa. O corpo sentiu.'; } },
      esc('recusar', 'Recusar e ficar por perto', 'Você recusou numa boa. Ninguém ligou.', { disciplina: 2 }),
    ],
  },
  {
    id: 'academia-convite', titulo: 'Convite para treinar', tipo: 'positivo', peso: 3, ...adulto, unico: false,
    condicao: (e) => e.pessoa.habitos.exercicio < 2,
    texto: () => 'Uma colega do trabalho convida você para treinar com ela três vezes por semana.',
    padraoAuto: 'topar',
    escolhas: [
      { id: 'topar', texto: 'Topar e criar a rotina', aplicar(e, rng) { mudarHabito(e, 'exercicio', 2); aplicarFx(e, rng, { disciplina: 3, felicidade: 3 }); return 'Você passou a treinar com regularidade.'; } },
      esc('leve', 'Começar com caminhadas', 'Um começo leve.', { felicidade: 1 }),
      esc('recusar', 'Recusar', 'A agenda está cheia demais.', {}),
    ],
  },
  {
    id: 'insonia', titulo: 'Noites sem dormir', tipo: 'negativo', peso: 3, ...adulto, unico: false,
    condicao: (e) => e.cansaco >= 40 || e.pessoa.stats.felicidade < 45,
    texto: () => 'Faz dias que você não consegue dormir direito. A cabeça não desliga.',
    padraoAuto: 'rotina',
    escolhas: [
      { id: 'rotina', texto: 'Criar uma rotina de sono', aplicar(e, rng) { mudarHabito(e, 'sono', Math.max(e.pessoa.habitos.sono, 2)); aplicarFx(e, rng, { disciplina: 2, felicidade: 2, cansaco: -10 }); return 'Você passou a priorizar o descanso. Fez diferença.'; } },
      esc('remedio', 'Seguir assim e aguentar', 'O cansaço se acumulou.', { cansaco: 15, felicidade: -3 }),
    ],
  },
  {
    id: 'burnout-pessoal', titulo: 'Sem energia para nada', tipo: 'negativo', peso: 4, ...adulto, unico: false, urgente: false,
    condicao: (e) => e.pessoa.stats.felicidade < 35,
    texto: () => 'Nada tem graça, nem as coisas que você amava. A rotina pesa.',
    padraoAuto: 'terapia',
    escolhas: [
      { id: 'terapia', texto: 'Começar terapia', aplicar(e, rng) { mudarHabito(e, 'autocuidado', 2); aplicarFx(e, rng, { felicidade: 8, dinheiro: -400 }); return 'Falar sobre isso ajudou. Você mantém as sessões semanais.'; } },
      esc('pausa', 'Tirar uma semana de folga', 'Uma semana longe da agenda ajudou um pouco.', { felicidade: 5, cansaco: -20, rel: { agente: -2 } }),
      esc('seguir', 'Seguir em frente', 'Você empurrou com a barriga.', { felicidade: -4 }),
    ],
  },
  {
    id: 'alerta-vicio', titulo: 'Um sinal de alerta', tipo: 'negativo', peso: 6, ...adulto, unico: false,
    condicao: (e) => e.pessoa.dependencia.bebida >= 45 || e.pessoa.dependencia.cigarro >= 45,
    texto: (e) => `${e.pessoa.dependencia.bebida >= e.pessoa.dependencia.cigarro ? 'A bebida' : 'O cigarro'} já pesa mais do que você gostaria. Alguém próximo comentou.`,
    padraoAuto: 'reduzir',
    escolhas: [
      { id: 'reduzir', texto: 'Tentar reduzir por conta própria', aplicar(e, rng) { const s = e.pessoa.dependencia.bebida >= e.pessoa.dependencia.cigarro ? 'bebida' : 'cigarro'; mudarHabito(e, s, Math.max(0, e.pessoa.habitos[s] - 1)); aplicarFx(e, rng, { dependencia: { [s]: -10 }, disciplina: 2 }); return 'Reduzir foi um esforço diário.'; } },
      esc('negar', 'Dizer que está tudo bem', 'Você mudou de assunto. O problema continuou.', { felicidade: -2 }),
      esc('conversar', 'Conversar com alguém de confiança', 'Desabafar aliviou. Procurar ajuda profissional pode ser o próximo passo.', { felicidade: 3, familia: { mae: 3 } }),
    ],
  },
  {
    id: 'spa', titulo: 'Dia de autocuidado', tipo: 'positivo', peso: 3, ...adulto, unico: false,
    condicao: (e) => e.dinheiro > 1500,
    texto: () => 'Uma folga rara na agenda. Dá para fazer algo só por você.',
    padraoAuto: 'spa',
    escolhas: [
      esc('spa', 'Passar o dia em um spa', 'Você saiu renovada.', { dinheiro: -500, cansaco: -10, felicidade: 4 }),
      esc('casa', 'Ficar em casa lendo e descansando', 'Simples e perfeito.', { cansaco: -12, felicidade: 3 }),
    ],
  },

  // ----- Dinheiro -----
  {
    id: 'golpe-financeiro', titulo: 'Oportunidade boa demais', tipo: 'negativo', peso: 2, ...adulto, unico: false,
    condicao: (e) => e.dinheiro > 5000,
    texto: () => 'Um conhecido oferece um investimento que promete retorno altíssimo em poucos meses.',
    padraoAuto: 'recusar',
    escolhas: [
      { id: 'investir', texto: 'Investir uma boa quantia', aplicar(e, rng) { if (rng.chance(0.6)) { aplicarFx(e, rng, { dinheiro: -3000, felicidade: -5 }); return 'Era golpe. O dinheiro foi embora.'; } aplicarFx(e, rng, { dinheiro: 2000, felicidade: 3 }); return 'Deu certo desta vez. Foi sorte.'; } },
      esc('recusar', 'Recusar', 'Prudência. Você escapou de uma dor de cabeça.', { disciplina: 1 }),
    ],
  },
  {
    id: 'heranca', titulo: 'Uma herança pequena', tipo: 'positivo', peso: 1, ...adulto, unico: true,
    condicao: (e) => e.pessoa.familia.some((f) => f.papel === 'avo' && !f.vivo),
    texto: (e) => `${avo(e)} deixou uma quantia modesta para você.`,
    padraoAuto: 'guardar',
    escolhas: [
      esc('guardar', 'Guardar', 'Você guardou com carinho.', { dinheiro: 2500, felicidade: 1 }),
      esc('familia', 'Dividir com a família', 'Cada um recebeu um pouco, e a união cresceu.', { dinheiro: 1000, familia: { mae: 5, pai: 5, irmaos: 5 }, felicidade: 3 }),
    ],
  },

  // ----- Fama -----
  {
    id: 'paparazzi', titulo: 'Flagra na rua', tipo: 'neutro', peso: 4, ...adulto, unico: false,
    condicao: (e) => e.fama >= 40,
    texto: () => 'Um fotógrafo registrou você saindo de casa sem maquiagem. As imagens já estão circulando.',
    padraoAuto: 'rir',
    escolhas: [
      esc('rir', 'Postar uma resposta bem-humorada', 'O público adorou sua leveza.', { fama: 2, rel: { midia: 4 } }),
      esc('ignorar', 'Ignorar', 'Em dois dias ninguém mais falava.', {}),
      esc('processar', 'Acionar a agência para derrubar as fotos', 'As fotos saíram do ar, mas a história cresceu.', { dinheiro: -400, rel: { midia: -3, agente: 2 } }),
    ],
  },
  {
    id: 'boato', titulo: 'Boato na internet', tipo: 'negativo', peso: 3, ...adulto, unico: false,
    condicao: (e) => e.fama >= 30,
    texto: () => 'Um perfil de fofoca inventou uma história sobre a sua vida pessoal. Já tem milhares de curtidas.',
    padraoAuto: 'nota',
    escolhas: [
      esc('nota', 'Publicar uma nota firme', 'Você desmentiu com calma e o assunto morreu.', { rel: { midia: 2 }, felicidade: -1 }),
      esc('silencio', 'Não alimentar o boato', 'O silêncio funcionou depois de uma semana difícil.', { felicidade: -3, cansaco: 5 }),
      esc('processo', 'Entrar com ação judicial', 'Caro e demorado, mas o recado foi dado.', { dinheiro: -1200, rel: { midia: 1 }, felicidade: -2 }),
    ],
  },
  {
    id: 'entrevista-vida', titulo: 'Pergunta pessoal em entrevista', tipo: 'neutro', peso: 3, ...adulto, unico: false,
    condicao: (e) => e.fama >= 25,
    texto: () => 'Uma jornalista pergunta sobre sua vida pessoal diante das câmeras.',
    padraoAuto: 'leve',
    escolhas: [
      esc('leve', 'Responder com leveza e sem detalhes', 'Você contornou sem perder o charme.', { rel: { midia: 3 }, fama: 1 }),
      esc('abrir', 'Contar a sua história de verdade', 'A sinceridade comoveu o público.', { rel: { midia: 5 }, fama: 3, felicidade: 1, parceiro: -3 }),
      esc('recusar', 'Dizer que prefere falar do trabalho', 'Educado e direto.', { rel: { midia: -1 } }),
    ],
  },
];

export { registrarDiario, mexerNaFamilia, temFlag };
