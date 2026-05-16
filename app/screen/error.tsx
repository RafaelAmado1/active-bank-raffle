'use client'

import { useEffect } from 'react'

export default function ScreenError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] gap-4 text-center px-4">
      <h2 className="text-lg font-semibold text-white">Erro no ecrã de sorteio</h2>
      <p className="text-sm text-[#6B7280] max-w-sm">
        Recarrega a página para continuar.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-medium text-white bg-[#0096DC] rounded-lg hover:bg-[#0064B4] transition-colors"
      >
        Recarregar
      </button>
    </div>
  )
}
