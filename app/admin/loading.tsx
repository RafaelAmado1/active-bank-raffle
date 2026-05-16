export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F7F8FA]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#0096DC] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#4B5563]">A carregar...</p>
      </div>
    </div>
  )
}
