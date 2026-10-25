# Primeira Capa

Modo carreira de modelo de moda, feito como presente. A ideia é a mesma do nosso jogo de carreira de basquete: mundo fictício com nomes parodiados, simulação semanal, momentos decisivos com chance de sucesso, eventos com consequências e sistemas de Relações e Vida.

O design doc completo está no Claude (Design Doc: Carreira de Modelo). Este README resume o que já existe no código.

## Como jogar

```bash
npm start        # abre o servidor em http://localhost:8080 (ou: npm start 3000)
```

Depois é só abrir o endereço no navegador. O jogo salva sozinho em 3 slots (no próprio navegador, via localStorage), então dá para fechar a aba e continuar depois. Os módulos ES não abrem direto de `file://`, por isso o servidorzinho (`scripts/servir.js`, sem dependências). Para publicar online, qualquer hospedagem estática serve (por exemplo GitHub Pages): basta servir a raiz do repositório.

### Interface (Fase 4)

- Identidade: capa de revista de moda. Papel creme, tinta preta e um vermelho só; títulos em Playfair Display (com fallback para serifas do sistema). Segue o tema claro/escuro do aparelho e funciona bem no celular.
- Telas: capa com jogos salvos, criação da modelo (perfil, dificuldade, slot), painel com abas **Semana** (agenda com chance de cada trabalho, energia, resultado e contas da semana, piloto automático), **Perfil**, **Vida**, **Relações** (com rivais), **Carreira** (legado, marcos, temporadas) e **Notícias**.
- Janelas de decisão para cada pendência do motor: ir ou ficar na Seleção, a Noite da Seleção revelada escolha por escolha (com suspense), propostas de free agency, eventos com escolhas e a aposentadoria com os quatro caminhos. A carreira termina na tela de legado.
- Código em `src/ui/`: `acoes.js` liga os botões ao motor (nenhuma regra de jogo fica na interface), `abas.js`, `modais.js`, `inicio.js`, `jogo.js`, `save.js`.

## Estado do motor: Fase 3 (vida da carreira)

Tudo é JavaScript puro (módulos ES), sem build e sem dependências. Requer Node 18 ou mais novo.

```bash
npm test                      # testes automáticos (inclui calibragem com centenas de carreiras)
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

### Fase 3: Relações, rivais, eventos e legado

- **Relações** (`relacoes.js`): agente, bastidores, direção da agência, mídia, estilistas e fotógrafos (0 a 100), com efeitos reais. O agente traz mais (ou menos) ofertas e destaca melhor os trabalhos; estilistas ajudam nos desfiles e fotógrafos nos ensaios; a mídia multiplica a fama e libera patrocínios; a direção pesa na renovação e na chance de troca; os bastidores aceleram a recuperação. Sobem com bons resultados e esfriam devagar rumo ao neutro.
- **Rivais** (`rivais.js`): 8 modelos concorrentes disputam ofertas de prestígio, a rivalidade dura vários anos e esfria aos poucos, e há um ranking anual. Rivais envelhecem, se aposentam e são substituídas.
- **Eventos com memória** (`eventos.js`): 16 eventos com escolhas, abertos como `pendencia` do tipo `evento`. Decisões deixam lembranças que expiram: aceitar um ensaio ousado pode virar escândalo, manter uma marca polêmica pode virar boicote. A dificuldade pesa a parte negativa dos eventos. Contratos extras (exclusividade, embaixadora) rendem toda semana.
- **Carreira e legado** (`carreira.js`): estatísticas, 14 marcos, aposentadoria (por saúde, resistência, 20 temporadas ou obrigatória aos 42), quatro caminhos pós-carreira (agência, mentora, jurada, vida tranquila) e níveis de legado por pontos: carreira discreta, de destaque, Hall da Fama e Lenda da moda.

Calibragem da Fase 3 (normal): cerca de 3 eventos por temporada profissional; em 80 carreiras, ~16% discretas, ~54% de destaque, ~14% Hall da Fama e ~16% Lenda; a maioria nunca chega ao 1º do ranking. Vermelho por política: cautelosa 0%, equilibrada ~18%, ostentosa ~95%.

### Calibragem (Fase 2)

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
  relacoes.js   seis relações e seus efeitos
  rivais.js     rivais, disputas e ranking anual
  eventos.js    catálogo de eventos, memória e escolhas
  carreira.js   marcos, aposentadoria, Hall da Fama
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
3. **Fase 3, vida da carreira:** Relações com peso real, rivais, eventos com memória, aposentadoria e Hall da Fama. (feito)
4. **Fase 4, interface:** nome (Primeira Capa), identidade visual, telas e salvamento em 3 slots. (feito)
5. **Fase 5, teste e balanceamento:** teste de carreira inteira no navegador, ajuste final de dificuldades.
