import type { Grade } from '@/lib/types'
import { Button } from './ui'

export function GradeButtons({ onGrade, disabled }: { onGrade: (g: Grade) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Button variant="danger" size="lg" disabled={disabled} onClick={() => onGrade(1)}>
        言えない
      </Button>
      <Button variant="warn" size="lg" disabled={disabled} onClick={() => onGrade(2)}>
        あやしい
      </Button>
      <Button variant="success" size="lg" disabled={disabled} onClick={() => onGrade(3)}>
        言えた
      </Button>
    </div>
  )
}
