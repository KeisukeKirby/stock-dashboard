import type { Item } from '@/lib/types'
import { useSettings } from '@/hooks/useSettings'
import { itemToAudio, textToAudio } from '@/hooks/useAudio'
import { sceneById } from '@/lib/content'
import { AudioButton } from './AudioButton'
import { SpeedToggle } from './SpeedToggle'
import { PrepositionFigure } from './PrepositionFigure'
import { cn } from '@/lib/cn'
import { Pill } from './ui'

/**
 * アイテム表示（フレーズ／単語／前置詞／語源）。
 * hideJa: 日本語を隠す（音と英語で意味を思い出す）。設定の hideJa でも隠せる（タップで表示）。
 */
export function ItemCard({
  item,
  hideJa = false,
  hideEn = false,
  showNote = true,
  compact = false,
  className,
  revealJa,
  onRevealJa,
}: {
  item: Item
  hideJa?: boolean
  hideEn?: boolean
  showNote?: boolean
  compact?: boolean
  className?: string
  revealJa?: boolean
  onRevealJa?: () => void
}) {
  const { settings } = useSettings()
  const scene = sceneById.get(item.scene)
  const isWord = scene?.kind === 'word' || scene?.kind === 'root'
  const isPrep = scene?.kind === 'preposition'
  const jaHidden = hideJa || (settings.hideJa && !revealJa)
  return (
    <div className={cn('rounded-2xl border border-slate-800 bg-slate-900/80 p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isPrep && (
            <div className="mb-2 flex items-center gap-3">
              <PrepositionFigure kind={item.image ?? item.en} />
              <div>
                <p className={cn('font-en font-bold', compact ? 'text-3xl' : 'text-4xl')}>{item.en}</p>
                {item.ipa && <p className="font-ipa text-base text-amber-200/90">{item.ipa}</p>}
              </div>
            </div>
          )}
          {!isPrep &&
            (!hideEn ? (
              <>
                <p lang="en" className={cn('font-en font-semibold leading-snug', isWord ? (compact ? 'text-2xl' : 'text-3xl') : compact ? 'text-xl' : 'text-2xl')}>
                  {item.en}
                  {item.pos && <span className="ml-2 align-middle font-sans text-xs font-normal text-slate-400">{item.pos}</span>}
                </p>
                {item.ipa && <p className="mt-1 font-ipa text-base text-amber-200/90">{item.ipa}</p>}
              </>
            ) : (
              <p className="text-2xl text-slate-500">？？？</p>
            ))}
          {item.parts && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.parts.prefix && <Pill className="bg-sky-900/60 text-sky-200">接頭辞 {item.parts.prefix}</Pill>}
              {item.parts.root && <Pill className="bg-emerald-900/60 text-emerald-200">語幹 {item.parts.root}</Pill>}
              {item.parts.suffix && <Pill className="bg-fuchsia-900/60 text-fuchsia-200">接尾辞 {item.parts.suffix}</Pill>}
              <Pill className="font-en">= {item.parts.meaning}</Pill>
            </div>
          )}
          {!jaHidden ? (
            <p className={cn('mt-2 text-slate-100', compact ? 'text-sm' : 'text-base', isPrep && 'text-slate-400')}>{item.ja}</p>
          ) : (
            <button type="button" className="mt-2 text-left text-sm text-slate-500 underline-offset-2 hover:underline" onClick={onRevealJa}>
              （意味を思い出してからタップ）
            </button>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <AudioButton item={itemToAudio(item)} />
          {!compact && <SpeedToggle />}
        </div>
      </div>

      {item.example && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-800/50 p-2.5">
          <AudioButton item={textToAudio(item.example)} size="sm" className="bg-slate-700 text-slate-100 hover:bg-slate-600" />
          <div className="min-w-0 flex-1">
            <p lang="en" className="font-en text-base leading-snug">
              {item.example}
            </p>
            {item.exampleJa && !jaHidden && <p className="text-xs text-slate-400">{item.exampleJa}</p>}
          </div>
        </div>
      )}

      {showNote && item.note && (
        <p className="mt-3 rounded-xl bg-slate-800/60 p-3 text-sm leading-relaxed text-slate-300">
          <span className="mr-1">💡</span>
          {item.note}
        </p>
      )}
    </div>
  )
}
