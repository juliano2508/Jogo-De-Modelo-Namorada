// Teste de ponta a ponta no navegador: joga carreiras inteiras pela interface de verdade.
// Requer o Playwright (não é dependência do projeto): `npm i -D playwright && npx playwright install chromium`.
// Uso: npm run e2e

import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

// `require` também enxerga o Playwright instalado globalmente (o `import` não).
import { createRequire } from 'node:module';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  try {
    ({ chromium } = createRequire(import.meta.url)('playwright'));
  } catch {
    console.log('Playwright não está instalado: teste de navegador ignorado.');
    process.exit(0);
  }
}

const PORTA = 8765;
const URL = `http://localhost:${PORTA}/`;
const servidor = spawn(process.execPath, ['scripts/servir.js', String(PORTA)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const navegador = await chromium.launch();
const falhas = [];

async function novaPagina(opcoes = {}) {
  const contexto = await navegador.newContext(opcoes);
  const pagina = await contexto.newPage();
  pagina.on('pageerror', (e) => falhas.push(`pageerror: ${e.message}`));
  pagina.on('console', (m) => {
    if (m.type() === 'error' && !/ERR_|Failed to load resource|fonts\./.test(m.text())) falhas.push(`console: ${m.text()}`);
  });
  await pagina.goto(URL);
  return pagina;
}

async function criarCarreira(p, { nome, perfil, dificuldade }) {
  await p.click('text=Nova carreira');
  await p.fill('#nome', nome);
  await p.click('.opcao:has-text("Aos 18 anos")');
  await p.click(`.opcao:has-text("${perfil}")`);
  await p.click(`.opcao:has-text("${dificuldade}")`);
  await p.click('text=Começar a carreira');
  await p.click('.modal button:has-text("Começar")');
}

// Resolve o que estiver na tela (janela ou botão) e devolve o título da janela tratada.
async function passo(p) {
  const modal = p.locator('.modal');
  if (await modal.count()) {
    const titulo = await modal.locator('h2').first().innerText();
    if (/Hora de decidir/.test(titulo)) await modal.locator('button:has-text("Ir à Seleção agora")').click();
    else if (/Noite da Seleção/.test(titulo)) {
      const abrir = modal.locator('button:has-text("Abrir a noite")');
      if (await abrir.count()) await abrir.click();
      else {
        await modal.locator('button:has-text("Pular para o resultado")').click();
        await modal.locator('button:has-text("Continuar")').click();
      }
    } else if (/free agency|ligaram/.test(titulo)) await modal.locator('button:has-text("Assinar")').first().click();
    else if (await modal.locator('.btn.escolha:not([disabled])').count()) await modal.locator('.btn.escolha:not([disabled])').first().click();
    else await modal.locator('button.btn').last().click();
    return titulo;
  }
  if (await p.locator('button:has-text("Encerrar temporada")').count()) await p.click('text=Encerrar temporada');
  else await p.click('text=Piloto automático da temporada');
  return null;
}

async function jogarAteOFim(p) {
  for (let i = 0; i < 2000; i++) {
    if (await p.locator('.capa').count()) return true;
    await passo(p);
  }
  return false;
}

try {
  // 1) Carreiras inteiras em dificuldades e perfis diferentes.
  for (const [perfil, dificuldade] of [['Passarela', 'Fácil'], ['Editorial', 'Normal'], ['Comercial', 'Difícil'], ['Versátil', 'Normal']]) {
    const p = await novaPagina();
    await criarCarreira(p, { nome: `Teste ${perfil}`, perfil, dificuldade });
    assert.ok(await jogarAteOFim(p), `a carreira ${perfil}/${dificuldade} não chegou ao legado`);
    assert.match(await p.locator('.capa h2').innerText(), /discreta|destaque|Hall|Lenda/i);
    console.log(`ok: carreira completa (${perfil}, ${dificuldade}): ${await p.locator('.capa h2').innerText()}`);
    await p.context().close();
  }

  // 2) Recarregar a página no meio de uma decisão: a decisão volta no lugar.
  {
    const p = await novaPagina();
    await criarCarreira(p, { nome: 'Recarga', perfil: 'Editorial', dificuldade: 'Normal' });
    for (let i = 0; i < 50; i++) {
      if (await p.locator('.modal h2:has-text("Hora de decidir")').count()) break;
      await passo(p);
    }
    assert.ok(await p.locator('.modal h2:has-text("Hora de decidir")').count(), 'não chegou à decisão da Seleção');
    await p.reload();
    await p.click('button:has-text("Continuar")');
    assert.ok(await p.locator('.modal h2:has-text("Hora de decidir")').count(), 'a decisão pendente deveria voltar depois de recarregar');
    // Recarregar logo depois de abrir a Noite da Seleção: o resultado já está salvo e nada quebra.
    await p.click('button:has-text("Ir à Seleção agora")');
    await p.reload();
    await p.click('button:has-text("Continuar")');
    assert.ok(await p.locator('.topo h1').count(), 'o painel deveria abrir normalmente');
    console.log('ok: recarregar no meio de decisões');
    await p.context().close();
  }

  // 3) Saves corrompidos ou adulterados não derrubam o jogo.
  {
    const p = await novaPagina();
    await p.evaluate(() => {
      localStorage.setItem('primeira-capa:slot:1', '{ isto não é json');
      localStorage.setItem('primeira-capa:slot:2', JSON.stringify({ versao: 1, meta: { nome: 'Fantasma', idade: 20, temporada: 2, fase: 'regional', agencia: 'X' }, estado: { nome: 'Fantasma' }, rng: 1 }));
    });
    await p.reload();
    assert.equal(await p.locator('.slot.vazio').count(), 2, 'o save em JSON inválido deveria aparecer como vazio');
    await p.click('.slot:has-text("Fantasma") button:has-text("Continuar")');
    assert.ok(await p.locator('#toasts .toast.erro').count(), 'deveria avisar que o save não abre');
    assert.ok(await p.locator('text=Nova carreira').count(), 'e continuar no menu');
    console.log('ok: saves corrompidos');
    await p.context().close();
  }

  // 4) Sem armazenamento (janela anônima, por exemplo): o jogo funciona e avisa uma vez.
  {
    const contexto = await navegador.newContext();
    await contexto.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('bloqueado'); }; });
    const p = await contexto.newPage();
    p.on('pageerror', (e) => falhas.push(`pageerror: ${e.message}`));
    await p.goto(URL);
    await criarCarreira(p, { nome: 'Sem save', perfil: 'Versátil', dificuldade: 'Normal' });
    await p.click('text=Sugestão automática');
    await p.click('button:has-text("Simular semana")');
    assert.ok(await p.locator('.resultado').count(), 'deveria simular a semana mesmo sem armazenamento');
    assert.equal(await p.locator('#toasts .toast.erro').count(), 1, 'o aviso de que não salva deve aparecer uma única vez');
    console.log('ok: sem armazenamento');
    await contexto.close();
  }

  // 5) Celular: nada de rolagem horizontal nas telas principais.
  {
    const p = await novaPagina({ viewport: { width: 360, height: 740 } });
    const larguraOk = async (rotulo) => {
      const estoura = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      assert.equal(estoura, false, `rolagem horizontal em ${rotulo}`);
    };
    await larguraOk('menu');
    await criarCarreira(p, { nome: 'Celular', perfil: 'Comercial', dificuldade: 'Normal' });
    for (const aba of ['Semana', 'Perfil', 'Vida', 'Relações', 'Carreira', 'Notícias']) {
      await p.click(`.aba-btn:has-text("${aba}")`);
      await larguraOk(aba);
    }
    await p.click('.aba-btn:has-text("Semana")');
    await p.click('text=Piloto automático da temporada');
    // A vida pessoal pode interromper o piloto com uma decisão: resolve antes de seguir.
    while (await p.locator('.modal').count()) {
      const m = p.locator('.modal');
      if (await m.locator('.btn.escolha:not([disabled])').count()) await m.locator('.btn.escolha:not([disabled])').first().click();
      else await m.locator('button.btn').last().click();
    }
    await p.click('.aba-btn:has-text("Carreira")');
    await larguraOk('Carreira com temporadas');
    console.log('ok: celular sem rolagem horizontal');
    await p.context().close();
  }

  // 6) Vida inteira desde o nascimento: infância, atividades, envelhecer, perfil nasce e a carreira segue.
  {
    const p = await novaPagina({ viewport: { width: 360, height: 740 } });
    const larguraOk = async (rotulo) => {
      const estoura = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      assert.equal(estoura, false, `rolagem horizontal em ${rotulo}`);
    };
    await p.click('text=Nova carreira');
    await p.fill('#nome', 'Do Berço');
    await p.click('button[type=submit]');
    assert.ok(await p.locator('.modal h2:has-text("Você nasceu")').count(), 'o primeiro evento é o nascimento');
    // Resolve eventos até a tela de vida liberar, usa atividades e envelhece até os 18.
    let atividadesFeitas = 0;
    for (let i = 0; i < 400; i++) {
      if (await p.locator('button:has-text("Começar a carreira de modelo")').count()) break;
      if (await p.locator('.modal').count()) {
        const m = p.locator('.modal');
        if (await m.locator('.btn.escolha').count()) await m.locator('.btn.escolha').first().click();
        else await m.locator('button.btn').last().click();
        continue;
      }
      if (atividadesFeitas < 6 && await p.locator('.atividade button:not([disabled])').count()) {
        await p.locator('.atividade button:not([disabled])').first().click();
        atividadesFeitas++;
        continue;
      }
      await p.click('button:has-text("Envelhecer")');
    }
    assert.ok(atividadesFeitas > 0, 'deveria conseguir fazer atividades');
    await larguraOk('infância');
    for (const aba of ['Família', 'Eu', 'Diário']) {
      await p.click(`.aba-btn:has-text("${aba}")`);
      await larguraOk(aba);
    }
    assert.ok(await p.locator('.diario-ano').count() > 3, 'o diário deveria ter vários anos');
    await p.click('button:has-text("Começar a carreira de modelo")');
    assert.ok(await p.locator('.modal h2:has-text("modelo")').count(), 'deveria mostrar o perfil que nasceu da vida');
    await p.click('.modal button:has-text("Começar a carreira")');
    for (const aba of ['Diário', 'Família', 'Hábitos', 'Semana']) {
      await p.click(`.aba-btn:has-text("${aba}")`);
      await larguraOk(`${aba} (carreira)`);
    }
    // Hábitos: escolher um nível custa dinheiro por semana e fica marcado.
    await p.click('.aba-btn:has-text("Hábitos")');
    await p.locator('.habito:has-text("Exercício") .nivel').nth(2).click();
    assert.equal(await p.locator('.habito:has-text("Exercício") .nivel.ativo').innerText().then((t) => /Regular/.test(t)), true);
    await p.click('.aba-btn:has-text("Semana")');
    for (let i = 0; i < 400; i++) {
      if (await p.locator('.capa').count()) break;
      await passo(p);
    }
    assert.ok(await p.locator('.capa').count(), 'a carreira nascida da infância deveria chegar ao legado');
    console.log(`ok: vida desde o nascimento até o legado (${await p.locator('.capa h2').innerText()})`);
    await p.context().close();
  }

  // 7) Save da fase 6A (sem hábitos nem dependência) abre e joga sem quebrar.
  {
    const p = await novaPagina();
    await p.click('text=Nova carreira');
    await p.fill('#nome', 'Save Antigo');
    await p.click('.opcao:has-text("Aos 18 anos")');
    await p.click('text=Começar a carreira');
    await p.click('.modal button:has-text("Começar")');
    await p.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('primeira-capa:slot:1'));
      delete d.estado.pessoa.dependencia; delete d.estado.pessoa.habitos; delete d.estado.eventoVidaCooldown;
      localStorage.setItem('primeira-capa:slot:1', JSON.stringify(d));
    });
    await p.reload();
    await p.click('button:has-text("Continuar")');
    await p.click('.aba-btn:has-text("Hábitos")');
    assert.ok(await p.locator('.habito').count() === 5, 'save antigo deveria ganhar os hábitos');
    await p.click('.aba-btn:has-text("Semana")');
    await p.click('text=Piloto automático da temporada');
    console.log('ok: save antigo migrado');
    await p.context().close();
  }

  assert.deepEqual(falhas, [], `erros no navegador:\n${falhas.join('\n')}`);
  console.log('Teste de navegador concluído sem erros.');
} finally {
  await navegador.close();
  servidor.kill();
}
