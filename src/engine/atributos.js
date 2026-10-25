// Atributos da modelo (escala 25 a 99) e cálculo do overall.

export const ATTR_MIN = 25;
export const ATTR_MAX = 99;

export const ATRIBUTOS = [
  'passarela',
  'fotogenia',
  'expressao',
  'carisma',
  'versatilidade',
  'profissionalismo',
  'resistencia',
  'saude',
];

export const ROTULOS = {
  passarela: 'Passarela',
  fotogenia: 'Fotogenia',
  expressao: 'Expressão',
  carisma: 'Carisma',
  versatilidade: 'Versatilidade',
  profissionalismo: 'Profissionalismo',
  resistencia: 'Resistência',
  saude: 'Saúde',
};

export const limitar = (valor) =>
  Math.max(ATTR_MIN, Math.min(ATTR_MAX, Math.round(valor)));

// Perfis iniciais: bônus no começo e pesos usados no overall.
export const PERFIS = {
  passarela: {
    nome: 'Passarela',
    bonus: { passarela: 14, resistencia: 5, fotogenia: -2 },
    pesos: { passarela: 3, fotogenia: 1, expressao: 1, carisma: 1.5, versatilidade: 1, profissionalismo: 1.5, resistencia: 1.5, saude: 1 },
  },
  editorial: {
    nome: 'Editorial',
    bonus: { fotogenia: 12, expressao: 10, passarela: -2 },
    pesos: { passarela: 1, fotogenia: 3, expressao: 2.5, carisma: 1.5, versatilidade: 1, profissionalismo: 1.5, resistencia: 1, saude: 1 },
  },
  comercial: {
    nome: 'Comercial',
    bonus: { carisma: 12, profissionalismo: 8, versatilidade: 4 },
    pesos: { passarela: 1, fotogenia: 2, expressao: 1.5, carisma: 3, versatilidade: 2, profissionalismo: 2, resistencia: 1, saude: 1 },
  },
  versatil: {
    nome: 'Versátil',
    bonus: { versatilidade: 14, expressao: 4, carisma: 3 },
    pesos: { passarela: 1.5, fotogenia: 2, expressao: 1.5, carisma: 2, versatilidade: 3, profissionalismo: 1.5, resistencia: 1, saude: 1 },
  },
};

export function calcularOverall(atributos, perfilId) {
  const { pesos } = PERFIS[perfilId];
  let soma = 0;
  let total = 0;
  for (const a of ATRIBUTOS) {
    soma += atributos[a] * pesos[a];
    total += pesos[a];
  }
  return Math.round(soma / total);
}
