import assert from 'node:assert/strict';
import {
  ATRIBUTOS, ATTR_MIN, ATTR_MAX, PERFIS, SEMANAS_POR_TEMPORADA,
  criarJogo, gerarAgenda, simularSemana, escolherAutomatico, simularTemporada,
} from '../src/engine/index.js';

function checarEstado(estado) {
  for (const a of ATRIBUTOS) {
    assert.ok(estado.atributos[a] >= ATTR_MIN && estado.atributos[a] <= ATTR_MAX, `${a} fora da escala: ${estado.atributos[a]}`);
  }
  assert.ok(estado.overall >= ATTR_MIN && estado.overall <= ATTR_MAX, 'overall fora da escala');
  assert.ok(estado.fama >= 0 && estado.fama <= 100, 'fama fora de 0-100');
  assert.ok(estado.cansaco >= 0 && estado.cansaco <= 100, 'cansaço fora de 0-100');
  assert.ok(Number.isFinite(estado.dinheiro), 'dinheiro inválido');
}

// 1) Mesma semente, mesma carreira.
{
  const a = criarJogo({ perfil: 'editorial', semente: 123 });
  const b = criarJogo({ perfil: 'editorial', semente: 123 });
  for (let i = 0; i < 3; i++) { simularTemporada(a.estado, a.rng); simularTemporada(b.estado, b.rng); }
  assert.deepEqual(a.estado, b.estado, 'mesma semente deveria gerar o mesmo resultado');
}

// 2) Uma temporada tem 40 semanas e respeita os limites.
{
  const { estado, rng } = criarJogo({ semente: 7 });
  simularTemporada(estado, rng);
  assert.equal(estado.historico.length, SEMANAS_POR_TEMPORADA);
  assert.equal(estado.temporada, 2);
  assert.equal(estado.idade, 19);
  checarEstado(estado);
}

// 3) Todos os perfis rodam 20 temporadas sem estourar nenhum limite.
for (const perfil of Object.keys(PERFIS)) {
  for (let semente = 1; semente <= 10; semente++) {
    const { estado, rng } = criarJogo({ perfil, semente });
    for (let t = 0; t < 20; t++) {
      simularTemporada(estado, rng);
      checarEstado(estado);
    }
  }
}

// 4) A energia não passa da capacidade e a semana de moda traz desfiles extras.
{
  const { estado, rng } = criarJogo({ semente: 99 });
  while (estado.semana < 8) { gerarAgenda(estado, rng); simularSemana(estado, rng, []); }
  const agenda = gerarAgenda(estado, rng);
  assert.ok(agenda.filter((o) => o.tipo === 'desfile').length >= 2, 'semana de moda sem desfiles extras');
  const escolhidas = escolherAutomatico(estado);
  const custo = escolhidas.reduce((s, id) => s + agenda.find((o) => o.id === id).custo, 0);
  assert.ok(custo <= 100, 'escolha automática passou da energia');
}

// Resumo para balanceamento (não é uma checagem, só informação).
const { estado, rng } = criarJogo({ perfil: 'versatil', semente: 2025 });
for (let t = 0; t < 10; t++) simularTemporada(estado, rng);
console.table(estado.resumos.map(({ temporada, idade, trabalhos, destaques, ganhos, fama, overall }) => ({ temporada, idade, trabalhos, destaques, ganhos, fama, overall })));
console.log('Todos os testes passaram.');
