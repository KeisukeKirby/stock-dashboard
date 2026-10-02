import { useMemo, useState } from 'react'
import { phraseById } from '@/lib/content'
import { PhraseCard } from '../PhraseCard'
import { RecorderPanel } from '../RecorderPanel'
import { Button } from '../ui'
import { phraseToItem } from '@/hooks/useAudio'

/** Glossika 風シャドーイング：お手本 → 録音 → 聞き比べ */
export function ShadowRunner({ phraseIds, onDone }: { phraseIds: string[]; onDone: () => void }) {
  const [i, setI] = useState(0)
  const phrase = useMemo(() => phraseById.get(phraseIds[i] ?? ''), [phraseIds, i])
  if (!phrase) {
    onDone()
    return null
  }
  const last = i >= phraseIds.length - 1
  return (
    <div>
      <p className="mb-2 text-xs text-slate-400">
        シャドーイング {i + 1} / {phraseIds.length} — お手本の直後に、同じリズム・声調で重ねて言う
      </p>
      <PhraseCard phrase={phrase} showVariants={false} />
      <RecorderPanel thai={phrase.thai} item={phraseToItem(phrase)} className="mt-3" />
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" className="flex-1" disabled={i === 0} onClick={() => setI((n) => n - 1)}>
          ← 前
        </Button>
        <Button className="flex-1" onClick={() => (last ? onDone() : setI((n) => n + 1))}>
          {last ? '完了' : '次 →'}
        </Button>
      </div>
    </div>
  )
}
