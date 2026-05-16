'use client'

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
      <h2 className="text-lg font-semibold text-[#0A0A0A]">Erro no painel de administração</h2>
      <p className="text-sm text-[#6B7280] max-w-sm">
        Não foi possível carregar esta secção.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-medium text-white bg-[#0096DC] rounded-lg hover:bg-[#0064B4] transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  )
}
