# Jogo de Modelo

Modo carreira de modelo de moda, feito como presente. A ideia é a mesma do nosso jogo de carreira de basquete: mundo fictício com nomes parodiados, simulação semanal, momentos decisivos com chance de sucesso, eventos com consequências e sistemas de Relações e Vida.

O design doc completo está no Claude (Design Doc: Carreira de Modelo). Este README resume o que já existe no código.

## Estado atual: Fase 1 (motor base)

Só o motor, sem interface ainda. Tudo é JavaScript puro (módulos ES), sem build e sem dependências. Requer Node 18 ou mais novo para rodar os testes.

```bash
npm test
```

O teste simula várias carreiras de 20 temporadas, confere se os números ficam dentro dos limites e imprime um resumo de 10 temporadas para balanceamento.

### O que o motor faz

- **Criação da modelo** (`src/engine/modelo.js`): nome, origem e perfil (Passarela, Editorial, Comercial ou Versátil). Atributos de 25 a 99.
- **Mundo fictício** (`src/engine/mundo.js`): 30 agências, 4 agências regionais, marcas, revistas, 4 semanas de moda e modelos rivais. Os nomes são provisórios.
- **Agenda semanal** (`src/engine/semana.js`): 40 semanas por temporada, com 4 a 6 ofertas por semana (castings, desfiles, ensaios, campanhas e entrevistas). Nas semanas de moda aparecem desfiles extras.
- **Momentos decisivos**: cada trabalho tem uma chance de sucesso (atributos contra dificuldade, cansaço e relação com o agente). Parte dos acertos vira "destaque", com mais cachê e fama.
- **Energia, cansaço e lesões**: a agenda é limitada pela energia; excesso de trabalho cansa e aumenta o risco de lesão.
- **Evolução**: crescimento por prática e por temporada, com declínio leve depois dos 29.
- **Semente (seed)**: a mesma semente gera a mesma carreira, o que facilita testar e balancear.

### Exemplo de uso

```js
import { criarJogo, gerarAgenda, escolherAutomatico, simularSemana } from './src/engine/index.js';

const { estado, rng } = criarJogo({ nome: 'Ana', perfil: 'editorial', semente: 42 });
const agenda = gerarAgenda(estado, rng);
simularSemana(estado, rng, escolherAutomatico(estado, agenda));
```

## Roadmap

1. **Fase 1, base:** modelo, atributos, mundo e simulação semanal. (feito)
2. **Fase 2, mercado:** Noite da Seleção, contratos, free agency, trocas de agência e sistema Vida (com calibragem dos cachês).
3. **Fase 3, vida da carreira:** Relações, eventos com memória, aposentadoria e Hall da Fama.
4. **Fase 4, interface:** nome do projeto, identidade visual e telas.
5. **Fase 5, teste e balanceamento:** carreiras inteiras simuladas e ajuste de dificuldades.
