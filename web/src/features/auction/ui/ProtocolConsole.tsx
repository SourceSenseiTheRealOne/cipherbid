const protocolRows = [
  ['Auction mode', 'Sealed Vickrey'],
  ['Collateral model', 'Uniform cap collateral'],
  ['Settlement rule', 'Second-price settlement'],
  ['Protocol state', 'Contract deployment pending'],
] as const

export function ProtocolConsole() {
  return (
    <section
      aria-labelledby="protocol-console-title"
      data-testid="protocol-console"
      className="cipherbid-protocol-console min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6 lg:col-span-7 lg:col-start-1"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#a8b1ff]">
            Protocol console
          </p>
          <h2 id="protocol-console-title" className="mt-2 text-xl font-medium tracking-[-0.035em] text-[#f7f8f8]">
            Protocol state
          </h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#aeb5c2]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#7170ff]" aria-hidden="true" />
          Design preview
        </span>
      </div>

      <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {protocolRows.map(([label, value]) => (
          <div key={label} className="min-w-0 border-l border-white/10 pl-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#858b98]">{label}</dt>
            <dd className="mt-1.5 text-sm font-medium text-[#dbe0e8]">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 border-t border-white/10 pt-4 text-sm leading-6 text-[#9ba3af]">
        This panel describes the intended mechanism only. It does not represent deployed contract or auction state.
      </p>
    </section>
  )
}
