# Guia de Contribuição

## 🎯 Antes de Começar

1. Certifique-se de que sua contribuição está alinhada com os objetivos do projeto
2. Verifique se não existe uma issue similar já aberta
3. Leia o [Guia de Estilo](./STYLEGUIDE.md)

## 🚀 Processo de Desenvolvimento

### 1. Configuração Local

```bash
# Clone o repositório
git clone https://github.com/sebrae/projeto-credenciamento.git

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env

# Execute o projeto
npm run dev
```

### 2. Criando uma Branch

```bash
# Atualize sua main
git checkout main
git pull origin main

# Crie uma nova branch
git checkout -b [tipo]/[descricao]
```

Tipos de branch:
- `feature/`: Nova funcionalidade
- `fix/`: Correção de bug
- `refactor/`: Refatoração de código
- `docs/`: Documentação
- `test/`: Adição/modificação de testes

### 3. Desenvolvimento

#### Padrões de Código

- Siga o [Guia de Estilo](./STYLEGUIDE.md)
- Use TypeScript
- Mantenha componentes pequenos e focados
- Documente funções complexas
- Adicione testes para novas funcionalidades

#### Commits

Seguimos o padrão Conventional Commits:

```
tipo(escopo): descrição

[corpo]

[rodapé]
```

Tipos:
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `refactor`: Refatoração
- `docs`: Documentação
- `test`: Testes
- `chore`: Manutenção

Exemplo:
```
feat(auth): adiciona validação de token JWT

- Implementa middleware de autenticação
- Adiciona geração de token
- Configura validação de sessão

Closes #123
```

### 4. Testes

```bash
# Execute os testes
npm run test

# Verifique a cobertura
npm run test:coverage
```

Certifique-se de:
- Adicionar testes para novas funcionalidades
- Manter ou aumentar a cobertura de testes
- Verificar se todos os testes passam

### 5. Pull Request

1. Atualize sua branch com a main
```bash
git checkout main
git pull origin main
git checkout sua-branch
git rebase main
```

2. Push suas alterações
```bash
git push origin sua-branch
```

3. Crie o Pull Request no GitHub
   - Use o template fornecido
   - Descreva suas alterações
   - Link issues relacionadas
   - Adicione screenshots se relevante

#### Template de PR

```markdown
## Descrição
[Descreva suas alterações]

## Tipo de Mudança
- [ ] Nova feature
- [ ] Correção de bug
- [ ] Refatoração
- [ ] Documentação

## Checklist
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
- [ ] Código segue o guia de estilo
- [ ] Self-review realizado

## Screenshots (se aplicável)

## Issues Relacionadas
Closes #[número]
```

### 6. Code Review

- Responda aos comentários de forma clara
- Faça as alterações solicitadas
- Mantenha a discussão focada e profissional

### 7. Merge

Após aprovação:
1. Rebase com a main se necessário
2. Squash commits se apropriado
3. Merge via GitHub

## 📝 Dicas Importantes

1. **Qualidade de Código**
   - Use ESLint e Prettier
   - Mantenha o código limpo e legível
   - Evite duplicação de código

2. **Performance**
   - Otimize imagens e assets
   - Use React Query para cache
   - Implemente lazy loading

3. **Segurança**
   - Valide inputs
   - Sanitize dados
   - Proteja rotas sensíveis

4. **Acessibilidade**
   - Use tags semânticas
   - Adicione atributos ARIA
   - Teste com leitores de tela

## ❓ Suporte

- Abra uma issue para dúvidas
- Use as discussions do GitHub
- Consulte a documentação

## 📋 Checklist Final

Antes de submeter sua contribuição:

- [ ] Código segue o guia de estilo
- [ ] Testes passando
- [ ] Documentação atualizada
- [ ] Branch atualizada com main
- [ ] Commits organizados
- [ ] PR bem documentado