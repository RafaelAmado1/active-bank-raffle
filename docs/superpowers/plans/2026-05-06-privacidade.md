# Privacidade RGPD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar página `/privacidade` com conteúdo legal RGPD e actualizar `/entry` para remover parágrafo RGPD inline e adicionar link no footer.

**Architecture:** Página estática server component em `app/privacidade/page.tsx`. Header e Footer duplicados inline (sem extracção de componente partilhado). Alterações mínimas ao `app/entry/page.tsx`.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS, TypeScript

---

## File Map

| Ficheiro | Acção |
|---|---|
| `app/privacidade/page.tsx` | Criar — página estática RGPD |
| `app/entry/page.tsx` | Modificar — remover parágrafo RGPD, actualizar Footer com link |

---

### Task 1: Criar `app/privacidade/page.tsx`

**Files:**
- Create: `app/privacidade/page.tsx`

- [ ] **Step 1: Criar o ficheiro com a página completa**

```tsx
import Link from 'next/link'

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
        <h1 className="text-3xl font-semibold tracking-tight text-[#0A0A0A] mb-2">
          Proteção de Dados
        </h1>
        <p className="text-sm text-[#6B7280] mb-10 leading-relaxed">
          Informação sobre o tratamento de dados pessoais recolhidos no âmbito da Fan Zone ActivoBank, realizada durante o Mundial 2026.
        </p>

        <section className="mb-8">
          <h2 className="text-base font-semibold text-[#0A0A0A] mb-2">1. Responsável pelo Tratamento</h2>
          <p className="text-sm text-[#374151] leading-relaxed">
            ActivoBank, S.A., com sede em Portugal. Para questões relativas ao tratamento dos seus dados pessoais, contacte-nos através dos meios disponibilizados no nosso website oficial.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold text-[#0A0A0A] mb-2">2. Dados Recolhidos</h2>
          <p className="text-sm text-[#374151] leading-relaxed">
            No âmbito do registo na Fan Zone, são recolhidos os seguintes dados pessoais:
          </p>
          <ul className="mt-2 text-sm text-[#374151] leading-relaxed list-disc list-inside space-y-1">
            <li>Nome completo</li>
            <li>Número de telemóvel</li>
            <li>Endereço de email</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold text-[#0A0A0A] mb-2">3. Finalidade do Tratamento</h2>
          <p className="text-sm text-[#374151] leading-relaxed">
            Os dados são tratados exclusivamente para efeitos de participação nos sorteios realizados na Fan Zone ActivoBank durante o Mundial 2026, e para contacto do titular em caso de atribuição de prémio.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold text-[#0A0A0A] mb-2">4. Base Legal</h2>
          <p className="text-sm text-[#374151] leading-relaxed">
            O tratamento baseia-se no consentimento do titular, nos termos do artigo 6.º, n.º 1, alínea a) do Regulamento (UE) 2016/679 (RGPD), prestado no momento do registo.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold text-[#0A0A0A] mb-2">5. Prazo de Conservação</h2>
          <p className="text-sm text-[#374151] leading-relaxed">
            Os dados pessoais são conservados pelo período de 90 dias após o término do evento. Findo esse prazo, os dados são eliminados de forma definitiva.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold text-[#0A0A0A] mb-2">6. Direitos do Titular</h2>
          <p className="text-sm text-[#374151] leading-relaxed">
            O titular dos dados tem direito a, a qualquer momento, solicitar:
          </p>
          <ul className="mt-2 text-sm text-[#374151] leading-relaxed list-disc list-inside space-y-1">
            <li>Acesso aos dados pessoais que lhe dizem respeito</li>
            <li>Rectificação de dados inexactos ou incompletos</li>
            <li>Apagamento dos dados («direito a ser esquecido»)</li>
            <li>Limitação do tratamento</li>
            <li>Portabilidade dos dados</li>
            <li>Oposição ao tratamento</li>
          </ul>
          <p className="mt-3 text-sm text-[#374151] leading-relaxed">
            O titular pode ainda apresentar reclamação à autoridade de controlo competente (CNPD — Comissão Nacional de Proteção de Dados, <span className="font-medium">www.cnpd.pt</span>).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold text-[#0A0A0A] mb-2">7. Contacto</h2>
          <p className="text-sm text-[#374151] leading-relaxed">
            Para exercer os seus direitos ou obter esclarecimentos sobre o tratamento dos seus dados, contacte o responsável pelo tratamento através dos meios indicados no website oficial da ActivoBank.
          </p>
        </section>

        <div className="pt-4 border-t border-[#E5E7EB]">
          <Link href="/entry" className="text-sm text-[#0096DC] hover:underline">
            ← Voltar ao registo
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header className="border-b border-[#E5E7EB] px-6 py-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo_activobank.svg" alt="ActivoBank" width={137} height={22} />
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-[#E5E7EB] px-6 py-4 text-center">
      <p className="text-xs text-[#6B7280]">ActivoBank · Fan Zone Mundial 2026</p>
    </footer>
  )
}
```

- [ ] **Step 2: Verificar que a página carrega**

Iniciar servidor: `npm run dev`
Navegar para `http://localhost:3000/privacidade`
Verificar: título "Proteção de Dados" visível, 7 secções presentes, logo no header, footer correcto.

- [ ] **Step 3: Commit**

```bash
git add app/privacidade/page.tsx
git commit -m "feat: add /privacidade RGPD page"
```

---

### Task 2: Actualizar `app/entry/page.tsx`

**Files:**
- Modify: `app/entry/page.tsx`

**Alterações necessárias:**
1. Remover parágrafo RGPD inline (linhas 92-94)
2. Adicionar texto de consentimento antes do botão de submit
3. Actualizar `Footer` para incluir link "Política de Privacidade"

- [ ] **Step 1: Remover parágrafo RGPD e adicionar texto de consentimento antes do botão**

Localizar no JSX do form (após o campo de email e antes do `</form>`):

Substituir o bloco do botão:
```tsx
            <button type="submit" disabled={state === 'loading'}
              className="mt-2 bg-[#0096DC] hover:bg-[#0064B4] text-white font-semibold text-base py-3.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {state === 'loading' ? 'A registar…' : 'Entrar no Lounge'}
            </button>
```

Por:
```tsx
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Ao registares-te, consentes com o tratamento dos teus dados pessoais para participação nos sorteios, nos termos da nossa{' '}
              <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#0096DC]">
                Política de Privacidade
              </a>
              .
            </p>
            <button type="submit" disabled={state === 'loading'}
              className="mt-2 bg-[#0096DC] hover:bg-[#0064B4] text-white font-semibold text-base py-3.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {state === 'loading' ? 'A registar…' : 'Entrar no Lounge'}
            </button>
```

- [ ] **Step 2: Remover parágrafo RGPD inline abaixo do form**

Remover completamente as linhas:
```tsx
          <p className="text-xs text-[#6B7280] mt-6 leading-relaxed">
            Os dados serão usados apenas para contacto em caso de prémio. Tratamento conforme RGPD.
          </p>
```

- [ ] **Step 3: Actualizar a função Footer para incluir link de privacidade**

Substituir a função `Footer` actual:
```tsx
function Footer() {
  return (
    <footer className="border-t border-[#E5E7EB] px-6 py-4 text-center">
      <p className="text-xs text-[#6B7280]">ActivoBank · Fan Zone Mundial 2026</p>
    </footer>
  )
}
```

Por:
```tsx
function Footer() {
  return (
    <footer className="border-t border-[#E5E7EB] px-6 py-4 text-center space-y-1">
      <p className="text-xs text-[#6B7280]">ActivoBank · Fan Zone Mundial 2026</p>
      <a
        href="/privacidade"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-[#6B7280] underline hover:text-[#0096DC]"
      >
        Política de Privacidade
      </a>
    </footer>
  )
}
```

- [ ] **Step 4: Verificar /entry**

Navegar para `http://localhost:3000/entry`
Verificar:
- Parágrafo antigo RGPD removido (não aparece abaixo do form)
- Texto de consentimento aparece antes do botão com link para `/privacidade`
- Footer tem link "Política de Privacidade" que abre `/privacidade` em nova tab
- Form submete normalmente (testar com dados válidos)

- [ ] **Step 5: Commit**

```bash
git add app/entry/page.tsx
git commit -m "feat: update /entry with privacy consent text and footer link"
```
