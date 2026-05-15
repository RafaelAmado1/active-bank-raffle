# Design: Página de Privacidade + Alterações /entry

Date: 2026-05-06

## Scope

1. Nova página `/privacidade` com conteúdo legal RGPD
2. Alterações ao `/entry`: remover parágrafo RGPD inline, adicionar link no footer, remover qualquer checkbox de consentimento

## 1. Nova página `/privacidade`

**Ficheiro:** `app/privacidade/page.tsx`

- Server component (sem `'use client'`)
- Reutiliza `Header` e `Footer` do `/entry` (extrair para componentes partilhados ou duplicar inline)
- Estilos consistentes com o resto do projeto (Tailwind, mesmas cores)

### Estrutura da página

```
Header (logo ActivoBank)
main
  h1: "Proteção de Dados"
  intro: breve parágrafo de contexto
  secções h2 + prosa:
    1. Responsável pelo Tratamento
    2. Dados Recolhidos
    3. Finalidade do Tratamento
    4. Base Legal
    5. Prazo de Conservação
    6. Direitos do Titular
    7. Contacto
Footer
```

### Conteúdo das secções

**Responsável pelo Tratamento:** ActivoBank, S.A. (sem email de contacto por agora - placeholder `[contacto@activobank.pt]` a substituir)

**Dados Recolhidos:** nome completo, número de telemóvel, endereço de email

**Finalidade:** participação em sorteios realizados na Fan Zone ActivoBank durante o Mundial 2026; contacto do vencedor em caso de prémio

**Base Legal:** consentimento do titular (art. 6.º, n.º 1, al. a) do RGPD), prestado no momento do registo

**Prazo de Conservação:** 90 dias após o término do evento; findo esse prazo os dados são eliminados

**Direitos do Titular:** acesso, retificação, apagamento, limitação do tratamento, portabilidade, oposição - exercício mediante contacto com o responsável

**Contacto:** placeholder `[a preencher]`

## 2. Alterações ao `/entry`

### Remover
- Parágrafo `"Os dados serão usados apenas para contacto em caso de prémio. Tratamento conforme RGPD."` (linha 92-94)
- Qualquer checkbox de consentimento (não existe atualmente, confirmar que não é adicionado)

### Adicionar
- No `Footer`: link "Política de Privacidade" → `/privacidade`, `target="_blank"`, `rel="noopener noreferrer"`
- Texto abaixo do link de submit: frase curta informando que ao submeter o utilizador consente com o tratamento de dados

### Footer atualizado (estrutura)
```
ActivoBank · Fan Zone Mundial 2026
[link] Política de Privacidade
```

## Decisões

- Sem checkbox: consentimento dado pelo ato de submissão, explicitado em texto antes do botão
- Sem modal: `/privacidade` tem URL próprio, facilita referenciação legal
- Email de contacto: placeholder a substituir antes de produção
- Header/Footer: duplicados inline na página `/privacidade` (evitar over-engineering para componente partilhado num projeto pequeno)
