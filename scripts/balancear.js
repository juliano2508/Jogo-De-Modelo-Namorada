// Roda várias carreiras no automático e mostra quantas ficam no vermelho, para calibrar a Vida.
// Uso: node scripts/balancear.js [carreiras=40] [temporadas=15] [dificuldade=normal]

import { simularCarreira, POLITICAS_VIDA, PERFIS } from '../src/engine/index.js';

const carreiras = Number(process.argv[2] ?? 40);
const temporadas = Number(process.argv[3] ?? 15);
const dificuldade = process.argv[4] ?? 'normal';
const perfis = Object.keys(PERFIS);

const mediana = (v) => {
  const o = [...v].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)];
};

const linhas = [];
for (const politica of Object.keys(POLITICAS_VIDA)) {
  const metricas = [];
  for (let i = 0; i < carreiras; i++) {
    const { metricas: m } = simularCarreira({
      semente: 1000 + i,
      perfil: perfis[i % perfis.length],
      dificuldade,
      politica,
      temporadas,
    });
    metricas.push(m);
  }
  const noVermelho = metricas.filter((m) => m.ficouNoVermelho).length;
  const terminouNegativa = metricas.filter((m) => m.dinheiroFinal < 0).length;
  const profissionais = metricas.filter((m) => m.faseFinal === 'profissional').length;
  linhas.push({
    politica,
    carreiras,
    'no vermelho alguma vez (%)': Math.round((noVermelho / carreiras) * 100),
    'terminou negativa (%)': Math.round((terminouNegativa / carreiras) * 100),
    'semanas no vermelho (mediana)': mediana(metricas.map((m) => m.semanasNoVermelho)),
    'dinheiro final (mediana)': mediana(metricas.map((m) => m.dinheiroFinal)),
    'chegou ao profissional (%)': Math.round((profissionais / carreiras) * 100),
    'fama final (mediana)': mediana(metricas.map((m) => m.fama)),
  });
}
console.log(`Dificuldade: ${dificuldade} | ${temporadas} temporadas por carreira`);
console.table(linhas);
