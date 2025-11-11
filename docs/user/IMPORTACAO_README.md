# 📊 Guia de Importação de Participantes

## 🎯 Visão Geral

O sistema permite importar dados de participantes, empresas e eventos a partir de planilhas Excel (.xlsx, .xls) ou CSV (.csv).

---

## 📋 Formato da Planilha

### Colunas Obrigatórias:

| Coluna          | Descrição                     | Formato                          | Obrigatório |
| --------------- | ----------------------------- | -------------------------------- | ----------- |
| **CPF**         | CPF do participante           | XXX.XXX.XXX-XX ou apenas números | ✅ Sim      |
| **NOME**        | Nome completo do participante | Texto                            | ✅ Sim      |
| **Evento_Nome** | Nome do evento                | Texto                            | ✅ Sim      |

### Colunas Opcionais:

| Coluna         | Descrição               | Formato      | Padrão     |
| -------------- | ----------------------- | ------------ | ---------- |
| **ORIGEM**     | Origem do cadastro      | SAS ou CPE   | SAS        |
| **EMPRESA**    | Nome da empresa         | Texto        | -          |
| **Data**       | Data da inscrição       | DD/MM/AAAA   | Data atual |
| **Cod_Evento** | Código do evento no SAS | Texto/Número | -          |

---

## 📝 Exemplo de Planilha

```
CPF                | NOME              | ORIGEM | EMPRESA           | Data       | Evento_Nome                    | Cod_Evento
123.456.789-00     | João da Silva     | SAS    | Empresa ABC LTDA  | 15/01/2024 | Workshop Empreendedorismo      | WKS2024001
987.654.321-00     | Maria Santos      | CPE    | Outra Empresa SA  | 20/01/2024 | Palestra de Inovação           | PAL2024002
111.222.333-44     | Pedro Oliveira    | SAS    |                   | 25/01/2024 | Curso de Gestão                | CUR2024003
```

---

## 🔄 Como Funciona a Importação

### 1. **Validação de CPF**

- Sistema remove caracteres especiais
- Valida se tem 11 dígitos
- Formata automaticamente como XXX.XXX.XXX-XX

### 2. **Processamento de Participantes**

- **Se CPF já existe**: Atualiza o nome e empresa
- **Se CPF não existe**: Cria novo participante

### 3. **Processamento de Empresas**

- Busca empresa pelo nome (razão social ou nome fantasia)
- Se não encontrar, deixa o participante sem empresa (você pode cadastrar a empresa depois)

### 4. **Processamento de Eventos**

- **Busca por código SAS** (se fornecido)
- **Busca por nome** (se código não fornecido)
- **Se não encontrar**: Cria evento automaticamente com os dados fornecidos

### 5. **Registro de Inscrição**

- Vincula participante ao evento
- Se já estiver inscrito, ignora (não duplica)

---

## 📊 Como Usar

### Passo 1: Preparar a Planilha

1. Use Excel, Google Sheets ou qualquer editor de planilhas
2. Certifique-se de que a primeira linha contém os nomes das colunas
3. Preencha os dados nas linhas seguintes

### Passo 2: Acessar o Sistema

1. Faça login no sistema
2. Acesse **Módulo Administração**
3. Clique em **Importar** no menu lateral

### Passo 3: Fazer Upload

1. Clique em "Baixar Planilha Modelo" se precisar de um exemplo
2. Clique em "Escolher Arquivo"
3. Selecione sua planilha (Excel ou CSV)
4. Clique em "Importar Dados"

### Passo 4: Verificar Resultado

- **Total de linhas**: Quantas linhas foram processadas
- **Importadas**: Quantas foram importadas com sucesso
- **Erros**: Linhas com problemas que não foram importadas
- **Avisos**: Linhas importadas mas com observações

---

## ⚠️ Mensagens de Erro Comuns

| Erro                       | Causa                             | Solução                                |
| -------------------------- | --------------------------------- | -------------------------------------- |
| "CPF inválido ou ausente"  | CPF vazio ou com formato inválido | Verifique se o CPF tem 11 dígitos      |
| "Nome ausente"             | Campo NOME vazio                  | Preencha o nome do participante        |
| "Nome do evento ausente"   | Sem nome de evento                | Preencha o nome do evento              |
| "Participante já inscrito" | CPF já registrado no evento       | Isso é esperado, não é um erro crítico |

---

## 💡 Avisos Comuns

| Aviso                              | Significado                           | Ação Necessária                         |
| ---------------------------------- | ------------------------------------- | --------------------------------------- |
| "Empresa não encontrada"           | Nome da empresa não existe no sistema | Cadastre a empresa antes ou deixe vazio |
| "Data inválida, usando data atual" | Formato de data não reconhecido       | Use formato DD/MM/AAAA                  |
| "Evento criado automaticamente"    | Evento não existia e foi criado       | Revise os dados do evento depois        |

---

## 🎯 Dicas e Boas Práticas

### ✅ DO (Faça)

- ✅ Padronize os nomes das colunas (exatamente como indicado)
- ✅ Remova linhas vazias da planilha
- ✅ Teste com poucas linhas primeiro
- ✅ Cadastre empresas antes de importar (se possível)
- ✅ Cadastre eventos antes de importar (se possível)
- ✅ Use CPFs válidos

### ❌ DON'T (Não Faça)

- ❌ Não use acentos ou caracteres especiais nos nomes das colunas
- ❌ Não deixe linhas de cabeçalho duplicadas
- ❌ Não misture formatos de CPF na mesma planilha
- ❌ Não use datas em formatos não padronizados

---

## 🔍 Troubleshooting

### Problema: "Formato de arquivo inválido"

**Solução**: Verifique se o arquivo é .xlsx, .xls ou .csv

### Problema: "Planilha vazia"

**Solução**:

1. Verifique se a planilha tem dados
2. Certifique-se de que a primeira linha é o cabeçalho
3. Verifique se há pelo menos uma linha de dados

### Problema: "Muitos erros na importação"

**Solução**:

1. Baixe a planilha modelo
2. Compare sua planilha com o modelo
3. Verifique os nomes das colunas
4. Teste com 2-3 linhas primeiro

### Problema: "Eventos criados duplicados"

**Solução**:

- Cadastre os eventos manualmente antes de importar
- Use o campo `Cod_Evento` para identificar eventos únicos

---

## 📞 Suporte

Se continuar com problemas:

1. Verifique o **Resultado da Importação** na tela
2. Leia as mensagens de erro específicas
3. Corrija os dados conforme indicado
4. Tente importar novamente

---

## 🔐 Permissões

- **Admin** e **Manager**: Podem importar dados
- **Operator**: Não tem acesso à funcionalidade de importação

---

**Última atualização:** 07/11/2025
