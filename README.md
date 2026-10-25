# Jogo de Modelo

Modo carreira de modelo de moda, feito como presente. A ideia é a mesma do nosso jogo de carreira de basquete: mundo fictício com nomes parodiados, simulação semanal, momentos decisivos com chance de sucesso, eventos com consequências e sistemas de Relações e Vida.

O design doc completo está no Claude (Design Doc: Carreira de Modelo). Este README resume o que já existe no código.

## Estado atual: Fase 2 (mercado e Vida)

Só o motor, sem interface ainda. Tudo é JavaScript puro (módulos ES), sem build e sem dependências. Requer Node 18 ou mais novo.

```bash
npm test                      # testes automáticos (inclui calibragem com 120 carreiras)
node scripts/balancear.js     # tabela de balanceamento: [carreiras=40] [temporadas=15] [dificuldade=normal]
```

### Como a carreira funciona

1. **Circuito regional** (20 semanas por temporada, simulação mais rápida). Após a 1ª temporada, a jogadora decide: ir à Seleção agora (overall mais baixo) ou ficar mais um ano (overall mais alto). Se for e não for escolhida, volta ao regional por mais um ano.
2. **Noite da Seleção** (`selecao.js`): 30 agências escolhem entre 120 candidatas em 2 rodadas (60 vagas). As agências mais fracas escolhem primeiro. Cada agência pondera a avaliação da candidata (com um ruído que depende da precisão dos olheiros, definida pela dificuldade) e a necessidade do perfil: agência que já tem muitas modelos de um perfil tem menos interesse em outra do mesmo tipo. O resultado vem em ordem, escolha por escolha, para a interface poder revelar com suspense.
3. **Circuito alternativo**: quem não é escolhida após 2 anos no regional vai para ele (20 semanas, mercado melhor que o regional). A saída pode ser por nova Seleção (todo ano), por proposta no meio da temporada ou por chamada de uma agência grande.
4. **Carreira profissional** (40 semanas, semanas de moda, desfiles extras). O contrato de novata tem garantia semanal que depende da posição na Seleção. Ao fim do contrato há **free agency**: a jogadora recebe de 2 a 5 propostas (incluindo renovação) e escolhe. No meio da temporada a agência pode **trocar** a modelo com outra, conforme necessidade de perfil e relação com o agente.

Em cada ponto de decisão o jogo cria uma `pendencia` no estado (`decisao-selecao`, `selecao`, `free-agency` ou `proposta-alternativo`). A simulação só continua depois que ela é resolvida (`decidirSelecao`, `confirmarSelecao`, `escolherProposta`). O módulo `auto.js` resolve tudo sozinho, para testes e simulação rápida.

### Sistema Vida (`vida.js`)

Seis categorias de gasto, cada uma com níveis e custo semanal real: moradia, transporte, equipe pessoal, estilo, pet e relacionamento (com homem ou mulher). Subir de nível custa uma taxa única (2x o custo semanal). Os efeitos têm **retorno decrescente** (o 1º nível rende muito, o 4º quase nada a mais) e ajudam em chance de sucesso, fama, energia, recuperação do cansaço e risco de lesão.

Despesas fixas que crescem: comissão da agência (15% a 25% conforme o tier), agente (5%), imposto progressivo, ajuda à família (cresce com a fama) e custo básico de vida. Tudo acompanha uma inflação de 3% ao ano, inclusive cachês e garantias.

**No vermelho**: juros de 1% por semana sobre o saldo negativo, pressão (menos chance de sucesso, mais cansaço) e, após 6 semanas, corte forçado do padrão de vida, começando pelo gasto mais pesado.

### Calibragem

`scripts/balancear.js` roda carreiras inteiras no automático com três políticas de gastos. Resultado atual em dificuldade normal (40 carreiras, 15 temporadas):

| Política | Já ficou no vermelho |
| --- | --- |
| Cautelosa | 0% |
| Equilibrada | 15% a 20% |
| Ostentosa | quase todas |

O pico de overall em 120 carreiras: p10 = 55, mediana = 65, p90 = 77, máximo = 82. Cada modelo tem um potencial oculto que decide quem pode virar estrela. Todos os números ficam em `src/engine/config.js` (e nas tabelas de `semana.js`, `mercado.js` e `vida.js`).

### Estrutura

```
src/engine/
  config.js     fases, dificuldades, comissões, impostos
  mundo.js      agências, marcas, revistas, semanas de moda, rivais (nomes provisórios)
  atributos.js  atributos (25 a 99), perfis e overall
  modelo.js     criação da modelo e estado inicial
  liga.js       força e necessidades das agências; candidatas da Seleção
  semana.js     agenda, momentos decisivos, energia, lesões, fim de temporada
  selecao.js    Noite da Seleção e decisão de ir ou ficar
  mercado.js    contratos, free agency, trocas e chamadas
  vida.js       gastos, efeitos, finanças e vermelho
  auto.js       modo automático e simularCarreira
```

### Exemplo de uso

```js
import { criarJogo, gerarAgenda, escolherAutomatico, simularSemana } from './src/engine/index.js';

const { estado, rng } = criarJogo({ nome: 'Ana', perfil: 'editorial', dificuldade: 'normal', semente: 42 });
const agenda = gerarAgenda(estado, rng);
simularSemana(estado, rng, escolherAutomatico(estado, agenda));
```

## Roadmap

1. **Fase 1, base:** modelo, atributos, mundo e simulação semanal. (feito)
2. **Fase 2, mercado:** Noite da Seleção, contratos, free agency, trocas, circuito alternativo e sistema Vida com calibragem. (feito)
3. **Fase 3, vida da carreira:** Relações com peso real (agente, estilistas, fotógrafos, mídia, rivais), eventos com memória, aposentadoria e Hall da Fama.
4. **Fase 4, interface:** nome do projeto, identidade visual e telas.
5. **Fase 5, teste e balanceamento:** teste de carreira inteira no navegador, vários slots de save e ajuste final de dificuldades.
