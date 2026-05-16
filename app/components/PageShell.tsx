export function PageHeader() {
  return (
    <header className="border-b border-[#E5E7EB] px-6 py-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo_activobank.svg" alt="ActivoBank" width={137} height={22} />
    </header>
  )
}

export function PageFooter() {
  return (
    <footer className="border-t border-[#E5E7EB] px-6 py-4 text-center space-y-1">
      <p className="text-xs text-[#4B5563]">ActivoBank Lounge · {process.env.NEXT_PUBLIC_EVENT_LABEL ?? 'Mundial 2026'}</p>
      <a
        href="/privacidade"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-[#4B5563] underline hover:text-[#0096DC]"
      >
        Política de Privacidade
      </a>
    </footer>
  )
}
