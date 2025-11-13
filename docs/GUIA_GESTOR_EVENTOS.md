# 🎯 Guia Completo do Sistema de Credenciamento - Sebrae RR

## Para Gestores de Eventos

---

## 📋 Índice

1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Funcionalidades Principais](#funcionalidades-principais)
3. [Módulos do Sistema](#módulos-do-sistema)
4. [Fluxo Completo de Trabalho](#fluxo-completo-de-trabalho)
5. [Planejamento por Porte de Evento](#planejamento-por-porte-de-evento)
6. [Guia de Dimensionamento](#guia-de-dimensionamento)
7. [Relatórios e Análises](#relatórios-e-análises)
8. [Perguntas Frequentes](#perguntas-frequentes)

---

## 🎯 Visão Geral do Sistema

### O que é o Sistema de Credenciamento?

O **Sistema de Credenciamento Sebrae RR** é uma plataforma web completa para gerenciar todo o ciclo de vida de eventos, desde o cadastro até a análise pós-evento.

**URL de Acesso:** `credenciamento.rr.sebrae.com.br`

### Principais Benefícios

✅ **Integração Total com SAS** - Importa automaticamente dados dos eventos cadastrados no SAS  
✅ **Credenciamento Rápido** - Leitura de QR Code ou busca por CPF em segundos  
✅ **Controle Multi-Dia** - Suporta eventos de múltiplos dias com check-ins independentes  
✅ **Relatórios Completos** - Exportação em Excel e PDF com gráficos e estatísticas  
✅ **Modo Offline** - Cache local para maior velocidade e resiliência  
✅ **Multi-Operador** - Até 20+ atendentes simultâneos sem conflitos

---

## 🔧 Funcionalidades Principais

### 1. 📊 Painel Administrativo (Admin)

**Quem tem acesso:** Gestores e administradores do sistema

**O que você pode fazer:**

#### 1.1 Gerenciamento de Eventos

- ✅ **Cadastrar Eventos Manualmente**
  - Nome, data início/fim, local, capacidade
  - Modalidade (Presencial, Online, Híbrido)
  - Tipo (Curso, Palestra, Seminário, Workshop)
  - Público-alvo, gerente, coordenador
- ✅ **Importar Eventos do SAS**
  - Digite o código SAS do evento
  - Sistema preenche automaticamente todos os dados
  - Sincronização com inscritos do SAS
- ✅ **Visualizar Lista de Eventos**
  - Filtros por nome, código SAS, status, período
  - Ordenação por nome, data ou local
  - Visualização em tabela (desktop) ou cards (mobile)
  - Paginação configurável (10, 25, 50, 100 itens)

- ✅ **Editar Eventos Existentes**
  - Atualizar informações do evento
  - Alterar status (Ativo/Inativo)
  - Modificar capacidade e datas

- ✅ **Excluir Eventos**
  - Confirmação de segurança antes de remover

#### 1.2 Painel de Relatórios do Evento

**Acesso:** Clique em qualquer evento na lista

**Informações Disponíveis:**

📊 **Estatísticas em Tempo Real:**

- Total de inscritos (do SAS)
- Total de check-ins realizados
- Check-ins por fonte (Sistema vs. Manual vs. SAS)
- Taxa de comparecimento
- Participantes confirmados/pendentes/cancelados

📈 **Gráficos Interativos:**

- Pizza: Distribuição por fonte de check-in
- Barras: Check-ins por dia (eventos multi-dia)
- Linha: Evolução temporal dos credenciamentos

📋 **Lista de Participantes:**

- Nome, CPF, email, telefone
- Status do credenciamento
- Data/hora do check-in
- Fonte da inscrição
- Filtros e busca

🔄 **Sincronização SAS:**

- Botão para atualizar inscritos do SAS
- Importa novos participantes automaticamente
- Atualiza status de inscrições

📥 **Exportações:**

- Excel (completo com todas as informações)
- PDF (relatório visual com gráficos)
- Opção de anonimização de dados (LGPD)

#### 1.3 Gerenciamento de Participantes

- ✅ **Visualizar Todos os Participantes**
  - Lista unificada de todos os eventos
  - Filtros por evento, status, período
  - Busca por nome, CPF, email
- ✅ **Importar Participantes**
  - Upload de planilha Excel/CSV
  - Validação automática de CPF
  - Detecção de duplicatas
  - Preview antes de importar

- ✅ **Editar Participantes**
  - Atualizar dados cadastrais
  - Alterar status de inscrição
  - Registrar check-in manual

- ✅ **Exportar Participantes**
  - Todos os participantes ou filtrados
  - Formatos Excel e PDF
  - Opção de anonimização

#### 1.4 Gerenciamento de Permissões

- ✅ **Controle de Acesso por Usuário**
  - Lista de usuários do sistema (Keycloak)
  - Atribuir papéis: Admin, Operador, Visualizador
  - Definir permissões específicas por evento

- ✅ **Auditoria**
  - Log de ações administrativas
  - Registro de quem fez o quê

#### 1.5 Importação de Dados

- ✅ **Upload de Planilhas**
  - Formato Excel (.xlsx) ou CSV
  - Template disponível para download
  - Validação de campos obrigatórios
  - Preview de dados antes de confirmar

- ✅ **Importação em Lote**
  - Centenas/milhares de registros de uma vez
  - Barra de progresso
  - Relatório de erros e sucessos

---

### 2. 🎫 Credenciamento de Eventos (Operacional)

**Quem tem acesso:** Operadores de credenciamento (recepcionistas, equipe de campo)

**URL:** `credenciamento.rr.sebrae.com.br/credenciamento-sas`

#### 2.1 Configuração do Turno

**Antes de começar a credenciar:**

1. **Identificação do Operador**
   - Sistema solicita nome do atendente
   - Registra quem fez cada credenciamento

2. **Seleção do Evento**
   - Busca por código SAS
   - Ou busca por nome + período
   - Sistema mostra detalhes do evento
   - Badge visual indica origem (Cache Local 💾 ou API SAS 🌐)

#### 2.2 Métodos de Credenciamento

##### Método 1: Leitura de QR Code (Recomendado)

**Mais rápido e sem erros**

1. Participante mostra QR Code (email ou celular)
2. Operador clica em "Escanear QR Code"
3. Câmera do dispositivo abre
4. Aponta para o QR Code
5. Sistema reconhece automaticamente
6. ✅ Credenciamento confirmado em 2 segundos

**Formato do QR Code:** CPF do participante

##### Método 2: Busca por CPF

**Para participantes sem QR Code**

1. Operador digita CPF (com ou sem formatação)
2. Sistema valida e busca
3. Mostra dados do participante
4. Confirma credenciamento

**Validações:**

- CPF válido (algoritmo verificador)
- Participante inscrito no evento
- Detecta check-ins duplicados

##### Método 3: Credenciamento Manual

**Para casos excepcionais (VIP, autoridades, imprensa)**

1. Operador clica em "Adicionar Manualmente"
2. Preenche formulário completo:
   - Nome completo
   - CPF
   - Email
   - Telefone
   - Vínculo (Proprietário, Contador, Funcionário, etc.)
   - Empresa (opcional)

3. Sistema cria registro e faz check-in automaticamente

#### 2.3 Experiência do Operador

**Feedback Visual Instantâneo:**

✅ **Credenciamento com Sucesso:**

- Card verde com dados do participante
- Nome, CPF, email
- Hora do credenciamento
- Botão para imprimir etiqueta (se disponível)

⚠️ **Check-in Duplicado:**

- Alerta laranja
- Mostra data/hora do check-in anterior
- Operador pode confirmar novamente se necessário

❌ **Participante Não Encontrado:**

- Alerta vermelho
- Opções:
  - Verificar se CPF está correto
  - Verificar se inscrito no evento correto
  - Adicionar manualmente (se autorizado)

**Histórico da Sessão:**

- Lista dos últimos credenciamentos
- Tempo de cada operação
- Total credenciado no turno

**Encerramento de Turno:**

- Botão para finalizar
- Mostra resumo da sessão:
  - Total credenciado
  - Tempo médio por credenciamento
  - Horário de início e fim

---

### 3. 📄 Geração de QR Codes

**URL:** `credenciamento.rr.sebrae.com.br/qrcode-sebrae`

#### Funcionalidades:

1. **QR Code Individual**
   - Digite CPF do participante
   - Gera QR Code na tela
   - Opção de download (PNG)
   - Opção de imprimir

2. **QR Codes em Lote**
   - Upload de planilha com lista de CPFs
   - Gera PDF com todos os QR Codes
   - Layout otimizado para impressão
   - 6 QR Codes por página (A4)
   - Inclui nome e CPF abaixo de cada código

3. **Personalização**
   - Logo Sebrae automático
   - Tamanho configurável
   - Margem de segurança

**Uso Típico:**

- Imprimir crachás antes do evento
- Enviar por email aos inscritos
- Incluir em kit de materiais

---

### 4. 📊 Credenciamento 4Events (Legado)

**URL:** `credenciamento.rr.sebrae.com.br/credenciamento-4events`

**Nota:** Sistema anterior, mantido para compatibilidade com eventos antigos.

**Diferenças:**

- Não se integra com SAS
- Cadastro manual de eventos
- Funcionalidades básicas de credenciamento
- Recomenda-se usar o Credenciamento SAS para novos eventos

---

## 🔄 Fluxo Completo de Trabalho

### Cenário 1: Evento Pequeno (Até 50 pessoas)

**Exemplo:** Workshop de Empreendedorismo - 30 participantes

#### Fase 1: Planejamento (7 dias antes)

1. **No SAS:**
   - Gestor cadastra evento no SAS
   - Abre inscrições
   - Participantes se inscrevem

2. **No Sistema de Credenciamento:**
   - Acesse o Admin
   - Clique em "Adicionar Evento"
   - Digite o código SAS
   - Sistema importa dados automaticamente
   - Clique em "Sincronizar Inscritos" no painel do evento

3. **Geração de QR Codes:**
   - Acesse módulo QR Code
   - Upload planilha com CPFs (exportada do SAS)
   - Baixe PDF com QR Codes
   - Envie por email ou imprima crachás

#### Fase 2: Dia do Evento

1. **Setup:**
   - 1 operador com notebook/tablet
   - Acesse Credenciamento SAS
   - Configure turno (nome do operador)
   - Selecione o evento pelo código SAS

2. **Credenciamento:**
   - Participantes chegam
   - Mostram QR Code
   - Operador escaneia
   - ✅ Credenciado em 2 segundos

3. **Exceções:**
   - Participante sem QR Code? → Busca por CPF
   - Não inscrito? → Credenciamento manual (se autorizado)

#### Fase 3: Pós-Evento

1. **Relatórios:**
   - Acesse painel do evento no Admin
   - Visualize estatísticas
   - Exporte relatório em PDF
   - Envie para coordenação

---

### Cenário 2: Evento Médio (100-300 pessoas)

**Exemplo:** Seminário de Inovação - 200 participantes - 1 dia

#### Recomendações:

**Equipe:**

- 2-3 operadores de credenciamento
- 1 supervisor/gestor

**Equipamentos:**

- 2-3 notebooks/tablets
- 1 impressora térmica (crachás) - opcional
- WiFi estável ou hotspot 4G

**Setup:**

- Criar múltiplas sessões (um operador por dispositivo)
- Todos selecionam o mesmo evento
- Sistema suporta até 20+ operadores simultâneos

**Fluxo:**

- Fila única → Vários pontos de atendimento
- Tempo médio: 15-20 segundos por pessoa
- Capacidade: ~200 pessoas/hora (3 operadores)

---

### Cenário 3: Evento Grande (500-1000 pessoas)

**Exemplo:** Feira de Negócios - 800 participantes - 2 dias

#### Recomendações:

**Equipe:**

- 5-6 operadores por dia
- 1 coordenador de credenciamento
- 1 suporte técnico

**Equipamentos:**

- 5-6 notebooks/tablets
- 2 impressoras térmicas
- Rede WiFi dedicada (5GHz)
- Backup: Hotspot 4G

**Estratégias:**

1. **Pré-Credenciamento:**
   - Disponibilizar QR Codes com antecedência
   - Incentivar participantes a baixarem antes
   - Reduz tempo no dia do evento

2. **Credenciamento por Horário:**
   - Dividir inscritos por faixas horárias
   - Reduzir filas e aglomerações

3. **Check-ins Múltiplos Dias:**
   - Sistema registra check-in por dia automaticamente
   - Participante pode retornar no dia 2 sem problemas

4. **Postos de Atendimento:**
   - Separar por tipo: Inscritos / Convidados / VIPs
   - Mesa de suporte para problemas

**Fluxo:**

- Capacidade: ~400 pessoas/hora (6 operadores)
- Meta: Credenciar 800 pessoas em 2 horas

---

### Cenário 4: Mega Evento (1000+ pessoas, múltiplos dias)

**Exemplo:** Feira Estadual - 3000 participantes - 4 dias - Fluxo de 10.000 visitantes/dia

#### Recomendações:

**Equipe:**

- 10-15 operadores de credenciamento
- 2-3 coordenadores
- 2 técnicos de suporte
- 1 gestor geral

**Equipamentos:**

- 10-15 notebooks/tablets
- 5 impressoras térmicas
- Servidor local (opcional, para cache)
- Rede WiFi empresarial
- Backup: Múltiplos hotspots 4G
- Totens de autoatendimento (se disponível)

**Estratégias Avançadas:**

1. **Credenciamento Online Prévio:**
   - Liberar credenciamento virtual 48h antes
   - Participantes fazem check-in pelo celular
   - Chegam com QR Code já validado

2. **Setorização:**
   - Entrada Principal: Público geral
   - Entrada VIP: Autoridades e parceiros
   - Entrada Imprensa: Credenciamento especial
   - Entrada Expositores: Credenciamento separado

3. **Turnos:**
   - Turno Manhã: 07:00-13:00 (6h)
   - Turno Tarde: 13:00-19:00 (6h)
   - Revezamento de operadores

4. **Dashboard em Tempo Real:**
   - Projetor com estatísticas ao vivo
   - Total credenciado vs. esperado
   - Velocidade média
   - Alertas de problemas

5. **Contingência:**
   - Lista impressa de emergência
   - Credenciamento manual em papel (último recurso)
   - Validação posterior no sistema

**Fluxo:**

- Capacidade: ~1000 pessoas/hora (15 operadores)
- Meta Dia 1: Credenciar 2000+ pessoas em 2-3 horas (pico)
- Dias 2-4: Fluxo menor, validação de retorno

---

## 📏 Guia de Dimensionamento

### Calculadora de Recursos

#### Fórmula Básica:

```
Tempo Total de Credenciamento =
  (Número de Participantes × Tempo Médio) / Número de Operadores
```

**Tempo Médio por Credenciamento:**

- Com QR Code: 10-15 segundos
- Busca por CPF: 20-30 segundos
- Manual: 60-90 segundos

#### Tabela de Referência:

| Porte do Evento  | Participantes | Operadores Recomendados | Tempo Estimado | Equipamentos                                              |
| ---------------- | ------------- | ----------------------- | -------------- | --------------------------------------------------------- |
| **Micro**        | 10-30         | 1                       | 30-45 min      | 1 notebook                                                |
| **Pequeno**      | 30-100        | 1-2                     | 45-90 min      | 1-2 notebooks                                             |
| **Médio**        | 100-300       | 2-4                     | 1-2 horas      | 2-4 notebooks + impressora                                |
| **Grande**       | 300-800       | 4-6                     | 2-3 horas      | 4-6 notebooks + 2 impressoras + WiFi                      |
| **Muito Grande** | 800-2000      | 6-10                    | 3-4 horas      | 6-10 notebooks + 3 impressoras + WiFi + suporte           |
| **Mega**         | 2000+         | 10-15+                  | 4-6 horas      | 10-15 notebooks + 5 impressoras + infraestrutura completa |

### Checklist de Equipamentos por Porte

#### Evento Pequeno (até 100 pessoas)

- ✅ 1-2 notebooks/tablets
- ✅ Acesso à internet (WiFi ou 4G)
- ✅ Impressora opcional

#### Evento Médio (100-300 pessoas)

- ✅ 2-4 notebooks/tablets
- ✅ WiFi estável (5 Mbps+)
- ✅ 1 impressora térmica
- ✅ Mesa de credenciamento
- ✅ Sinalizações

#### Evento Grande (300-1000 pessoas)

- ✅ 4-6 notebooks/tablets
- ✅ WiFi dedicado (10 Mbps+)
- ✅ 2 impressoras térmicas
- ✅ Mesas de credenciamento (múltiplas)
- ✅ Sinalizações e organizadores de fila
- ✅ Técnico de suporte on-site

#### Mega Evento (1000+ pessoas)

- ✅ 10-15 notebooks/tablets
- ✅ Rede WiFi empresarial (50 Mbps+)
- ✅ 5 impressoras térmicas
- ✅ Estrutura modular de credenciamento
- ✅ Totens de autoatendimento
- ✅ Sinalizações digitais
- ✅ Equipe técnica completa
- ✅ Gerador/UPS (energia backup)
- ✅ Hotspots 4G backup

---

## 📊 Relatórios e Análises

### O que o Sistema Gera Automaticamente

#### 1. Relatório de Evento (PDF)

**Conteúdo:**

- Cabeçalho com logo Sebrae
- Informações do evento
- Estatísticas principais:
  - Total de inscritos no SAS
  - Total de check-ins pelo sistema
  - Taxa de comparecimento
- Tabelas:
  - Participantes presentes (com data/hora de check-in)
  - Participantes ausentes
- Detalhamento por fonte (SAS, Sistema, Manual)
- Data/hora de extração

**Quando usar:**

- Prestação de contas
- Documentação do evento
- Análise de comparecimento
- Relatórios gerenciais

#### 2. Planilha Excel Completa

**Conteúdo:**

- Aba 1: Visão Geral
  - Informações do evento
  - Estatísticas resumidas
- Aba 2: Lista de Participantes
  - Todas as colunas:
    - Nome, CPF, Email, Telefone
    - Fonte de inscrição
    - Status de credenciamento
    - Data/hora de check-in
    - Data de inscrição

**Quando usar:**

- Análises detalhadas
- Mailing list
- Integração com outros sistemas
- Cruzamento de dados

#### 3. Gráficos Interativos (Web)

**Disponíveis no painel do evento:**

- Pizza: Distribuição por fonte
- Barras: Check-ins por dia
- Linha: Evolução temporal
- Indicadores: KPIs principais

**Quando usar:**

- Monitoramento em tempo real
- Apresentações
- Acompanhamento durante o evento

---

### Análises Recomendadas

#### Análise de Comparecimento

**Perguntas que você pode responder:**

- Qual a taxa de comparecimento real vs. inscritos?
- Quantos inscritos não compareceram?
- Qual o padrão de horário de chegada?
- Houve desistências? Quantas?

**Como fazer:**

1. Exporte relatório após o evento
2. Compare: Total Inscritos × Total Presentes
3. Calcule taxa: (Presentes / Inscritos) × 100

**Benchmarks Sebrae:**

- Eventos gratuitos: 60-70% comparecimento
- Eventos pagos: 80-90% comparecimento
- Cursos longos: 70-85% comparecimento

#### Análise de Perfil

**Se tiver dados:**

- Faixa etária predominante
- Vínculo (proprietário, contador, funcionário)
- Distribuição geográfica (por cidade)
- Tipo de empresa (porte, setor)

**Como usar:**

- Planejar eventos futuros
- Adequar conteúdo ao público
- Estratégias de divulgação

#### Análise Operacional

**Métricas internas:**

- Tempo médio de credenciamento
- Pico de fluxo (horário)
- Eficiência por operador
- Taxa de problemas/exceções

**Como usar:**

- Melhorar processos
- Dimensionar equipe para próximos eventos
- Identificar gargalos

---

## ❓ Perguntas Frequentes (FAQ)

### Acesso ao Sistema

**Q: Como faço para obter acesso ao sistema?**
A: Entre em contato com a UTIC - Sebrae RR. O acesso é via Keycloak (login único do Sebrae).

**Q: Esqueci minha senha, o que fazer?**
A: Use a opção "Esqueci minha senha" na tela de login do Keycloak. Ou contate a UTIC.

**Q: Posso acessar de qualquer lugar?**
A: Sim, o sistema é web e pode ser acessado de qualquer dispositivo com internet.

### Cadastro de Eventos

**Q: Preciso cadastrar evento manualmente ou posso importar do SAS?**
A: Você pode importar diretamente do SAS digitando o código do evento. Isso preenche tudo automaticamente.

**Q: O evento já está no SAS, por que preciso cadastrar no sistema de credenciamento?**
A: O sistema de credenciamento é independente do SAS. Você precisa "vincular" o evento do SAS ao sistema de credenciamento para liberar o credenciamento.

**Q: Posso editar um evento depois de criado?**
A: Sim, no painel admin, clique no botão de edição (ícone de lápis) ao lado do evento.

**Q: Como faço para inativar um evento cancelado?**
A: Edite o evento e altere o status para "Inativo".

### Participantes

**Q: Como os participantes entram no sistema?**
A: De 3 formas:

1. Sincronização automática do SAS (recomendado)
2. Importação de planilha Excel/CSV
3. Cadastro manual durante credenciamento

**Q: Posso adicionar participantes após o início do evento?**
A: Sim, use o credenciamento manual ou importe planilha atualizada.

**Q: Como atualizo a lista de inscritos do SAS?**
A: No painel do evento, clique em "Sincronizar com SAS". Isso importa novos inscritos e atualiza status.

### Credenciamento

**Q: Posso credenciar sem internet?**
A: Não totalmente. O sistema precisa de conexão para funcionar. Recomenda-se ter WiFi estável ou hotspot 4G.

**Q: O que acontece se o participante tentar fazer check-in duas vezes?**
A: O sistema alerta que já há um check-in registrado, mostra data/hora, mas permite confirmar novamente se necessário.

**Q: Posso credenciar participantes de vários eventos ao mesmo tempo?**
A: Não no mesmo turno. Cada operador deve selecionar um evento por vez. Para múltiplos eventos simultâneos, use múltiplos operadores.

**Q: Como funciona para eventos de múltiplos dias?**
A: O sistema registra check-in por dia automaticamente. Se o participante voltar no dia 2, pode fazer novo check-in sem problemas.

### QR Codes

**Q: Como gero QR Codes para os participantes?**
A: Acesse o módulo "QR Code Sebrae", faça upload da planilha com CPFs, e baixe o PDF com todos os códigos.

**Q: Posso enviar QR Code por email?**
A: Sim, você pode gerar individual e enviar por email, ou incluir no email de confirmação de inscrição.

**Q: O QR Code expira?**
A: Não, o QR Code contém apenas o CPF. Funciona indefinidamente.

**Q: Funciona com qualquer leitor de QR Code?**
A: O QR Code é lido pela câmera do dispositivo do operador dentro do sistema. Não é necessário app externo.

### Relatórios

**Q: Posso exportar dados anonimizados?**
A: Sim, ao exportar, marque a opção "Anonimizar dados". Isso mascara CPF, email e telefone.

**Q: Como baixo a lista de presença?**
A: No painel do evento, clique em "Exportar" e escolha Excel ou PDF. A lista de presentes está na tabela verde.

**Q: Os relatórios são em tempo real?**
A: Sim, as estatísticas e gráficos do painel são atualizadas automaticamente.

**Q: Posso imprimir lista de presença em branco antes do evento?**
A: Sim, exporte a lista de inscritos antes do evento. No Excel, você pode imprimir uma coluna de "assinatura" em branco.

### Problemas Técnicos

**Q: O sistema está lento, o que fazer?**
A: Verifique sua conexão de internet. Se estiver boa, contate a UTIC. O sistema tem cache local para eventos já consultados.

**Q: O participante está inscrito no SAS mas não aparece no sistema, por quê?**
A: Faça a sincronização com o SAS no painel do evento. Clique em "Sincronizar Inscritos".

**Q: Erro ao ler QR Code, o que fazer?**
A: Verifique:

1. Câmera do dispositivo está funcionando
2. Iluminação adequada
3. QR Code legível (não borrado)
   Se persistir, use busca por CPF.

**Q: Erro "CPF inválido", o que significa?**
A: O CPF digitado não passa na validação do algoritmo verificador. Verifique se foi digitado corretamente.

---

## 📞 Suporte

### Contatos

**UTIC - Sebrae RR**

- Email: utic@rr.sebrae.com.br
- Telefone: (95) XXXX-XXXX
- Horário: Segunda a sexta, 8h às 18h

**Suporte Emergencial (Dia de Evento):**

- WhatsApp: (95) XXXXX-XXXX
- Disponível durante eventos de grande porte

### Documentação Técnica

- **Manual Completo:** `docs/MANUAL_USUARIO.pdf`
- **Guia Rápido:** `docs/GUIA_RAPIDO.pdf`
- **Vídeos Tutoriais:** Link no sistema

---

## 📝 Conclusão

O Sistema de Credenciamento Sebrae RR foi desenvolvido para tornar o gerenciamento de eventos mais eficiente, rápido e profissional.

**Principais Vantagens:**
✅ Reduz tempo de credenciamento em até 80%
✅ Elimina erros manuais
✅ Integração total com SAS
✅ Relatórios automáticos e profissionais
✅ Suporta de 10 a 10.000 participantes

**Próximos Passos:**

1. Solicite acesso à UTIC
2. Faça o treinamento básico
3. Teste com evento pequeno
4. Expanda para eventos maiores

**Feedback:**
Sua opinião é importante! Envie sugestões de melhorias para utic@rr.sebrae.com.br

---

**Versão do Sistema:** v1.1.1  
**Data do Guia:** Novembro/2025  
**Elaborado por:** UTIC - Sebrae RR

---
