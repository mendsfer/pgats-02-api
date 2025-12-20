# API de Transferências e Usuários

Esta API permite o registro, login, consulta de usuários e transferências de valores entre usuários. O objetivo é servir de base para estudos de testes e automação de APIs.

## Tecnologias
- Node.js
- Express
- Swagger (documentação)
- Banco de dados em memória (variáveis)
- K6

## Instalação

1. Clone o repositório:
   ```sh
   git clone <repo-url>
   cd pgats-02-api
   ```
2. Instale as dependências:
   ```sh
   npm install express swagger-ui-express bcryptjs
   ```

## Configuração

Antes de seguir, crie um arquivo .env na pasta raiz contendo as propriedades BASE_URL_REST e BASE_URL_GRAPHQL com a URL desses serviços.

## Como rodar

- Para iniciar o servidor:
  ```sh
  node server.js
  ```
- A API estará disponível em `http://localhost:3000`
- A documentação Swagger estará em `http://localhost:3000/api-docs`

## Endpoints principais

### Registro de usuário
- `POST /users/register`
  - Body: `{ "username": "string", "password": "string", "favorecidos": ["string"] }`

### Login
- `POST /users/login`
  - Body: `{ "username": "string", "password": "string" }`

### Listar usuários
- `GET /users`

### Transferências
- `POST /transfers`
  - Body: `{ "from": "string", "to": "string", "value": number }`
- `GET /transfers`

### GraphQL Types, Queries e Mutations

Rode `npm run start-graphql` para executar a API do GraphQL e acesse a URL http://localhost:4000/graphql para acessá-la.

- **Types:**
  - `User`: username, favorecidos, saldo
  - `Transfer`: from, to, value, date
- **Queries:**
  - `users`: lista todos os usuários
  - `transfers`: lista todas as transferências (requer autenticação JWT)
- **Mutations:**
  - `registerUser(username, password, favorecidos)`: retorna User
  - `loginUser(username, password)`: retorna token + User
  - `createTransfer(from, to, value)`: retorna Transfer (requer autenticação JWT)

## Regras de negócio
- Não é permitido registrar usuários duplicados.
- Login exige usuário e senha.
- Transferências acima de R$ 5.000,00 só podem ser feitas para favorecidos.
- O saldo inicial de cada usuário é de R$ 10.000,00.

## Testes
- O arquivo `app.js` pode ser importado em ferramentas de teste como Supertest.
- Para testar a API GraphQL, importe `graphql/app.js` nos testes.

---

Para dúvidas, consulte a documentação Swagger, GraphQL Playground ou o código-fonte.


## Testes de Performance
- Foi utilizado o login a partir do helpers (arquivo login.js) e está usando o Check para validar o retorno esperado, os testes estão separados pelo conceito de Groups 

    group('Login para obter o token', () => {
        loginRes = login();
        check(loginRes, {
            'status deve ser igual a 200': (r) => r.status === 200,
        });
    });

- Para realizar uma transferência estamos utilizando o token obtido no login

- Implementado Stages, ramp-up: sobe até 2 usuários em 15 segundos, o stay mantém 3 usuários por 30 segundos e o ramp-down irá reduzir para 0 usuários em 15 segundos

  stages: [
    { duration: '15s', target: 2 }, // ramp-up subir para 2 usuários em 15 segundos
    { duration: '30s', target: 3 }, // stay em 3 usuários por 30 segundos
    { duration: '15s', target: 0 }, // ramp-down descer para 0 usuários em 15 segundos
  ],

- Implementado Thresholds, 85% dos testes deve ser menor do que 3 segundos e a taxa de falha deve ser menor que 40%

  thresholds: {
    http_req_duration: ['p(85) < 3000'], // 85% deve ser menor que 3000ms
    http_req_failed: ['rate<0.4'], // taxa de falha deve ser menor que 50%
  }
};

- Utilizado Trends (métricas personalizadas) no post/transfer para coletar o tempo de duração de cada requisição
realizado a importação import { Trend } from 'k6/metrics'; e implementado postTransferDurationTrend.add(res.timings.duration);

- Utilizado Faker para gerar um destinatário inválido para falhar a transferência 

  const faker = new Faker();
  const toInvalido = faker.person.firstName();

  implementado no destinatário 

  to: toInvalido,

- Relatórios HMTL é o arquivo report_auto.html

- Execução dos testes 

Com URL local (http://localhost:3000)
k6 run test/k6/performance.js

Com URL customizada via variável de ambiente
k6 run --env BASE_URL=http://192.168.0.83:3000 test/k6/performance.js

Com saída em JSON e CSV (para geração de relatório)
npm run k6:run

Executar teste e gerar relatório HTML automaticamente
npm run k6:test

Relatório gráfico em HTML
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=html-report.html K6_WEB_DASHBOARD_PERIOD=5ms k6 run ./test/k6/performance.js
