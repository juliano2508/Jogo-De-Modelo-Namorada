// Atividades da vida pessoal: o tempo livre do ano, gasto como a jogadora preferir (estilo BitLife).
// Cada atividade tem uma faixa de idade, efeitos pequenos e retorno decrescente.

import { calcularOverall, ROTULOS } from './atributos.js';
import {
  mudarStat, ganharAfinidade, mexerNaFamilia, mexerNoAmigo, registrarDiario, conhecerAmigo,
} from './pessoa.js';

// Ganho com retorno decrescente: quanto mais alto o valor, menos rende.
function ganho(estado, stat, base) {
  const atual = estado.pessoa.stats[stat];
  mudarStat(estado, stat, Math.max(1, Math.round(base * (1 - atual / 130))));
}

const primeiroNome = (nome) => nome.split(' ')[0];

// alvo: 'familia' (escolhe um parente vivo) | 'amigo' (escolhe um amigo) | null
export const ATIVIDADES = [
  {
    id: 'brincar', nome: 'Brincar', descricao: 'Correr, inventar histórias e se divertir.', idadeMin: 2, idadeMax: 11, alvo: null,
    aplicar(e) { ganho(e, 'felicidade', 5); ganho(e, 'social', 2); return 'Foi uma tarde de muita risada.'; },
  },
  {
    id: 'estudar', nome: 'Estudar com dedicação', descricao: 'Dever de casa, revisão e leitura da matéria.', idadeMin: 6, idadeMax: 17, alvo: null,
    aplicar(e) { ganho(e, 'estudos', 6); ganho(e, 'disciplina', 3); mudarStat(e, 'felicidade', -1); return 'Você foi mais fundo na matéria e sentiu a diferença.'; },
  },
  {
    id: 'ler', nome: 'Ler um bom livro', descricao: 'Ficção, revistas, o que cair na mão.', idadeMin: 6, idadeMax: 99, alvo: null,
    aplicar(e) { ganho(e, 'estudos', 2); ganho(e, 'criatividade', 4); ganho(e, 'felicidade', 2); return 'A leitura abriu ideias novas.'; },
  },
  {
    id: 'danca', nome: 'Aula de dança', descricao: 'Postura, ritmo e presença de palco.', idadeMin: 4, idadeMax: 17, alvo: null,
    aplicar(e) { ganharAfinidade(e, 'passarela', 3); ganho(e, 'disciplina', 3); ganho(e, 'saude', 3); ganho(e, 'felicidade', 2); return 'Você ensaiou até acertar a coreografia.'; },
  },
  {
    id: 'teatro', nome: 'Aula de teatro', descricao: 'Expressão, voz e coragem de se mostrar.', idadeMin: 6, idadeMax: 17, alvo: null,
    aplicar(e) { ganharAfinidade(e, 'editorial', 2); ganho(e, 'criatividade', 4); ganho(e, 'social', 2); return 'Você aprendeu a contar uma história só com o olhar.'; },
  },
  {
    id: 'esporte', nome: 'Praticar esporte', descricao: 'Vôlei, natação, corrida: o que você curtir.', idadeMin: 5, idadeMax: 99, alvo: null,
    aplicar(e) { ganho(e, 'saude', 5); ganho(e, 'disciplina', 3); ganho(e, 'felicidade', 2); return 'Você terminou cansada e muito mais disposta.'; },
  },
  {
    id: 'criar', nome: 'Desenhar, pintar ou criar fotos', descricao: 'Experimentar com cores, roupas e imagens.', idadeMin: 5, idadeMax: 99, alvo: null,
    aplicar(e) { ganharAfinidade(e, 'editorial', 1); ganho(e, 'criatividade', 5); ganho(e, 'felicidade', 2); return 'Você terminou algo que teve vontade de mostrar.'; },
  },
  {
    id: 'idiomas', nome: 'Estudar um idioma', descricao: 'Inglês e francês abrem portas no mundo da moda.', idadeMin: 10, idadeMax: 99, alvo: null,
    aplicar(e) { ganharAfinidade(e, 'versatil', 2); ganho(e, 'estudos', 3); ganho(e, 'disciplina', 2); return 'Você já consegue entender bem mais do que semana passada.'; },
  },
  {
    id: 'redes', nome: 'Criar conteúdo nas redes', descricao: 'Fotos, vídeos e um público que cresce devagar.', idadeMin: 12, idadeMax: 99, alvo: null,
    aplicar(e, rng) {
      ganharAfinidade(e, 'comercial', 2); ganharAfinidade(e, 'editorial', 1); ganho(e, 'social', 3);
      mudarStat(e, 'felicidade', rng.chance(0.4) ? -3 : 2);
      return 'Seus posts ganharam seguidores novos, e alguns comentários maldosos também.';
    },
  },
  {
    id: 'trabalhinho', nome: 'Fazer um bico', descricao: 'Loja, panfletagem, cuidar de criança: um dinheirinho próprio.', idadeMin: 14, idadeMax: 17, alvo: null,
    aplicar(e) { e.dinheiro += 250; ganharAfinidade(e, 'comercial', 1); ganho(e, 'disciplina', 3); mudarStat(e, 'saude', -1); return 'Você ganhou 250 reais e aprendeu a lidar com o público.'; },
  },
  {
    id: 'voluntariado', nome: 'Fazer voluntariado', descricao: 'Ajudar em uma ação da comunidade.', idadeMin: 13, idadeMax: 99, alvo: null,
    aplicar(e) { ganharAfinidade(e, 'versatil', 1); ganho(e, 'disciplina', 2); ganho(e, 'social', 3); ganho(e, 'felicidade', 4); return 'Foi cansativo, mas você voltou para casa com o coração cheio.'; },
  },
  {
    id: 'descansar', nome: 'Descansar e cuidar de você', descricao: 'Dormir cedo, respirar, não fazer nada.', idadeMin: 0, idadeMax: 99, alvo: null,
    aplicar(e) {
      ganho(e, 'saude', 3); ganho(e, 'felicidade', 3);
      if (e.modo === 'carreira') e.cansaco = Math.max(0, e.cansaco - 15);
      return 'Você acordou renovada.';
    },
  },
  {
    id: 'familia', nome: 'Passar tempo com a família', descricao: 'Escolha com quem.', idadeMin: 0, idadeMax: 99, alvo: 'familia',
    aplicar(e, rng, alvo) {
      const p = mexerNaFamilia(e, alvo, 9);
      ganho(e, 'felicidade', 3);
      return p ? `Você passou um tempo com ${primeiroNome(p.nome)}, e a relação ficou mais próxima.` : 'Foi um bom tempo em família.';
    },
  },
  {
    id: 'amigos', nome: 'Sair com um amigo', descricao: 'Escolha com quem. Sem amigos, você pode fazer um novo.', idadeMin: 5, idadeMax: 99, alvo: 'amigo',
    aplicar(e, rng, alvo) {
      if (!alvo) {
        const novo = conhecerAmigo(e, rng, 'atividade');
        ganho(e, 'social', 3);
        return `Você puxou assunto e acabou fazendo uma amizade nova: ${primeiroNome(novo.nome)}.`;
      }
      const a = mexerNoAmigo(e, alvo, 9);
      ganho(e, 'social', 3); ganho(e, 'felicidade', 3); ganharAfinidade(e, 'comercial', 1);
      return a ? `Você e ${primeiroNome(a.nome)} passaram uma tarde ótima juntas.` : 'Foi um ótimo encontro.';
    },
  },
  // ----- Vida adulta -----
  {
    id: 'encontro', nome: 'Sair com quem você ama', descricao: 'Um jantar, um passeio, tempo só de vocês.', idadeMin: 18, idadeMax: 99, alvo: null,
    disponivel: (e) => Boolean(e.pessoa.parceiro),
    aplicar(e) {
      const par = e.pessoa.parceiro;
      par.relacao = Math.min(100, par.relacao + 10);
      e.dinheiro -= 150;
      ganho(e, 'felicidade', 4);
      return `Você e ${primeiroNome(par.nome)} tiveram uma noite só de vocês dois.`;
    },
  },
  {
    id: 'tempo-filhos', nome: 'Passar o dia com os filhos', descricao: 'Brincar, ouvir, estar presente.', idadeMin: 18, idadeMax: 99, alvo: null,
    disponivel: (e) => e.pessoa.filhos.length > 0,
    aplicar(e) {
      for (const f of e.pessoa.filhos) f.relacao = Math.min(100, f.relacao + 10);
      ganho(e, 'felicidade', 4);
      if (e.modo === 'carreira') e.cansaco = Math.min(100, e.cansaco + 5);
      return 'Foi um dia cansativo e inesquecível.';
    },
  },
  {
    id: 'curso', nome: 'Fazer um curso', descricao: 'Aperfeiçoar o que mais precisa (R$ 600).', idadeMin: 18, idadeMax: 99, alvo: null,
    disponivel: (e) => e.modo === 'carreira' && e.dinheiro >= 600,
    aplicar(e, rng) {
      const fracos = Object.entries(e.atributos).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([a]) => a);
      const alvo = rng.escolher(fracos);
      e.atributos[alvo] = Math.min(99, e.atributos[alvo] + 1);
      e.overall = calcularOverall(e.atributos, e.perfil);
      e.dinheiro -= 600;
      e.cansaco = Math.min(100, e.cansaco + 5);
      return `O curso melhorou seu ${ROTULOS[alvo].toLowerCase()}.`;
    },
  },
];

export const atividadePorId = (id) => ATIVIDADES.find((a) => a.id === id);

export function atividadesDisponiveis(estado) {
  return ATIVIDADES.filter((a) => estado.idade >= a.idadeMin && estado.idade <= a.idadeMax && (!a.disponivel || a.disponivel(estado)));
}

export function tempoLivreDoAno(idade) {
  if (idade >= 18) return 2;
  return idade <= 10 ? 3 : 4;
}

// Gasta uma unidade de tempo livre. `alvo` é o id do parente ou do amigo, quando a atividade pede.
export function fazerAtividade(estado, rng, id, alvo = null) {
  const p = estado.pessoa;
  if (!p) throw new Error('Esta carreira não tem vida pessoal.');
  if (estado.pendencia) throw new Error(`Resolva a pendência antes: ${estado.pendencia.tipo}.`);
  const ativ = atividadePorId(id);
  if (!ativ) throw new Error(`Atividade inválida: ${id}`);
  if (estado.idade < ativ.idadeMin || estado.idade > ativ.idadeMax || (ativ.disponivel && !ativ.disponivel(estado))) throw new Error('Essa atividade não está disponível agora.');
  if (p.tempoLivre <= 0) throw new Error('Você já usou todo o tempo livre deste ano.');
  if (ativ.alvo === 'familia' && !p.familia.some((f) => f.vivo && f.id === alvo)) throw new Error('Escolha um parente.');
  if (ativ.alvo === 'amigo' && alvo && !p.amigos.some((a) => a.id === alvo)) throw new Error('Escolha um amigo.');
  p.tempoLivre -= 1;
  const texto = ativ.aplicar(estado, rng, alvo);
  registrarDiario(estado, `${ativ.nome}: ${texto}`, 'atividade');
  return texto;
}
