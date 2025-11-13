# Logo Utilities - Documentação

## Descrição

Utilitários para adicionar o logo do Sebrae RR em relatórios PDF gerados pelo sistema de credenciamento.

## Localização dos Logos

- **Logo Branco**: `public/sebrae-logo-white.png` - Usado sobre fundos escuros (faixa azul)
- **Logo Azul**: `public/logo-sebrae-blue.png` - Usado sobre fundos claros
- **Formato**: PNG com transparência

## Design Visual dos PDFs

### Layout do Cabeçalho

```
┌────────────────────────────────────────────────┐
│  [LOGO BRANCO]    RELATÓRIO DO EVENTO          │ <- Faixa Azul (#005293)
│                   Subtítulo (se houver)        │    30mm de altura
└────────────────────────────────────────────────┘
     Gerado em: DD/MM/AAAA HH:MM
```

- **Faixa azul**: Largura total (210mm), altura 30mm
- **Logo**: Posição (15mm, 8mm), tamanho 35x12mm
- **Título**: Centralizado, fonte 18pt, negrito, branco
- **Subtítulo**: Centralizado, fonte 11pt, normal, branco

## Funções Disponíveis

### `getLogoBase64(variant)`

Converte o logo para formato base64 para embedding em PDFs.

**Parâmetros**:

- `variant` (opcional): `'white'` ou `'blue'` (padrão: `'blue'`)

**Retorno**: String base64 com prefixo `data:image/png;base64,`

**Exemplo**:

```typescript
import { getLogoBase64 } from '@/lib/utils/logo';

const logoWhite = getLogoBase64('white'); // Para fundo escuro
const logoBlue = getLogoBase64('blue'); // Para fundo claro

doc.addImage(logoWhite, 'PNG', 15, 8, 35, 12);
```

### `getLogoDimensions()`

Retorna as dimensões recomendadas do logo para PDFs.

**Retorno**:

```typescript
{
  width: 35,  // mm
  height: 12  // mm
}
```

**Exemplo**:

```typescript
import { getLogoDimensions } from '@/lib/utils/logo';

const { width, height } = getLogoDimensions();
```

### `addLogoToPDF(doc, xPosition, yPosition, options)`

Adiciona o logo automaticamente a um documento jsPDF.

**Parâmetros**:

- `doc` (jsPDF): Instância do documento jsPDF
- `xPosition` (number): Posição X em mm (padrão: 15)
- `yPosition` (number): Posição Y em mm (padrão: 10)
- `options` (objeto opcional):
  - `width` (number): Largura customizada em mm
  - `height` (number): Altura customizada em mm
  - `variant` ('white' | 'blue'): Variante do logo (padrão: 'blue')

**Retorno**: Nova posição Y após inserir o logo (para continuar o layout)

**Exemplo**:

```typescript
import { jsPDF } from 'jspdf';
import { addLogoToPDF } from '@/lib/utils/logo';

const doc = new jsPDF();

// Logo branco para fundo escuro
let yPos = addLogoToPDF(doc, 15, 10, { variant: 'white' });

// Logo azul para fundo claro
yPos = addLogoToPDF(doc, 15, yPos, { variant: 'blue' });
```

## Integração com Exportações

### Em `lib/export/pdf.ts`

O logo branco é automaticamente adicionado na faixa azul quando `includeHeader: true`:

```typescript
import { exportToPDF } from '@/lib/export';

const pdfBuffer = await exportToPDF(data, {
  title: 'Relatório de Eventos',
  subtitle: 'Janeiro 2025',
  includeHeader: true, // Faixa azul + logo branco + título
  orientation: 'landscape',
});
```

### Layout Gerado Automaticamente

- **Faixa azul Sebrae**: 210mm x 30mm no topo
- **Logo branco**: Lado esquerdo (15mm, 8mm)
- **Título**: Centralizado em branco, fonte 18pt
- **Subtítulo**: Centralizado em branco, fonte 11pt (opcional)
- **Data de geração**: Abaixo da faixa, fonte 10pt cinza

### Em APIs de Exportação

O layout com faixa azul e logo branco é automaticamente incluído em:

- `/api/admin/events/[id]/export` (formato PDF)
- Qualquer outra API que use `lib/export/pdf.ts`

## Personalização

### Usar logo azul (fundo claro)

```typescript
import { getLogoBase64 } from '@/lib/utils/logo';

const logoBlue = getLogoBase64('blue');
doc.addImage(logoBlue, 'PNG', 15, 10, 35, 12);
```

### Customizar dimensões

```typescript
import { addLogoToPDF } from '@/lib/utils/logo';

yPos = addLogoToPDF(doc, 15, yPos, {
  width: 40,
  height: 15,
  variant: 'white',
});
```

## Tratamento de Erros

As funções incluem tratamento de erros:

- Se o arquivo do logo não for encontrado, retorna string vazia
- Logs de warning são emitidos no console para debug
- O PDF continua sendo gerado mesmo sem o logo
- Fallback gracioso para manter a funcionalidade

## Manutenção

### Atualizar logos:

1. **Logo Branco**: Substitua `public/sebrae-logo-white.png`
2. **Logo Azul**: Substitua `public/logo-sebrae-blue.png`
3. Mantenha o formato PNG com transparência
4. Dimensões recomendadas: proporção 3:1 (largura:altura)
5. Resolução: 300dpi ou superior para qualidade
6. Não é necessário alterar código - a mudança é automática

### Cores do Sebrae:

- **Azul Primário**: #005293 / RGB(0, 82, 147)
- **Branco**: #FFFFFF / RGB(255, 255, 255)

## Notas Técnicas

- **Formato**: Base64 encoding é usado para embedding direto no PDF
- **Performance**: Logo é lido do filesystem a cada requisição (considerar cache futuro)
- **Compatibilidade**: Funciona com jsPDF v2.5.0+
- **Segurança**: Arquivo lido apenas do diretório `public/`
