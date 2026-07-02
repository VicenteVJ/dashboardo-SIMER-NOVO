# Dashboard de Chamados ERP Simer

Dashboard full stack para carregar uma base Excel de tickets, acompanhar backlog, governança, ITIL e SLA, consultar chamados, comparar duas extrações e exportar resultados. O Excel é tratado como fonte externa e imutável; não é necessário banco de dados.

## Pipeline de dados

O processamento possui três etapas independentes:

1. **Importação:** lê a primeira aba e preserva cabeçalhos e valores recebidos, sem aplicar regra gerencial.
2. **Normalização:** padroniza cabeçalhos, datas brasileiras, vazios, status básicos e tipos.
3. **Enriquecimento:** calcula status gerencial, tipo ITIL, impacto, urgência, prioridade P1–P4, SLA, risco, dependência externa, espera inferida, qualidade, recorrência, Pareto 80/20 e Matriz de Eisenhower.

As regras ficam centralizadas em `server/utils/` e nos serviços de enriquecimento, Pareto e Eisenhower. O processamento usa duas passagens: classificação individual e análise do conjunto completo para calcular concentração. Nenhum indicador exige alteração ou nova coluna no Excel.

### Priorização gerencial

- **Urgência:** tempo em aberto, SLA, espera, falta de atualização, priorização e risco.
- **Importância:** impacto operacional, serviço/área crítica, recorrência, dependência externa e presença no Pareto.
- **Pareto:** identifica os grupos que acumulam aproximadamente 80% do backlog por cliente, serviço, categoria, departamento, responsável e assunto recorrente.
- **Eisenhower:** classifica em `Fazer agora`, `Planejar`, `Delegar / tratar com controle` ou `Monitorar / baixa prioridade` e gera uma ação recomendada.

## Requisitos

- Node.js 20 ou superior
- npm 10 ou superior

## Instalação e execução

```bash
npm install
npm run dev
```

Abra `http://localhost:8888`. O Netlify Dev inicia o Vite e as Functions localmente, aplicando os mesmos redirects de produção. As chamadas públicas continuam em `/api/*`.

Para usar o servidor Express e o proxy do Vite sem o Netlify Dev:

```bash
npm run dev:local
```

Nesse modo, o frontend abre em `http://localhost:5173`, o backend em `http://localhost:3001` e o Vite encaminha `/api`.

Para simular a entrega de produção interna:

```bash
npm run build
npm start
```

Nesse modo, o Express entrega o frontend compilado em `http://localhost:3001`.

Variáveis opcionais podem ser configuradas com base no arquivo `.env.example`:

- `PORT`: porta do backend, padrão `3001`;
- `CLIENT_ORIGIN` e `ALLOWED_ORIGINS`: origens adicionais permitidas pelo CORS, com múltiplos valores separados por vírgula;
- `VITE_API_URL`: URL absoluta da API quando frontend e backend estiverem em hosts diferentes; no Netlify deve ficar vazia para usar `/api/*` no mesmo domínio;
- `STORAGE_DIR`: diretório alternativo para o cache no modo filesystem local e nos testes;
- `NETLIFY`, `NETLIFY_DEV` ou o marcador interno da Function: habilitam automaticamente o Netlify Blobs, salvo se `STORAGE_DIR` tiver sido definido explicitamente;
- `NETLIFY_BLOBS_STORE`: nome opcional do store; o padrão é `simer-dashboard-cache`.

> O projeto não carrega `.env` automaticamente. Defina as variáveis no ambiente do processo ou adicione um carregador de segredos na plataforma de implantação.

## Como usar

1. No Painel, clique em **Carregar Excel** e escolha um arquivo `.xlsx`.
2. A primeira aba da planilha é lida. Cabeçalhos com acentos, pontuação e variações usuais são normalizados.
3. Use filtros, cards, faixas de aging e gráficos para refinar a análise. As linhas abrem o detalhe do ticket.
4. Em **Comparar Excel**, selecione a extração velha e a nova para encontrar inclusões, remoções e alterações.
5. Em **Ticket**, informe o número exato para fazer uma consulta isolada.

Datas no formato brasileiro `DD/MM/YYYY HH:mm` são interpretadas explicitamente, sem depender do parser americano do JavaScript. Datas inválidas são mantidas vazias. Campos textuais ausentes aparecem como `(vazio)`.

## Persistência

Localmente, no modo Express tradicional, os arquivos ficam em `server/storage/` (ou no diretório definido por `STORAGE_DIR`). No Netlify, a mesma camada de persistência usa um store site-wide do Netlify Blobs; portanto o cache não depende do filesystem efêmero da Function e permanece disponível após recarregar a página e após novos deploys.

As chaves/arquivos mantidos são:

- `current.xlsx`: último Excel carregado;
- `current.json`: cache processado;
- `current.raw.json`: snapshot bruto da etapa de importação para rastreabilidade de novas cargas;
- `current-metadata.json`: nome original, horário da carga e total de tickets;
- `old.xlsx` e `new.xlsx`: últimos arquivos comparados;
- `comparison.json`: resultado da última comparação.

O Excel original é armazenado sem alteração. O aging e os indicadores enriquecidos são recalculados ao consultar o cache, portanto continuam corretos com a passagem dos dias. Caches criados por versões anteriores são enriquecidos automaticamente em memória. **Remover Excel** apaga o Excel, o JSON processado, o snapshot bruto e os metadados da carga atual.

## Deploy no Netlify

O arquivo `netlify.toml` da raiz já contém build, diretório de Functions e redirects. No painel do Netlify, mantenha:

- Base directory: vazio;
- Package directory: vazio;
- Build command: `npm run build`;
- Publish directory: `client/dist`;
- Functions directory: `netlify/functions`.

O frontend é publicado como SPA e `/api/*` é reescrito para a Function `api`. Essa Function reutiliza `server/app.js`, portanto as rotas Express, o `multer` em memória e o processamento com `xlsx` também são executados no Netlify. Não é necessário backend externo nem banco de dados. O contexto de acesso ao Netlify Blobs é conectado antes de o Express ser carregado.

Não faça deploy manual apenas da pasta `client/dist`: esse método publica somente os arquivos estáticos e deixa `/.netlify/functions/api` inexistente. Use o repositório conectado ao Netlify ou a CLI na raiz:

```bash
npm install
npx netlify login
npx netlify link
npx netlify deploy --build --prod --filter @simer/client
```

Após o deploy, `GET /api/health` deve responder JSON com `storageProvider: "netlify-blobs"`. O upload síncrono de arquivos binários em Functions possui limite efetivo próximo de 4,5 MB por causa da codificação Base64; o frontend usa 4 MB como margem segura e mostra uma mensagem antes do envio.

O domínio oficial `https://dashboardo-simer-novo.netlify.app`, a variante sem o segundo “o”, localhost e deploy previews/branch deploys desses sites já são permitidos pelo CORS. Variáveis são opcionais e servem para acrescentar outros hosts, por exemplo:

```text
CLIENT_ORIGIN=https://dashboardo-simer-novo.netlify.app,https://dashboard-simer-novo.netlify.app
```

No painel do Netlify, deixe **Base directory** e **Package directory** vazios para que o build encontre tanto o frontend quanto `netlify/functions` e as dependências da raiz.

Para testar o mesmo fluxo localmente:

```bash
npm run dev
curl http://localhost:8888/api/health
curl -F "file=@./caminho/arquivo.xlsx" http://localhost:8888/api/upload/current
```

## Endpoints

| Método | Endpoint | Função |
|---|---|---|
| GET | `/api/health` | Saúde da API e metadados do cache |
| POST | `/api/upload/current` | Upload multipart no campo `file` |
| DELETE | `/api/upload/current` | Remove Excel atual e cache |
| GET | `/api/tickets` | Lista e filtra tickets |
| GET | `/api/tickets/:numero` | Consulta ticket por número |
| GET | `/api/summary` | Indicadores da base filtrada |
| POST | `/api/compare` | Multipart com `oldFile` e `newFile` |
| GET | `/api/export/filtered` | CSV dos tickets filtrados |
| GET | `/api/export/comparison` | CSV da última comparação |

Em produção, os mesmos endpoints são atendidos por `netlify/functions/api.js`; seus endereços públicos não mudam.

Filtros aceitos em `/api/tickets`, `/api/summary` e `/api/export/filtered`: `search`, `status` (valores separados por vírgula), `departamento`, `clientePessoa`, `categoria`, `servico`, `responsavel`, `prioridade`, `ano`, `mes`, `somenteAberto`, `aging`, `categoriaGrupo`, `indicador`, `statusGerencial`, `tipoITIL`, `prioridadeGerencial`, `situacaoSLA`, `nivelRisco`, `responsavelGerencial`, `dependenciaExterna`, `semAtualizacao`, `motivoEsperaInferido`, `quadranteEisenhower` e `governanca`.

O CSV identifica cada coluna com os prefixos `[Excel]` e `[Calculado]`. Respostas grandes da API usam compressão HTTP para manter a carga rápida com milhares de registros.

## Estrutura

```text
server/
  routes/       rotas HTTP
  services/     Excel, filtros, comparação, CSV e persistência
  middleware/   validação multipart
  utils/        datas e texto
  storage/      cache local (ignorado pelo Git)
netlify/
  functions/    entrada serverless que reutiliza o app Express
client/src/
  components/   layout, filtros, gráficos, tabelas e modais
  context/      carga e atualização da base
  pages/        Painel, Diretoria, Comparação e Ticket
  utils/        formatação e agregações de interface
```

## Verificação

```bash
npm run check
npm audit
```

Os testes criam arquivos Excel reais em diretórios temporários e cobrem normalização de cabeçalhos, datas brasileiras, regras de negócio, upload multipart em memória, CORS, filtros, resumo, CSV, comparação e restauração do cache após reiniciar o processo.
