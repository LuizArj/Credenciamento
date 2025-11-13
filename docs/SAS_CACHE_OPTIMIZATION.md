# Otimização de Cache Local para Eventos SAS

## 📋 Visão Geral

Implementação de sistema de cache local para eventos SAS, reduzindo chamadas desnecessárias à API externa e melhorando performance do sistema de credenciamento.

## 🎯 Objetivo

Otimizar o fluxo de busca de eventos no módulo de credenciamento SAS, priorizando consultas ao banco de dados local antes de fazer requisições à API externa do SAS.

## 🔄 Fluxo de Busca Otimizado

### Antes da Otimização

```
Usuário digita código SAS
    ↓
Sistema faz requisição à API SAS
    ↓
Retorna dados do evento
```

### Após a Otimização

```
Usuário digita código SAS
    ↓
Sistema busca no banco de dados local (PostgreSQL)
    ↓
    ├─ Encontrou? → Retorna dados do cache local ✅
    │                (Mais rápido, sem chamada externa)
    │
    └─ Não encontrou? → Busca na API SAS 🌐
                         (Fallback para novos eventos)
```

## 📁 Arquivos Modificados

### 1. `/pages/api/fetch-sas-event.js`

**Mudanças implementadas:**

- **Import do módulo de database:**

  ```javascript
  import { query } from '../../lib/config/database';
  ```

- **Nova lógica de busca (STEP 1):**
  - Consulta SQL no banco local antes da API
  - Busca por `codevento_sas` na tabela `eventos`
  - Normaliza dados locais para compatibilidade com formato SAS
  - Retorna resposta com indicador de origem (`source: 'cache'`)

- **Fallback para API SAS (STEP 2):**
  - Mantém lógica original caso evento não esteja no banco local
  - Retorna resposta com indicador de origem (`source: 'sas-api'`)

**Query SQL implementada:**

```sql
SELECT
  id,
  nome,
  descricao,
  data_inicio,
  data_fim,
  local,
  endereco,
  capacidade,
  modalidade,
  tipo_evento as instrumento,
  status as situacao,
  publico_alvo as tipo_publico,
  gerente,
  coordenador,
  solucao,
  unidade,
  tipo_acao,
  codevento_sas
FROM events
WHERE codevento_sas = $1
LIMIT 1
```

**Nota:** A tabela `events` não possui as colunas `cidade` e `carga_horaria`. O campo `endereco` é usado como fallback para `local`, e `carga_horaria` retorna 0 por padrão.

### 2. `/pages/credenciamento-sas.js`

**Mudanças implementadas:**

- **Tratamento da resposta da API:**
  - Captura campo `source` retornado pela API
  - Adiciona propriedades `_dataSource` e `_sourceMessage` ao objeto do evento
  - Log console indicando origem dos dados

- **Indicador visual na UI:**
  - Badge colorido mostrando origem dos dados:
    - 🔵 **"💾 Cache Local"** - dados do banco local (azul)
    - 🟢 **"🌐 API SAS"** - dados da API externa (verde)
  - Tooltip explicativo ao passar mouse sobre o badge

**Código do indicador visual:**

```jsx
{
  selectedEvent._dataSource && (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${
        selectedEvent._dataSource === 'cache'
          ? 'bg-blue-500/20 text-blue-200 border border-blue-400/30'
          : 'bg-green-500/20 text-green-200 border border-green-400/30'
      }`}
      title={
        selectedEvent._dataSource === 'cache'
          ? 'Dados carregados do banco local (mais rápido)'
          : 'Dados carregados da API do SAS'
      }
    >
      {selectedEvent._dataSource === 'cache' ? '💾 Cache Local' : '🌐 API SAS'}
    </span>
  );
}
```

## 🚀 Benefícios da Implementação

### 1. **Performance Melhorada**

- ⚡ Redução significativa no tempo de resposta para eventos já cadastrados
- 📉 Menor latência (consulta local vs. chamada HTTP externa)
- 🔄 Menos dependência de conectividade externa

### 2. **Economia de Recursos**

- 💰 Redução no número de chamadas à API SAS
- 🌐 Menor consumo de banda de rede
- 📊 Menor carga nos servidores SAS

### 3. **Melhor Experiência do Usuário**

- 👁️ Transparência sobre origem dos dados (badge visual)
- ⏱️ Resposta mais rápida no credenciamento
- 🔌 Operação resiliente (funciona mesmo com API SAS lenta)

### 4. **Confiabilidade**

- 🛡️ Fallback automático para API em caso de evento não encontrado
- 🔍 Logs detalhados para debugging
- ⚠️ Tratamento de erros mantém funcionamento mesmo com problemas no banco

## 📊 Formato de Resposta da API

### Resposta com Cache Local

```json
{
  "message": "Evento encontrado no banco de dados local",
  "endpoint": "LocalDatabase",
  "source": "cache",
  "evento": {
    "id": "123456",
    "nome": "Workshop de Empreendedorismo",
    "dataEvento": "2025-11-15T10:00:00Z",
    "local": "Sebrae RR",
    ...
  }
}
```

### Resposta com API SAS

```json
{
  "message": "Evento encontrado na API do SAS",
  "endpoint": "Selecionar",
  "source": "sas-api",
  "evento": {
    "id": "789012",
    "nome": "Palestra de Inovação",
    "dataEvento": "2025-11-20T14:00:00Z",
    ...
  }
}
```

## 🔍 Observabilidade

### Logs Implementados

**Console logs para rastreamento:**

1. **Início da busca local:**

   ```
   [fetch-sas-event] Searching for event 123456 in local database...
   ```

2. **Evento encontrado localmente:**

   ```
   [fetch-sas-event] Event 123456 found in local database!
   ```

3. **Evento não encontrado localmente:**

   ```
   [fetch-sas-event] Event 123456 not found locally. Fetching from SAS API...
   ```

4. **Erro no banco de dados:**
   ```
   [fetch-sas-event] Database query error: [detalhes do erro]
   ```

### Monitoramento de Uso

Para análise de performance, recomenda-se adicionar métricas:

- Taxa de hit do cache (eventos encontrados localmente)
- Tempo médio de resposta (local vs. API)
- Frequência de erros de banco de dados

## 🧪 Cenários de Teste

### Teste 1: Evento Existente no Banco Local

1. Cadastrar evento com código SAS "TEST001"
2. Acessar módulo de credenciamento SAS
3. Buscar pelo código "TEST001"
4. **Resultado esperado:** Badge "💾 Cache Local" exibido, resposta rápida

### Teste 2: Evento Novo (Não no Banco)

1. Acessar módulo de credenciamento SAS
2. Buscar código SAS válido não cadastrado (ex: "NEW999")
3. **Resultado esperado:** Badge "🌐 API SAS" exibido, dados importados

### Teste 3: Erro no Banco de Dados

1. Simular falha de conexão com PostgreSQL
2. Tentar buscar evento
3. **Resultado esperado:** Sistema continua funcionando via API SAS

### Teste 4: Evento Não Existe em Lugar Nenhum

1. Buscar código SAS inválido (ex: "INVALID000")
2. **Resultado esperado:** Mensagem "Evento não encontrado no SAS"

## 🔐 Segurança

### Validações Mantidas

- ✅ Validação de parâmetro `codEvento` obrigatório
- ✅ Sanitização de SQL via prepared statements (`$1`)
- ✅ Tratamento de erros sem expor detalhes sensíveis
- ✅ Logs não expõem dados pessoais

### Pontos de Atenção

- 🔒 Query SQL usa prepared statements (previne SQL injection)
- 🔍 Erro de banco não quebra funcionalidade (fallback)
- 📝 Logs devem ser revisados em produção (não logar dados sensíveis)

## 📈 Métricas de Sucesso

### KPIs Recomendados

1. **Taxa de Cache Hit**
   - Meta: > 70% das buscas retornam do cache local
   - Cálculo: `(buscas_cache / total_buscas) * 100`

2. **Tempo de Resposta**
   - Meta cache: < 100ms
   - Meta API: < 2000ms
   - Redução esperada: ~80% para eventos em cache

3. **Confiabilidade**
   - Meta: 99.9% de disponibilidade (com fallback)
   - Erro de banco não impacta usuário final

## 🛠️ Manutenção Futura

### Possíveis Melhorias

1. **Cache Inteligente:**
   - Atualizar dados locais periodicamente da API SAS
   - Verificar se dados locais estão "stale" (desatualizados)

2. **Analytics:**
   - Adicionar telemetria para rastrear uso de cache vs. API
   - Dashboard com métricas de performance

3. **Pré-carregamento:**
   - Job noturno para sincronizar eventos SAS no banco local
   - Aumentar taxa de cache hit

4. **Invalidação de Cache:**
   - Limpar cache quando evento é atualizado no admin
   - TTL (Time To Live) para dados em cache

## 📚 Dependências

- **PostgreSQL**: Banco de dados local
- **lib/config/database.ts**: Módulo de conexão com banco
- **API SAS**: Fallback para eventos não cadastrados

## 🔗 Arquivos Relacionados

- `/pages/api/fetch-sas-event.js` - Endpoint de busca de eventos
- `/pages/credenciamento-sas.js` - Interface de credenciamento
- `/lib/config/database.ts` - Configuração do banco de dados
- `/pages/admin/events.tsx` - Cadastro de eventos (popula cache)

---

**Data de Implementação:** 11/11/2025  
**Versão do Sistema:** v1.1.1+  
**Autor:** Sistema de IA - GitHub Copilot  
**Status:** ✅ Implementado e Testado
