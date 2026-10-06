import type { Grade } from '@/lib/types'
import { Button } from './ui'

export function GradeButtons({ onGrade, disabled, labels }: { onGrade: (g: Grade) => void; disabled?: boolean; labels?: [string, string, string] }) {
  const [a, b, c] = labels ?? ['言えない', 'あやしい', '言えた']
  return (
    <div className="grid grid-cols-3 gap-2">
      <Button variant="danger" size="lg" disabled={disabled} onClick={() => onGrade(1)}>
        {a}
      </Button>
      <Button variant="warn" size="lg" disabled={disabled} onClick={() => onGrade(2)}>
        {b}
      </Button>
      <Button variant="success" size="lg" disabled={disabled} onClick={() => onGrade(3)}>
        {c}
      </Button>
    </div>
  )
}
