# Imperium API

Backend REST do Imperium, um app de finanças pessoais. Node.js + Express + TypeScript + SQLite.

O frontend vive em um repositório separado: [imperium-web](https://github.com/brianashihara/imperium-web).

## Requisitos

- Node.js 22+
- npm

## Como rodar

```bash
npm install
cp .env.example .env
npm run seed    # cria o usuário demo com 6 meses de lançamentos
npm run dev     # http://localhost:3333
```

Credenciais do seed: `demo@imperium.local` / `demo12345`.

| Script | O que faz |
|---|---|
| `npm run dev` | Sobe a API com reload automático (tsx watch) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Roda a build de `dist/server.js` |
| `npm run seed` | Recria o usuário demo e seus dados |
| `npm test` | Roda a suíte (Vitest) em um banco isolado |

## Variáveis de ambiente

| Variável | Padrão | Observação |
|---|---|---|
| `PORT` | `3333` | O Next.js usa a 3000, por isso a API não usa |
| `NODE_ENV` | `development` | Em `production` o `JWT_SECRET` passa a ser obrigatório |
| `DATABASE_URL` | `file:./dev.db` | Caminho do arquivo SQLite |
| `JWT_SECRET` | inseguro em dev | Obrigatório em produção |
| `CORS_ORIGIN` | `http://localhost:3000` | Origem do frontend |
| `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` | demo | Usados só pelo `npm run seed` |

## Arquitetura

Cada funcionalidade é um módulo com a mesma divisão de responsabilidades:

```
routes  ->  controller  ->  service  ->  repository  ->  SQLite
            (HTTP)          (regras)     (SQL)
```

```
src/
  app.ts               # montagem do Express (helmet, cors, rotas, erros)
  server.ts            # entrypoint HTTP
  config/env.ts        # variáveis de ambiente validadas
  database/
    database.ts        # conexão + schema (criado no boot)
    seed.ts            # dados de demonstração
  errors/              # AppError e derivados (status + código)
  middlewares/         # auth JWT, request id, tratamento de erros
  modules/             # auth, categories, incomes, expenses, budgets, reports, health
  types/               # tipos compartilhados e de framework
  utils/               # jwt, paginação, recorrência, período, respostas
```

### Decisões que valem explicar

- **Valores em centavos.** Todo dinheiro é `INTEGER` de centavos (`amountCents`), nunca float.
- **Receitas e despesas em tabelas separadas.** Elas têm campos próprios (despesa tem `expense_type`), e separar evita colunas nulas e checagens de tipo em toda query.
- **Comprometido x livre.** `/reports/commitments` separa a receita do mês em comprometida (despesas fixas mais recorrentes projetadas) e livre. É o número que o dashboard usa como manchete, e ele fecha com `/reports/monthly`: comprometido + variável é igual ao total de despesas.
- **Recorrência é projetada, não materializada.** Um lançamento recorrente é gravado uma única vez; relatórios e orçamentos calculam quantas vezes ele cai no período com `utils/recurrence.ts`. `recurrence_end_date` encerra a recorrência sem apagar o histórico.
- **Isolamento por usuário no repositório.** Toda query filtra por `user_id`, então a autorização não depende do controller lembrar de checar.
- **Respostas padronizadas.** Sucesso é `{ success, data, requestId }`; erro é `{ success, message, code, requestId }`, com `errors` por campo quando a validação Zod falha.

## Endpoints

Todas as rotas abaixo de `/api`. Tudo exceto `/health`, `/auth/register` e `/auth/login` exige `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Status da API |
| POST | `/auth/register` | Cria a conta e já semeia as categorias padrão |
| POST | `/auth/login` | Devolve o `accessToken` (validade de 1 dia) |
| GET | `/auth/me` | Perfil do usuário autenticado |
| GET/POST | `/categories` | Lista e cria categorias |
| PUT/DELETE | `/categories/:categoryId` | Renomeia (só as customizadas) e exclui (só as sem uso) |
| GET/POST | `/incomes` | Lista paginada (`page`, `limit`, `startDate`, `endDate`, `categoryId`) e cria |
| GET/PUT/DELETE | `/incomes/:id` | Detalhe, edição e exclusão |
| GET/POST | `/expenses` | Mesmos filtros das receitas |
| GET/PUT/DELETE | `/expenses/:id` | Detalhe, edição e exclusão |
| GET/POST | `/budgets` | Orçamentos do período (`month`, `year`), com gasto e percentual calculados |
| GET/PUT/DELETE | `/budgets/:id` | Detalhe, novo limite e exclusão |
| GET | `/reports/monthly` | Totais do mês (`month`, `year`) |
| GET | `/reports/categories` | Despesas do mês agrupadas por categoria |
| GET | `/reports/commitments` | Quanto da receita do mês já está comprometida com fixos e recorrentes |
| GET | `/reports/evolution` | Série mês a mês (`months`, padrão 6) para o gráfico do dashboard |
| GET | `/reports/range` | Totais de um intervalo livre (`startDate`, `endDate`) |

## Testes

```bash
npm test
```

165 testes entre unitários (services, controllers, schemas, utils) e de integração (rotas via supertest). A suíte usa `tmp/test.db`, recriado do zero a cada execução. O `dev.db` nunca é tocado.

## Observações

- O deploy na Vercel foi removido: SQLite em arquivo não sobrevive a um filesystem efêmero. Para publicar, o caminho é trocar por Turso/libSQL ou Postgres.
