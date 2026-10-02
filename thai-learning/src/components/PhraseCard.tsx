import type { Phrase } from '@/lib/types'
import { useSettings } from '@/hooks/useSettings'
import { phraseToItem } from '@/hooks/useAudio'
import { AudioButton } from './AudioButton'
import { SpeedToggle } from './SpeedToggle'
import { cn } from '@/lib/cn'
import { Pill } from './ui'

export function PhraseCard({
  phrase,
  hideJa = false,
  hideThai = false,
  showVariants = true,
  showNote = true,
  compact = false,
  className,
}: {
  phrase: Phrase
  hideJa?: boolean
  hideThai?: boolean
  showVariants?: boolean
  showNote?: boolean
  compact?: boolean
  className?: string
}) {
  const { settings } = useSettings()
  return (
    <div className={cn('rounded-2xl border border-slate-800 bg-slate-900/80 p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {!hideThai ? (
            <>
              <p lang="th" className={cn('font-thai leading-snug', compact ? 'text-2xl' : 'text-3xl')}>
                {phrase.thai}
              </p>
              <p className="mt-1 font-mono text-base text-amber-200/90">{phrase.roman}</p>
              {settings.showKana && phrase.kana && <p className="mt-0.5 text-sm text-slate-400">{phrase.kana}</p>}
            </>
          ) : (
            <p className="text-2xl text-slate-500">？？？</p>
          )}
          {!hideJa ? (
            <p className={cn('mt-2 text-slate-100', compact ? 'text-base' : 'text-lg')}>{phrase.ja}</p>
          ) : (
            <p className="mt-2 text-lg text-slate-500">（意味を思い出してから表示）</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <AudioButton item={phraseToItem(phrase)} />
          {!compact && <SpeedToggle />}
        </div>
      </div>

      {(phrase.needs_review || phrase.literal) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {phrase.literal && <Pill>直訳: {phrase.literal}</Pill>}
          {phrase.needs_review && <Pill className="bg-rose-900/60 text-rose-200">⚠ 要確認</Pill>}
        </div>
      )}

      {showVariants && phrase.variants && phrase.variants.length > 0 && (
        <div className="mt-3 grid gap-2 border-t border-slate-800 pt-3 sm:grid-cols-2">
          <VariantBox label={phrase.register === 'casual' ? 'カジュアル' : phrase.register === 'polite' ? '丁寧' : '基本'} thai={phrase.thai} roman={phrase.roman} />
          {phrase.variants.map((v) => (
            <VariantBox key={v.thai} label={v.register === 'polite' ? '丁寧' : 'カジュアル'} thai={v.thai} roman={v.roman} ja={v.ja} kana={settings.showKana ? v.kana : undefined} />
          ))}
        </div>
      )}

      {showNote && phrase.note && (
        <p className="mt-3 rounded-xl bg-slate-800/60 p-3 text-sm leading-relaxed text-slate-300">
          <span className="mr-1">💡</span>
          {phrase.note}
        </p>
      )}
    </div>
  )
}

function VariantBox({ label, thai, roman, ja, kana }: { label: string; thai: string; roman: string; ja?: string; kana?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-800/50 p-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
        <p lang="th" className="font-thai text-lg leading-tight">
          {thai}
        </p>
        <p className="font-mono text-xs text-amber-200/80">{roman}</p>
        {kana && <p className="text-xs text-slate-400">{kana}</p>}
        {ja && <p className="text-xs text-slate-300">{ja}</p>}
      </div>
      <AudioButton item={{ text: thai }} size="sm" />
    </div>
  )
}
