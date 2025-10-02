# 🔍 Nova Funcionalidade: Buscar e Importar Eventos SAS no Painel Admin

## ✅ O que foi implementado:

### 1. **Nova API** (`/api/fetch-sas-event`)
- Busca evento específico no SAS pelo código
- Usa período amplo de busca (1 ano atrás até 1 ano à frente)
- Formata dados para o padrão do sistema local
- Mantém dados originais para referência

### 2. **Painel Admin Atualizado** (`pages/admin/events.js`)
- **Seção de importação SAS** no modal de criação
- Campo para digitar código SAS
- Botão "Buscar" que preenche automaticamente os campos
- **Nova coluna** na tabela mostrando código SAS (quando existe)
- Campo readonly no formulário mostrando código SAS importado

### 3. **API Admin Atualizada** (`/api/admin/events`)
- Aceita campo `codevento_sas` na criação e atualização
- Persiste código SAS no banco de dados

### 4. **Migração do Banco** (`migration_add_codevento_sas.sql`)
- Adiciona campo `codevento_sas` na tabela events
- **EXECUTE ANTES DE TESTAR**

---

## 🎯 Como usar:

### **1. Execute a migração primeiro:**
```sql
-- Cole e execute o conteúdo de migration_add_codevento_sas.sql no Supabase
```

### **2. No painel admin:**
1. Acesse `/painel-admin` → **Eventos**
2. Clique em **"Adicionar Evento"**
3. Na seção azul **"Importar evento do SAS"**:
   - Digite o código do evento SAS (ex: `244584759`)
   - Clique **"Buscar"**
4. **Todos os campos são preenchidos automaticamente** ✨
5. Ajuste o que precisar e clique **"Criar"**

### **3. Na tabela de eventos:**
- **Nova coluna "Código SAS"** mostra eventos importados
- Badge azul indica eventos vindos do SAS
- Hífen (-) para eventos criados manualmente

---

## 🔧 Como funciona:

### **Busca no SAS:**
```javascript
// Usa a mesma API do credenciamento, mas com período amplo
GET /api/fetch-sas-event?codEvento=244584759

// Retorna dados formatados:
{
  "evento": {
    "codevento_sas": "244584759",
    "nome": "Workshop de Inovação",
    "data_inicio": "2025-10-15T09:00:00.000Z",
    "local": "Auditório SEBRAE",
    "capacidade": 150,
    // ... outros campos
  }
}
```

### **Preenchimento automático:**
- **Nome** → TituloEvento
- **Data** → DataEvento  
- **Local** → LocalEvento
- **Capacidade** → QtdVagas
- **Gerente** → ResponsavelEvento
- **E todos os outros campos mapeados**

---

## ✨ Benefícios:

✅ **Economia de tempo** - não precisa digitar dados manualmente  
✅ **Dados precisos** - vem direto do SAS sem erros de digitação  
✅ **Rastreabilidade** - sabe quais eventos vieram do SAS  
✅ **Integração completa** - funciona com a sincronização automática  
✅ **Flexibilidade** - pode ajustar dados após importar  

---

## 🧪 Para testar:

### **Códigos de exemplo:**
- Use códigos reais do SAS da sua região
- Teste com: `244584759` (se existir)
- Verifique se o período de busca está correto

### **Verificar:**
1. ✅ Migração executada no Supabase
2. ✅ Servidor rodando (`npm run dev`)
3. ✅ Variáveis de ambiente do SAS configuradas
4. ✅ Campo "Código SAS" aparece na modal
5. ✅ Busca preenche todos os campos
6. ✅ Evento salvo com código SAS
7. ✅ Badge azul aparece na tabela

---

## 🔗 Integração com credenciamento:

Esta funcionalidade trabalha junto com a **sincronização automática SAS**:

1. **Admin cria evento** importando do SAS → fica no banco local
2. **Credenciamento SAS** usa mesmo código → encontra evento existente  
3. **Dados consistentes** entre admin e credenciamento

---

## 📋 Próximos passos (opcionais):

- [ ] Busca por lista de eventos SAS  
- [ ] Importação em lote  
- [ ] Sincronização automática de mudanças  
- [ ] Filtro por eventos SAS na lista  

A funcionalidade está pronta para uso! 🚀