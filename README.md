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

Abra `http://localhost:5173`. O backend é iniciado em `http://localhost:3001` e o Vite encaminha as chamadas `/api` automaticamente.

Para simular a entrega de produção interna:

```bash
npm run build
npm start
```

Nesse modo, o Express entrega o frontend compilado em `http://localhost:3001`.

Variáveis opcionais podem ser configuradas com base no arquivo `.env.example`:

- `PORT`: porta do backend, padrão `3001`;
- `CLIENT_ORIGIN`: origens permitidas pelo CORS, separadas por vírgula;
- `VITE_API_URL`: URL absoluta da API quando frontend e backend estiverem em hosts diferentes;
- `STORAGE_DIR`: diretório alternativo para o cache, útil em testes e implantação.

> O projeto não carrega `.env` automaticamente. Defina as variáveis no ambiente do processo ou adicione um carregador de segredos na plataforma de implantação.

## Como usar

1. No Painel, clique em **Carregar Excel** e escolha um arquivo `.xlsx`.
2. A primeira aba da planilha é lida. Cabeçalhos com acentos, pontuação e variações usuais são normalizados.
3. Use filtros, cards, faixas de aging e gráficos para refinar a análise. As linhas abrem o detalhe do ticket.
4. Em **Comparar Excel**, selecione a extração velha e a nova para encontrar inclusões, remoções e alterações.
5. Em **Ticket**, informe o número exato para fazer uma consulta isolada.

Datas no formato brasileiro `DD/MM/YYYY HH:mm` são interpretadas explicitamente, sem depender do parser americano do JavaScript. Datas inválidas são mantidas vazias. Campos textuais ausentes aparecem como `(vazio)`.

## Persistência local

Por padrão, os arquivos ficam em `server/storage/`:

- `current.xlsx`: último Excel carregado;
- `current.json`: cache processado carregado na inicialização do servidor;
- `current.raw.json`: snapshot bruto da etapa de importação para rastreabilidade de novas cargas;
- `old.xlsx` e `new.xlsx`: últimos arquivos comparados;
- `comparison.json`: resultado da última comparação.

O aging e os indicadores enriquecidos são recalculados ao consultar o cache, portanto continuam corretos com a passagem dos dias. Caches criados por versões anteriores são enriquecidos automaticamente em memória. **Remover Excel** apaga o Excel e todos os snapshots da carga atual.

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

Os testes criam arquivos Excel reais em diretórios temporários e cobrem normalização de cabeçalhos, datas brasileiras, regras de negócio, upload multipart, CORS, filtros, resumo, CSV, comparação e restauração do cache após reiniciar o processo.
