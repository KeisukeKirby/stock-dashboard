import { useAudio } from '@/hooks/useAudio'
import type { AudioItem } from '@/audio/AudioProvider'
import { cn } from '@/lib/cn'

export function AudioButton({
  item,
  size = 'md',
  className,
  label,
  rate,
  autoFocus,
}: {
  item: AudioItem | string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
  rate?: number
  autoFocus?: boolean
}) {
  const { speak, stop, speaking } = useAudio()
  const dim = size === 'sm' ? 'h-9 w-9 text-base' : size === 'lg' ? 'h-16 w-16 text-3xl' : 'h-11 w-11 text-xl'
  return (
    <button
      type="button"
      autoFocus={autoFocus}
      aria-label={label ?? '再生'}
      onClick={(e) => {
        e.stopPropagation()
        if (speaking) stop()
        else void speak(item, rate)
      }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow transition hover:bg-amber-300 active:scale-95',
        speaking && 'animate-pulse bg-amber-300',
        dim,
        className,
      )}
    >
      {speaking ? '■' : '▶'}
    </button>
  )
}
