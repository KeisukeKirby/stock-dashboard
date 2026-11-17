# Claude への作業ルール（このリポジトリ共通）

## Vercel のデプロイ（無料プランの上限対策・必ず守る）

このリポジトリには Vercel のプロジェクトが複数つながっています。Vercel の無料プランは **1 日 100 デプロイまで**で、上限に達すると丸 1 日公開できなくなります。指示されたプロジェクト以外はプッシュ・ビルドさせないでください。

| Vercel プロジェクト | フォルダ（Root Directory） | 本番ブランチ |
|---|---|---|
| stock-dashboard（在庫ダッシュボード） | リポジトリ直下（public / api / vercel.json） | claude/dashboard-table-github-vercel-uysu0a |
| kaizen-manual（業務改善マニュアル） | kaizen/ | main |
| thai-learning | thai-learning/ | main |
| ativo-plaza-popup-lp | malaysia-popup-lp/ | main |
| bd-dashboard | bd/ | claude/laughing-pascal-1qck8z |
| warehouse-sale-lp | warehouse-sale-lp/ | claude/warehouse-sale-lp |
| terminal21-rama3-lp | terminal21-rama3-lp/ | claude/youthful-ramanujan-135dzb |

1. **対象は 1 つだけ**: 依頼されたプロジェクトのフォルダだけを変更する。ほかのプロジェクトのフォルダは触らない。
2. **プッシュは最小限**: 修正はまとめてコミットし、プッシュは 1 回の依頼につき原則 1 回。公開に必要なブランチ（そのプロジェクトの本番ブランチ）以外へは、必要がない限りプッシュしない。
3. **ほかのプロジェクトの本番ブランチへマージ・プッシュしない**。main へマージするときは、対象プロジェクトのフォルダ以外の差分が入っていないことを確認する。
4. **手動デプロイ（Vercel API・CLI）は最後の手段**: 自動デプロイが動かなかったときだけ、対象プロジェクトに 1 回。同じコミットを何度もデプロイしない。デプロイの状態確認（一覧・詳細の取得）は回数に入らないので、確認はしてよい。
5. **Vercel 側の設定を戻さない**: 全プロジェクトで「プレビューデプロイ無効」と「Ignored Build Step（自分のフォルダに変更がなければビルドしない）」を設定済み。新しいプロジェクトを作るときも同じ設定にする。
   - Ignored Build Step: `git diff --quiet ${VERCEL_GIT_PREVIOUS_SHA:-HEAD^} HEAD -- .`（stock-dashboard だけは `-- public api vercel.json`）
6. 上限に達した（402 `api-deployments-free-per-day`）ときは、すぐユーザーに伝え、約 24 時間後に公開し直す。
