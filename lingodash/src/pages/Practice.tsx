import { Link } from 'react-router-dom'
import { Card, PageTitle, Pill } from '@/components/ui'

const items = [
  { to: '/pronunciation', icon: '🔤', title: '発音トレーナー', desc: '発音記号・フォニックス・最小対・録音', mode: 'IN' },
  { to: '/vocab', icon: '💬', title: '語彙・フレーズ', desc: 'テーマ別に学ぶ。前置詞は図で、語源は部品で', mode: 'IN' },
  { to: '/grammar', icon: '📐', title: '文法', desc: '12 ユニット。例文を声に出す → クイズ', mode: 'IN' },
  { to: '/listening', icon: '🎧', title: 'リスニング', desc: 'クイズ・ディクテーション・500 回シャドーイング', mode: 'IN' },
  { to: '/speaking', icon: '🗣️', title: 'スピーキング', desc: '自分について語るストック・反射ドリル・ロールプレイ', mode: 'OUT' },
  { to: '/writing', icon: '✍️', title: 'ライティング', desc: 'クイックライティングと記録', mode: 'OUT' },
  { to: '/quick', icon: '⏱', title: 'スキマ復習', desc: '5 分だけ SRS 復習', mode: 'IN' },
  { to: '/level-check', icon: '📊', title: 'レベルチェック', desc: '現在地を測る（再受験可）', mode: '' },
]

export default function Practice() {
  return (
    <div>
      <PageTitle title="練習" subtitle="今日のメニュー以外に、好きなスキルを集中的に" />
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <Link key={it.to} to={it.to}>
            <Card className="h-full transition hover:border-amber-500/50">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{it.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {it.title}
                    {it.mode && <Pill className={`ml-2 ${it.mode === 'IN' ? 'bg-blue-900/60 text-blue-200' : 'bg-amber-900/60 text-amber-200'}`}>{it.mode}</Pill>}
                  </p>
                  <p className="text-xs text-slate-400">{it.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
