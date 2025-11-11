# 🧪 Testes do Sistema de Credenciamento

## 📋 Testes Disponíveis

### 1. **Teste de Concorrência** (`concurrency-test.js`)

**Objetivo:** Validar robustez do sistema quando múltiplos atendentes credenciam simultaneamente.

**Como executar:**

```bash
# Configurar variáveis de ambiente (opcional)
export API_URL=http://localhost:3000
export TEST_EVENT_ID=123456

# Executar teste
node tests/concurrency-test.js
```

**Variáveis de ambiente:**

- `API_URL`: URL da API (padrão: `http://localhost:3000`)
- `TEST_EVENT_ID`: ID do evento de teste no SAS (padrão: `123456`)

**O que valida:**

- ✅ Apenas 1 check-in é criado mesmo com 10 requisições simultâneas
- ✅ 9 duplicatas são detectadas corretamente
- ✅ Nenhuma requisição falha
- ✅ Todas as requisições retornam sucesso

**Resultado esperado:**

```
🎉 TESTE PASSOU! Sistema é robusto para concorrência.
```

---

## 🔧 Pré-requisitos

### Banco de Dados

Certifique-se de que a migração foi executada:

```bash
psql -U postgres -d credenciamento -f sql/migrations/001_add_unique_constraint_checkins.sql
```

### Dependências

```bash
npm install node-fetch
```

### Evento de Teste

Crie um evento de teste no sistema ou use um evento existente.

---

## 📊 Interpretando Resultados

### Sucesso Total

```
✅ Requisições bem-sucedidas: 10/10
🆕 Check-ins criados: 1
🔄 Check-ins duplicados (esperado): 9
```

**Interpretação:** Sistema funcionando perfeitamente.

### Múltiplos Check-ins Criados

```
❌ 3 check-ins criados (esperado: 1)
```

**Interpretação:** Falha na concorrência. Verificar:

- Constraint UNIQUE foi aplicada?
- Código usa transações corretamente?

### Requisições Falhando

```
❌ Requisições com erro: 5/10
```

**Interpretação:** Problema mais grave. Verificar:

- Banco de dados está acessível?
- Pool de conexões está configurado corretamente?
- Logs do servidor para mais detalhes

---

## 🚀 Testes em Produção

### Não executar em produção!

Este teste cria dados reais no banco. Use apenas em:

- Ambiente de desenvolvimento
- Ambiente de staging
- Com evento de teste dedicado

### Para staging:

```bash
API_URL=https://staging.credenciamento.rr.sebrae.com.br \
TEST_EVENT_ID=evento-teste-123 \
node tests/concurrency-test.js
```

---

## 📈 Testes de Performance

### Aumentar número de requisições:

Editar `concurrency-test.js`:

```javascript
const NUM_CONCURRENT_REQUESTS = 50; // Aumentar para 50
```

### Métricas esperadas:

- **10 requisições:** ~200-500ms total
- **50 requisições:** ~500-1000ms total
- **100 requisições:** ~1-2s total

Se ultrapassar esses valores, considerar:

- Aumentar pool de conexões
- Otimizar queries
- Adicionar índices

---

## 🐛 Troubleshooting

### Erro: "Event not found"

```bash
# Verificar se evento existe
psql -U postgres -d credenciamento -c "SELECT * FROM events WHERE codevento_sas = '123456';"

# Ou criar evento de teste
psql -U postgres -d credenciamento -c "
INSERT INTO events (codevento_sas, nome, data_inicio, local, status)
VALUES ('123456', 'Evento Teste', NOW(), 'Sebrae RR', 'active');
"
```

### Erro: "Connection timeout"

```bash
# Verificar se API está rodando
curl http://localhost:3000/api/health

# Verificar logs
pm2 logs credenciamento
```

### Erro: "duplicate key violation"

```bash
# Verificar se migração foi executada
psql -U postgres -d credenciamento -c "
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'check_ins' AND constraint_type = 'UNIQUE';
"

# Deve retornar: check_ins_registration_id_key
```

---

## 📝 Adicionando Novos Testes

Template básico:

```javascript
const fetch = require('node-fetch');

async function testFeature() {
  console.log('🧪 Teste: Nome do Teste');

  try {
    // Preparar dados
    const testData = {
      /* ... */
    };

    // Executar teste
    const response = await fetch(`${API_URL}/api/endpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    // Validar resultado
    const data = await response.json();

    if (data.success) {
      console.log('✅ TESTE PASSOU');
      process.exit(0);
    } else {
      console.log('❌ TESTE FALHOU');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Erro:', error);
    process.exit(1);
  }
}

testFeature();
```

---

## 🎯 Roadmap de Testes

- [x] Teste de concorrência de credenciamento
- [ ] Teste de carga (stress test)
- [ ] Teste de integração com SAS
- [ ] Teste de sincronização de eventos
- [ ] Teste de exportação de relatórios
- [ ] Teste de autenticação e autorização
- [ ] Teste de backup e recuperação

---

## 📚 Referências

- [Node.js Fetch API](https://nodejs.org/docs/latest/api/https.html)
- [Jest Testing Framework](https://jestjs.io/)
- [PostgreSQL Testing Best Practices](https://www.postgresql.org/docs/current/regress.html)
