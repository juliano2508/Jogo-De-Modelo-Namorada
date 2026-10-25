// Mundo fictício: nomes parodiados, sem dados reais.
// Os nomes são provisórios e podem ser trocados à vontade.

// tier 1 = agências de elite, 2 = médias, 3 = menores
export const AGENCIAS = [
  { id: 'elitte', nome: 'Elitte Models', tier: 1 },
  { id: 'fjord', nome: 'Fjord Models', tier: 1 },
  { id: 'nexxt', nome: 'Nexxt Management', tier: 1 },
  { id: 'imj', nome: 'IMJ Management', tier: 1 },
  { id: 'wowmen', nome: 'Wowmen Paris', tier: 1 },
  { id: 'stormy', nome: 'Stormy Models', tier: 1 },
  { id: 'vivva', nome: 'Vivva Models', tier: 1 },
  { id: 'mikas', nome: 'Mikas Management', tier: 2 },
  { id: 'premiere', nome: 'Première Models', tier: 2 },
  { id: 'dnamodelz', nome: 'DNA Modelz', tier: 2 },
  { id: 'supremme', nome: 'Supremme', tier: 2 },
  { id: 'ladies', nome: 'The Ladies Agency', tier: 2 },
  { id: 'milano', nome: 'Milano Faces', tier: 2 },
  { id: 'londra', nome: 'Londra Talent', tier: 2 },
  { id: 'novayork', nome: 'Nova York Select', tier: 2 },
  { id: 'brasa', nome: 'Brasa Models', tier: 2 },
  { id: 'paulista', nome: 'Paulista Management', tier: 2 },
  { id: 'next-gen', nome: 'Next Gen Faces', tier: 3 },
  { id: 'urbana', nome: 'Urbana Models', tier: 3 },
  { id: 'primeira', nome: 'Primeira Linha', tier: 3 },
  { id: 'fashion-hub', nome: 'Fashion Hub', tier: 3 },
  { id: 'estrela', nome: 'Estrela Talentos', tier: 3 },
  { id: 'catwalkers', nome: 'Catwalkers', tier: 3 },
  { id: 'modelando', nome: 'Modelando', tier: 3 },
  { id: 'glam', nome: 'Glam & Co', tier: 3 },
  { id: 'bella-agency', nome: 'Bella Agency', tier: 3 },
  { id: 'atelie', nome: 'Ateliê Models', tier: 3 },
  { id: 'luna', nome: 'Luna Management', tier: 3 },
  { id: 'norte', nome: 'Norte Faces', tier: 3 },
  { id: 'sul', nome: 'Sul Models', tier: 3 },
];

// Agências do circuito regional (ponto de partida da carreira)
export const AGENCIAS_REGIONAIS = [
  { id: 'reg-curitiba', nome: 'Pinhão Models', tier: 4 },
  { id: 'reg-serra', nome: 'Serra Talentos', tier: 4 },
  { id: 'reg-litoral', nome: 'Litoral Faces', tier: 4 },
  { id: 'reg-capital', nome: 'Capital Casting', tier: 4 },
];

// prestigio: 1 a 100 (quanto maior, maior o cachê e a fama gerada)
export const MARCAS = [
  { id: 'chanelle', nome: 'Chanelle', prestigio: 98 },
  { id: 'guchi', nome: 'Guchi', prestigio: 95 },
  { id: 'prado', nome: 'Prado', prestigio: 93 },
  { id: 'louis-vuiton', nome: 'Louis Vuiton', prestigio: 96 },
  { id: 'diorre', nome: 'Diorre', prestigio: 94 },
  { id: 'versacce', nome: 'Versacce', prestigio: 88 },
  { id: 'armanni', nome: 'Armanni', prestigio: 86 },
  { id: 'zarra', nome: 'Zarra', prestigio: 55 },
  { id: 'hem', nome: 'H&N', prestigio: 48 },
  { id: 'rennier', nome: 'Rennier', prestigio: 60 },
  { id: 'moda-sul', nome: 'Moda Sul', prestigio: 30 },
  { id: 'loja-centro', nome: 'Loja do Centro', prestigio: 15 },
];

export const REVISTAS = [
  { id: 'vague', nome: 'Vague', prestigio: 98 },
  { id: 'ellie', nome: 'Ellie', prestigio: 85 },
  { id: 'harpers', nome: 'Harpers Bazar', prestigio: 90 },
  { id: 'glamur', nome: 'Glamur', prestigio: 70 },
  { id: 'cosmopolitana', nome: 'Cosmopolitana', prestigio: 65 },
  { id: 'revista-local', nome: 'Revista Cidade', prestigio: 20 },
];

// As quatro semanas de moda da temporada (semana em que acontecem)
export const SEMANAS_DE_MODA = [
  { id: 'ny', nome: 'Semana de Moda de Nova York', semana: 8 },
  { id: 'londres', nome: 'Semana de Moda de Londres', semana: 17 },
  { id: 'milao', nome: 'Semana de Moda de Milão', semana: 26 },
  { id: 'paris', nome: 'Semana de Moda de Paris', semana: 35 },
];

export const SEMANAS_POR_TEMPORADA = 40;

// Modelos rivais (nomes parodiados)
export const RIVAIS = [
  { id: 'gizele', nome: 'Gizele Bundchen Jr.', overall: 92 },
  { id: 'naomy', nome: 'Naomy Camble', overall: 90 },
  { id: 'bela', nome: 'Bela Hadyd', overall: 88 },
  { id: 'kara', nome: 'Kara Delevin', overall: 85 },
  { id: 'adriana', nome: 'Adriana Lyma', overall: 84 },
  { id: 'heidy', nome: 'Heidy Klumm', overall: 82 },
  { id: 'candis', nome: 'Candis Swanepool', overall: 80 },
  { id: 'kendal', nome: 'Kendal Jenners', overall: 78 },
];

export const CIDADES_DE_ORIGEM = [
  'Curitiba', 'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Porto Alegre',
  'Florianópolis', 'Salvador', 'Recife', 'Fortaleza', 'Brasília', 'Outra',
];
