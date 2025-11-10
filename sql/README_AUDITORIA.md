# 🔍 Auditoria do Banco de Dados - Sistema de Credenciamento

Este diretório contém scripts para auditar a integridade do fluxo de dados entre o módulo SAS e o painel administrativo.

---

## 📋 Arquivos

| Arquivo | Descrição |
|---------|-----------|
| **`AUDITORIA_PGADMIN.md`** | ⭐ **RECOMENDADO** - Guia passo a passo para usar no pgAdmin |
| `audit_database.sql` | Script SQL completo de auditoria com 8 verificações |
| `audit.js` | Script Node.js para auditoria (alternativa ao psql) |
````markdown
# Arquivo arquivado: README de Auditoria

Este arquivo foi movido para `docs/archive/README_AUDITORIA.md` para manter o repositório organizado.

Por favor, consulte `docs/archive/README_AUDITORIA.md` para a versão completa.

````
SELECT * FROM events WHERE codevento_sas = 'CODIGO_AQUI';
```

### Listar todas as inscrições de um evento:
```sql
SELECT 
  p.nome, 
  r.status, 
  r.data_inscricao,
  ci.data_check_in
FROM registrations r
JOIN participants p ON p.id = r.participant_id
LEFT JOIN check_ins ci ON ci.registration_id = r.id
WHERE r.event_id = (
  SELECT id FROM events WHERE codevento_sas = 'CODIGO_AQUI'
);
```

### Forçar atualização de status:
```sql
-- Mudar 'confirmed' para 'checked_in' em eventos SAS
UPDATE registrations
SET status = 'checked_in'
WHERE event_id IN (
  SELECT id FROM events WHERE codevento_sas IS NOT NULL
)
AND status = 'confirmed';
```

---

## 📝 Interpretando os Resultados

### ✅ **Sistema Saudável:**
- Eventos SAS aparecem na seção 1
- Cada evento tem registrations (seção 2)
- Cada registration tem check-in (seção 3)
- Status predominante é `'checked_in'` (seção 4)
- Poucos ou nenhum evento sem registrations (seção 5)

### ⚠️ **Sistema com Problemas:**
- Eventos SAS não aparecem (seção 1)
- Eventos existem mas sem registrations (seção 5)
- Status predominante é `'confirmed'` mas admin não mostra (seção 4)
- Últimas operações não mostram atividade recente (seção 7)

---

## 🔗 Arquivos Relacionados

- **Documentação completa:** `AUDITORIA_BANCO_DADOS.md`
- **Fluxo de credenciamento:** `../pages/credenciamento-sas.js`
- **API de sincronização:** `../pages/api/sync-sas-event.js`
- **API de credenciamento:** `../pages/api/register-local-credenciamento.js`
- **API de listagem:** `../pages/api/admin/events.js`

---

## 💡 Dicas

1. **Execute a auditoria regularmente** durante testes de credenciamento
2. **Salve os resultados** com timestamp para comparação histórica
3. **Verifique os logs do Next.js** em paralelo: `npm run dev`
4. **Use o modo desenvolvedor do navegador** (F12) para ver erros de API
5. **Teste com um evento SAS real** do sistema de produção

---

## 🆘 Suporte

Se a auditoria identificar problemas:

1. Leia `AUDITORIA_BANCO_DADOS.md` para entender o fluxo completo
2. Verifique os logs do servidor Next.js
3. Execute queries individuais para investigar detalhes
4. Consulte as "Soluções Propostas" na documentação

---

**Autor:** GitHub Copilot  
**Versão:** 1.0  
**Última Atualização:** ${new Date().toLocaleDateString('pt-BR')}
