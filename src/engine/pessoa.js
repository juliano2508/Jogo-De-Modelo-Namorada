// A pessoa por trás da modelo: família, amigos, escola, estatísticas pessoais e o diário de vida.
// Tudo é dado simples (serializável). Nada aqui mexe em regras da carreira.

const limitar = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));

export const NOMES_F = [
  'Ana', 'Beatriz', 'Camila', 'Daniela', 'Eduarda', 'Fernanda', 'Gabriela', 'Helena', 'Isabela', 'Julia',
  'Larissa', 'Mariana', 'Natália', 'Olívia', 'Patrícia', 'Rafaela', 'Sofia', 'Tatiana', 'Valentina', 'Yasmin',
  'Letícia', 'Carolina', 'Amanda', 'Bianca', 'Luana', 'Renata', 'Clara', 'Vitória', 'Manuela', 'Alice',
];
export const NOMES_M = [
  'Arthur', 'Bruno', 'Caio', 'Diego', 'Eduardo', 'Felipe', 'Gabriel', 'Henrique', 'Igor', 'João',
  'Lucas', 'Mateus', 'Nicolas', 'Otávio', 'Pedro', 'Rafael', 'Samuel', 'Thiago', 'Vinícius', 'Rodrigo',
  'André', 'Fábio', 'Gustavo', 'Leonardo', 'Marcelo', 'Paulo', 'Ricardo', 'Sérgio', 'Davi', 'Miguel',
];
export const SOBRENOMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima',
  'Araújo', 'Fernandes', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Ribeiro', 'Alves', 'Monteiro', 'Mendes',
  'Barros', 'Freitas', 'Barbosa', 'Pinto', 'Moreira', 'Cavalcante', 'Dias', 'Castro', 'Campos', 'Cardoso',
];

export const CLASSES = {
  humilde: {
    nome: 'família humilde', dinheiro: 0.5, estudos: -6, felicidade: -2,
    profissoes: ['diarista', 'auxiliar de limpeza', 'motorista de aplicativo', 'vendedora ambulante', 'ajudante de obras', 'cozinheira'],
  },
  media: {
    nome: 'família de classe média', dinheiro: 1, estudos: 0, felicidade: 0,
    profissoes: ['professora', 'enfermeiro', 'comerciante', 'bancária', 'técnico em informática', 'secretária'],
  },
  confortavel: {
    nome: 'família confortável', dinheiro: 2, estudos: 5, felicidade: 2,
    profissoes: ['advogada', 'engenheiro', 'médica', 'empresário', 'arquiteta', 'dentista'],
  },
};

export const STATS_PESSOAIS = ['felicidade', 'saude', 'estudos', 'social', 'criatividade', 'disciplina'];
export const ROTULOS_STATS = {
  felicidade: 'Felicidade', saude: 'Saúde', estudos: 'Estudos', social: 'Vida social', criatividade: 'Criatividade', disciplina: 'Disciplina',
};

// Identificadores saem só do gerador aleatório: a mesma semente gera sempre os mesmos ids.
const novoId = (prefixo, rng) => `${prefixo}-${rng.inteiro(100000, 999999)}`;

export function nomeAleatorio(rng, sexo) {
  return rng.escolher(sexo === 'm' ? NOMES_M : NOMES_F);
}

function criarParente(rng, papel, nome, idade, sobrenome, profissao, relacaoBase = 65) {
  return {
    id: novoId(papel, rng), papel, nome: `${nome} ${sobrenome}`, idade, vivo: true, ausente: false, profissao,
    relacao: limitar(Math.round(relacaoBase + rng.normal(0, 10))),
  };
}

// Gera a pessoa já com a família. `idade` é a idade da modelo no começo da história (0 ou 18).
export function criarPessoa(rng, { idade = 0, sobrenome = null } = {}) {
  const classeId = rng.escolher(['humilde', 'humilde', 'media', 'media', 'media', 'confortavel']);
  const classe = CLASSES[classeId];
  const sn = sobrenome ?? rng.escolher(SOBRENOMES);
  const familia = [];

  const mae = criarParente(rng, 'mae', nomeAleatorio(rng, 'f'), idade + rng.inteiro(20, 36), sn, rng.escolher(classe.profissoes), 72);
  familia.push(mae);
  const paiAusente = rng.chance(0.15);
  const pai = criarParente(rng, 'pai', nomeAleatorio(rng, 'm'), idade + rng.inteiro(22, 40), sn, rng.escolher(classe.profissoes), paiAusente ? 30 : 65);
  pai.ausente = paiAusente;
  familia.push(pai);

  const irmaos = rng.escolher([0, 0, 1, 1, 1, 2]);
  for (let i = 0; i < irmaos; i++) {
    const sexo = rng.chance(0.5) ? 'f' : 'm';
    const diferenca = rng.inteiro(1, 8) * (rng.chance(0.5) ? 1 : -1);
    const idadeIrmao = Math.max(0, idade + diferenca);
    familia.push(criarParente(rng, sexo === 'f' ? 'irma' : 'irmao', nomeAleatorio(rng, sexo), idadeIrmao, sn, null, 60));
  }
  if (rng.chance(0.8)) {
    familia.push(criarParente(rng, 'avo', nomeAleatorio(rng, 'f'), mae.idade + rng.inteiro(21, 28), sn, null, 75));
  }

  const base = (extra) => limitar(Math.round(50 + rng.normal(0, 8) + extra));
  return {
    classe: classeId,
    sobrenome: sn,
    stats: {
      felicidade: base(classe.felicidade + 10), saude: base(20), estudos: base(classe.estudos), social: base(0), criatividade: base(0), disciplina: base(0),
    },
    afinidades: { passarela: 0, editorial: 0, comercial: 0, versatil: 0 },
    atividadePrincipal: null,
    tempoLivre: 0,
    familia,
    amigos: [],
    parceiro: null,
    ex: [],
    filhos: [],
    habitos: { sono: 1, exercicio: 1, bebida: 0, cigarro: 0, autocuidado: 0 },
    eventosVistos: [],
    fila: [], // eventos do ano ainda por acontecer
    aguardandoCarreira: false,
  };
}

// ---------- Estatísticas e relacionamentos ----------

export function mudarStat(estado, stat, delta) {
  if (!estado.pessoa) return;
  const s = estado.pessoa.stats;
  s[stat] = limitar(Math.round(s[stat] + delta));
}

export function ganharAfinidade(estado, perfil, pontos = 1) {
  if (estado.pessoa) estado.pessoa.afinidades[perfil] += pontos;
}

export const parentesco = (estado, papel) => estado.pessoa.familia.find((p) => p.papel === papel) ?? null;
export const irmaos = (estado) => estado.pessoa.familia.filter((p) => p.papel === 'irmao' || p.papel === 'irma');
export const familiaViva = (estado) => estado.pessoa.familia.filter((p) => p.vivo);

export function mudarRelacaoPessoa(pessoa, delta) {
  pessoa.relacao = limitar(Math.round(pessoa.relacao + delta));
}

// Procura alguém da família pelo papel ('mae', 'pai', 'avo') ou id e mexe na relação.
export function mexerNaFamilia(estado, alvo, delta) {
  const p = estado.pessoa.familia.find((x) => x.vivo && (x.papel === alvo || x.id === alvo));
  if (p) mudarRelacaoPessoa(p, delta);
  return p ?? null;
}

export function conhecerAmigo(estado, rng, origem = 'escola') {
  const sexo = rng.chance(0.7) ? 'f' : 'm';
  const nome = `${nomeAleatorio(rng, sexo)} ${rng.escolher(SOBRENOMES)}`;
  const amigo = { id: novoId('amigo', rng), nome, idade: Math.max(0, estado.idade + rng.inteiro(-1, 1)), relacao: rng.inteiro(40, 65), origem, desde: estado.idade };
  estado.pessoa.amigos.push(amigo);
  return amigo;
}

export function mexerNoAmigo(estado, id, delta) {
  const a = estado.pessoa.amigos.find((x) => x.id === id);
  if (a) mudarRelacaoPessoa(a, delta);
  return a ?? null;
}

// ---------- Diário ----------

export function registrarDiario(estado, texto, tipo = 'vida') {
  if (!estado.diario) estado.diario = [];
  estado.diario.push({ idade: estado.idade, temporada: estado.temporada, texto, tipo });
  if (estado.diario.length > 600) estado.diario.splice(0, estado.diario.length - 600);
}

// Passagem de ano para as pessoas ao redor: todo mundo envelhece e as relações esfriam um pouco.
export function envelhecerPessoas(estado, rng) {
  const p = estado.pessoa;
  for (const parente of p.familia) {
    if (!parente.vivo) continue;
    parente.idade += 1;
    // Sem cuidado, a relação esfria devagar rumo ao neutro; pai ausente quase não muda.
    parente.relacao = limitar(Math.round(parente.relacao + (55 - parente.relacao) * 0.04));
  }
  const saem = [];
  for (const amigo of p.amigos) {
    amigo.idade += 1;
    amigo.relacao = limitar(Math.round(amigo.relacao - 3 - (rng.chance(0.15) ? 8 : 0)));
    if (amigo.relacao < 12) saem.push(amigo);
  }
  for (const amigo of saem) {
    p.amigos.splice(p.amigos.indexOf(amigo), 1);
    registrarDiario(estado, `Você e ${amigo.nome.split(' ')[0]} acabaram se afastando.`, 'amizade');
  }
  if (p.parceiro) p.parceiro.idade += 1;
  for (const f of p.filhos) f.idade += 1;
}
