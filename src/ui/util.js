// Utilitários de interface: criação de elementos (sem innerHTML, para nunca interpretar texto digitado
// como HTML) e formatadores em português do Brasil.

export function h(tag, attrs, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (['value', 'checked', 'disabled', 'selected'].includes(k)) el[k] = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  const anexar = (f) => {
    if (f === null || f === undefined || f === false) return;
    if (Array.isArray(f)) f.forEach(anexar);
    else el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  };
  filhos.forEach(anexar);
  return el;
}

export const dinheiro = (n) => {
  const v = Math.round(n);
  return `${v < 0 ? '−' : ''}R$ ${Math.abs(v).toLocaleString('pt-BR')}`;
};
export const dinheiroCurto = (n) => {
  const a = Math.abs(n);
  const sinal = n < 0 ? '−' : '';
  if (a >= 1_000_000) return `${sinal}R$ ${(a / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  if (a >= 10_000) return `${sinal}R$ ${Math.round(a / 1000)} mil`;
  return dinheiro(n);
};
export const pct = (x) => `${Math.round(x * 100)}%`;
export const sinal = (n, casas = 0) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(casas).replace('.', ',')}`;

// Barra de progresso acessível (valor de 0 a max).
export function barra(valor, max = 100, { classe = '', rotulo = '' } = {}) {
  const p = Math.max(0, Math.min(100, (valor / max) * 100));
  return h('div', { class: `barra ${classe}`, role: 'progressbar', 'aria-valuenow': Math.round(valor), 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-label': rotulo },
    h('span', { style: `width:${p}%` }));
}

export const FASE_NOME = {
  regional: 'Circuito regional',
  alternativo: 'Circuito alternativo',
  profissional: 'Carreira profissional',
  aposentada: 'Aposentada',
};

export const TIER_NOME = { 1: 'Elite', 2: 'Grande', 3: 'Média', 4: 'Local' };

export const PERFIL_TEXTO = {
  passarela: 'Nasceu para o desfile: postura, ritmo e presença na passarela. Brilha nas semanas de moda.',
  editorial: 'Câmera e emoção: ensaios e capas de revista são o seu território.',
  comercial: 'Simpatia e carisma: castings e campanhas publicitárias abrem portas para você.',
  versatil: 'Faz de tudo um pouco: nenhum ponto fraco, adapta-se a qualquer cliente.',
};

export const DIFICULDADE_TEXTO = {
  facil: 'Olheiros mais precisos, menos lesões e menos eventos ruins. Para curtir a história.',
  normal: 'O equilíbrio pensado para o jogo: vale planejar o dinheiro e as relações.',
  dificil: 'Olheiros imprecisos, mais lesões e mais eventos negativos. A carreira cobra caro.',
};

export const TIPO_EVENTO_ROTULO = {
  fase: 'Carreira', selecao: 'Seleção', contrato: 'Contrato', troca: 'Troca', chamada: 'Chamada',
  lesao: 'Lesão', evento: 'Evento', rival: 'Rival', aposentadoria: 'Aposentadoria', marco: 'Marco',
};

export function toast(texto, tipo = 'info') {
  let area = document.getElementById('toasts');
  if (!area) {
    area = h('div', { id: 'toasts', 'aria-live': 'polite' });
    document.body.append(area);
  }
  const t = h('div', { class: `toast ${tipo}` }, texto);
  area.append(t);
  setTimeout(() => t.remove(), tipo === 'erro' ? 6000 : 3500);
}
