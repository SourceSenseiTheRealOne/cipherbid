export function SecondPriceIllustration() {
  return (
    <section
      aria-labelledby="clearing-chart-title"
      className="cipherbid-panel rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7 lg:col-span-7 lg:col-start-1"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6654d9]">Clearing mechanism</p>
          <h2 id="clearing-chart-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
            Second-price clearing, illustrated
          </h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#aeb5c2]">
          Illustration — not chain data
        </span>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-[#0b0c0e] p-3 sm:p-5">
        <svg
          role="img"
          aria-label="Illustrative second-price clearing chart"
          viewBox="0 0 680 280"
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <title>Illustrative second-price clearing chart</title>
          <desc>
            A diagram of sealed bids ranked from high to low. The highest valid bid wins while the dashed line marks the
            second-price clearing level.
          </desc>
          <defs>
            <linearGradient id="cipherbid-winning-bid" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ad9cff" />
              <stop offset="100%" stopColor="#6654d9" />
            </linearGradient>
            <linearGradient id="cipherbid-other-bids" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#8491a4" />
              <stop offset="100%" stopColor="#4a5262" />
            </linearGradient>
          </defs>

          <g stroke="rgba(255,255,255,0.14)" strokeWidth="1">
            <line x1="74" x2="640" y1="52" y2="52" />
            <line x1="74" x2="640" y1="112" y2="112" />
            <line x1="74" x2="640" y1="172" y2="172" />
            <line x1="74" x2="640" y1="232" y2="232" />
          </g>
          <g fill="#a9b2c0" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="12">
            <text x="14" y="56">
              higher
            </text>
            <text x="14" y="236">
              lower
            </text>
            <text x="74" y="264">
              sealed bids ranked high → low
            </text>
          </g>

          <line x1="74" x2="640" y1="132" y2="132" stroke="#8de0bb" strokeDasharray="6 6" strokeWidth="2" />
          <rect x="492" y="110" width="122" height="30" rx="15" fill="#204d3d" />
          <text
            x="553"
            y="130"
            fill="#dff5ea"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontSize="11"
            textAnchor="middle"
          >
            second price
          </text>

          <rect x="104" y="68" width="54" height="164" rx="8" fill="url(#cipherbid-winning-bid)" />
          <rect x="178" y="94" width="54" height="138" rx="8" fill="url(#cipherbid-other-bids)" />
          <rect x="252" y="119" width="54" height="113" rx="8" fill="url(#cipherbid-other-bids)" />
          <rect x="326" y="147" width="54" height="85" rx="8" fill="url(#cipherbid-other-bids)" opacity="0.9" />
          <rect x="400" y="172" width="54" height="60" rx="8" fill="url(#cipherbid-other-bids)" opacity="0.72" />
          <rect x="474" y="194" width="54" height="38" rx="8" fill="url(#cipherbid-other-bids)" opacity="0.55" />
          <rect x="548" y="211" width="54" height="21" rx="8" fill="url(#cipherbid-other-bids)" opacity="0.38" />

          <text
            x="131"
            y="88"
            fill="#211a44"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontSize="11"
            fontWeight="700"
            textAnchor="middle"
          >
            WIN
          </text>
        </svg>
      </div>

      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
        <div className="flex items-center gap-2 text-black/70">
          <span className="h-3 w-3 rounded-sm bg-[#7c68e2]" aria-hidden="true" />
          <span>Winning bid</span>
        </div>
        <div className="flex items-center gap-2 text-black/70">
          <span className="h-px w-4 border-t-2 border-dashed border-[#23845f]" aria-hidden="true" />
          <span>Second price</span>
        </div>
        <div className="flex items-center gap-2 text-black/70">
          <span className="h-3 w-3 rounded-sm bg-[#697587]" aria-hidden="true" />
          <span>Other sealed bids</span>
        </div>
      </div>
      <p className="mt-5 max-w-2xl text-sm leading-6 text-black/70">
        The diagram explains the mechanism only. At close, the highest valid commitment wins; the price comes from the
        second-highest valid bid or the reserve.
      </p>
    </section>
  )
}
