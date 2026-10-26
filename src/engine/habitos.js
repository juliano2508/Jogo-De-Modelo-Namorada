// Hábitos da vida adulta: sono, exercício, bebida, cigarro e saúde mental.
// Sem peso, dieta ou aparência corporal: aqui só entra o que afeta energia, saúde, humor e carreira.
// Bebida e cigarro só existem depois dos 18 e podem criar dependência.

import { INFLACAO_ANUAL } from './config.js';
import { registrarDiario } from './pessoa.js';

export const HABITOS = {
  sono: {
    nome: 'Sono', descricao: 'Dormir bem é o que mais recupera o corpo entre uma semana de moda e outra.',
    niveis: [{ nome: 'Irregular', custo: 0 }, { nome: 'Regular', custo: 0 }, { nome: 'Descanso de qualidade', custo: 60 }],
  },
  exercicio: {
    nome: 'Exercício', descricao: 'Movimento protege a saúde e a resistência, mas treino pesado também cansa.',
    niveis: [{ nome: 'Sedentária', custo: 0 }, { nome: 'Leve (caminhadas)', custo: 0 }, { nome: 'Regular (academia, pilates)', custo: 120 }, { nome: 'Intenso (com personal)', custo: 300 }],
  },
  bebida: {
    nome: 'Bebida', descricao: 'Ajuda na vida social dos bastidores, mas cobra caro em saúde e disposição quando vira rotina.',
    niveis: [{ nome: 'Não bebo', custo: 0 }, { nome: 'Socialmente', custo: 40 }, { nome: 'Com frequência', custo: 120 }],
  },
  cigarro: {
    nome: 'Cigarro', descricao: 'Pesa na saúde e na resistência, e é difícil de largar.',
    niveis: [{ nome: 'Não fumo', custo: 0 }, { nome: 'Ocasionalmente', custo: 30 }, { nome: 'Regularmente', custo: 90 }],
  },
  autocuidado: {
    nome: 'Saúde mental', descricao: 'Cuidar da cabeça sustenta a carreira, o humor e os relacionamentos.',
    niveis: [{ nome: 'Sem rotina', custo: 0 }, { nome: 'Rotina de autocuidado', custo: 40 }, { nome: 'Terapia semanal', custo: 250 }],
  },
};

export const CHAVES_HABITO = Object.keys(HABITOS);
export const SUBSTANCIAS = ['bebida', 'cigarro'];
export const DEPENDENCIA_TRAVA = 60; // acima disso não dá para largar sozinha
export const DEPENDENCIA_AJUDA_MIN = 35;

const inflacao = (e) => (1 + INFLACAO_ANUAL) ** (e.temporada - 1);
const limitar = (v, min, max) => Math.max(min, Math.min(max, v));

export const nivelMaximoHabito = (h) => HABITOS[h].niveis.length - 1;

export function custoHabitosSemanal(estado) {
  if (!estado.pessoa || estado.modo === 'vida') return 0;
  let total = 0;
  for (const h of CHAVES_HABITO) total += HABITOS[h].niveis[estado.pessoa.habitos[h]].custo;
  return Math.round(total * inflacao(estado));
}

// Cuidar dos filhos custa dinheiro e energia.
export function custoFilhosSemanal(estado) {
  if (!estado.pessoa) return 0;
  const menores = estado.pessoa.filhos.filter((f) => f.idade < 18).length;
  return Math.round(menores * 150 * inflacao(estado));
}

export function energiaDosFilhos(estado) {
  if (!estado.pessoa) return 0;
  let perda = 0;
  for (const f of estado.pessoa.filhos) perda += f.idade < 6 ? 4 : f.idade < 13 ? 2 : 0;
  return Math.min(10, perda);
}

// Efeitos semanais dos hábitos na carreira.
export function efeitosHabitos(estado) {
  const zero = { recuperacao: 0, chance: 0, lesao: 0, bastidores: 0 };
  if (!estado.pessoa || estado.modo === 'vida') return zero;
  const h = estado.pessoa.habitos;
  const r = { ...zero };
  r.recuperacao += [-1.5, 0, 1][h.sono];
  r.chance += [-0.02, 0, 0.004][h.sono];
  r.recuperacao += [0, 0, 0, -0.5][h.exercicio];
  r.chance += [0, 0, 0.004, 0.008][h.exercicio];
  r.lesao += [0.1, 0, -0.05, -0.03][h.exercicio];
  r.bastidores += [0, 0.05, 0][h.bebida];
  r.recuperacao += [0, 0, -1][h.bebida];
  r.chance += [0, 0, -0.02][h.bebida];
  r.lesao += [0, 0, 0.1][h.bebida];
  r.recuperacao += [0, -0.5, -1][h.cigarro];
  r.chance += [0, 0, -0.01][h.cigarro];
  r.recuperacao += [0, 0.3, 0.6][h.autocuidado];
  // Humor também pesa um pouco: bem-estar ajuda, desânimo atrapalha.
  r.chance += (estado.pessoa.stats.felicidade - 65) / 2400;
  return r;
}

export function mudarHabito(estado, habito, nivel) {
  if (!HABITOS[habito]) throw new Error(`Hábito inválido: ${habito}`);
  if (estado.modo === 'vida' || estado.idade < 18) throw new Error('Os hábitos só se escolhem a partir dos 18 anos.');
  if (!Number.isInteger(nivel) || nivel < 0 || nivel > nivelMaximoHabito(habito)) throw new Error(`Nível inválido para ${habito}: ${nivel}`);
  const p = estado.pessoa;
  if (SUBSTANCIAS.includes(habito) && nivel < p.habitos[habito] && p.dependencia[habito] >= DEPENDENCIA_TRAVA && nivel < 1) {
    throw new Error('Você não consegue parar sozinha. É hora de buscar ajuda profissional.');
  }
  p.habitos[habito] = nivel;
}

export function custoDeAjuda(estado) {
  return Math.round(2500 * inflacao(estado));
}

// Tratamento: afasta do trabalho por 6 semanas e zera o hábito.
export function buscarAjuda(estado, substancia) {
  if (!SUBSTANCIAS.includes(substancia)) throw new Error(`Substância inválida: ${substancia}`);
  const p = estado.pessoa;
  if (estado.pendencia) throw new Error(`Resolva a pendência antes: ${estado.pendencia.tipo}.`);
  if (p.dependencia[substancia] < DEPENDENCIA_AJUDA_MIN && p.habitos[substancia] < 2) throw new Error('Você ainda não precisa de tratamento para isso.');
  const custo = custoDeAjuda(estado);
  if (estado.dinheiro < custo) throw new Error('Dinheiro insuficiente para o tratamento.');
  estado.dinheiro -= custo;
  p.habitos[substancia] = 0;
  p.dependencia[substancia] = 15;
  p.stats.felicidade = limitar(p.stats.felicidade + 8, 0, 100);
  estado.lesao = { semanasRestantes: 6, licenca: true, motivo: 'tratamento' };
  estado.cansaco = limitar(estado.cansaco + 10, 0, 100);
  registrarDiario(estado, `Você buscou ajuda profissional e se afastou 6 semanas. Foi difícil, e foi o passo certo.`, 'saude');
  return custo;
}

// Fim de temporada: os hábitos de um ano inteiro viram saúde, resistência, humor e dependência.
export function aplicarHabitosAnuais(estado, rng) {
  const p = estado.pessoa;
  if (!p || estado.modo === 'vida') return;
  const h = p.habitos;
  const saude = [-1, 0, 0][h.sono] + [-1, 0, rng.chance(0.5) ? 1 : 0, 1][h.exercicio] + [0, 0, -1][h.bebida] + [0, -1, -2][h.cigarro];
  const resistencia = (h.exercicio >= 3 && rng.chance(0.5) ? 1 : 0) + [0, 0, -1][h.cigarro];
  estado.atributos.saude = limitar(estado.atributos.saude + saude, 25, 99);
  estado.atributos.resistencia = limitar(estado.atributos.resistencia + resistencia, 25, 99);
  const felicidade = [0, 1, 3][h.autocuidado] + [-2, 0, 0][h.sono] + [0, 0, -2][h.bebida];
  p.stats.felicidade = limitar(p.stats.felicidade + felicidade, 0, 100);

  const sobe = { bebida: [-12, 6, 18], cigarro: [-12, 12, 25] };
  for (const s of SUBSTANCIAS) p.dependencia[s] = limitar(p.dependencia[s] + sobe[s][h[s]], 0, 100);
}
