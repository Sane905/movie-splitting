TODO.md は、Codex（や自分）が迷わず実装を進めるための **作業手順書／タスク分解リスト**として使うで。

- 何をどの順番で作るか
- どこまでやれば MVP か
- どのファイルを触るか
- 先にやるべき“詰まりポイント”はどれか

を固定できるから、あなたの目的（判断コストを減らす）にも合う。

---

## TODO.md（MVP 実装のタスク分解）

### 0. 事前方針

- ローカル実行前提（動画を外部に送らない）
- フロント：Vite + React + Tailwind + shadcn/ui（router なし）
- バック：Fastify + TS、multipart はストリーム、ffmpeg は spawn
- API は fetch で呼ぶ（upload/download）

---

### 1. リポジトリ・モノレポ基盤

- [ ] `pnpm` workspaces をセットアップ
  - [ ] ルート `package.json` に `workspaces`（または `pnpm-workspace.yaml`）追加
  - [ ] ルートに `.gitignore`（`storage/`, `output/`, `node_modules/`, `dist/` 等）

- [ ] `apps/client` を Vite + React + TS で作成
- [ ] `apps/server` を Node + TS で作成（tsconfig、build、dev）
- [ ] ルート scripts 整備
  - [ ] `pnpm dev` で client/server を同時起動（turbo or concurrently）

**Done 条件**

- `pnpm dev` 一発で `localhost:5173`（client）と `localhost:8787`（server）が立つ

---

### 2. サーバー：Fastify 最小起動 + CORS + health

- [ ] `apps/server/src/main.ts` で Fastify 起動（port 8787）
- [ ] `GET /api/health` を追加して `"ok"` を返す
- [ ] CORS 設定（dev 時のみ `localhost:5173` を許可）

**Done 条件**

- ブラウザで `http://localhost:8787/api/health` が OK

---

### 3. サーバー：索引パース（parseIndex.ts）

- [ ] `apps/server/src/services/parseIndex.ts` を作成
- [ ] 入力：索引テキスト（複数行）
- [ ] 出力：`Segment[]`（`{ start, end, title?, daw?: boolean }`）
- [ ] 仕様
  - [ ] `[HH:MM:SS – HH:MM:SS]` と `[HH:MM:SS - HH:MM:SS]` を両対応
  - [ ] `DAW操作：Yes` が近接行にあれば `daw=true`
  - [ ] `mode=dawOnly` の場合 `daw=true` のみ返す

- [ ] 単体テスト（任意・最低 1 ケース） or 手動テスト用スクリプト追加

**Done 条件**

- 索引例を渡して、期待する区間数と start/end が取れる

---

### 4. サーバー：ファイル名サニタイズ（sanitizeFileName.ts）

- [ ] `apps/server/src/utils/sanitizeFileName.ts` 追加
- [ ] 禁止文字 `/\:*?"<>|` を `_` 置換
- [ ] 連続空白を 1 つに、前後 trim
- [ ] 長さ制限（例：120 文字）
- [ ] 命名規則：`NN_HHMMSS-HHMMSS_タイトル.mp4`（タイトルが無い場合も成立）

**Done 条件**

- どんなタイトルでも安全なファイル名になる

---

### 5. サーバー：ジョブ管理（jobs.ts）

- [ ] `apps/server/src/services/jobs.ts`（in-memory Map）
- [ ] Job state: `queued | processing | done | error`
- [ ] fields: `jobId, progress(0-100), message?, error?, createdAt`
- [ ] jobId 生成（UUID 等）

**Done 条件**

- jobId 作って状態更新できる

---

### 6. サーバー：upload API（multipart ストリーム保存）

- [ ] `@fastify/multipart` 導入
- [ ] `POST /api/upload`
  - [ ] fields：`video`（mp4）, `indexText`（string）, `mode`（optional）
  - [ ] `storage/<jobId>/original.mp4` にストリーム保存
  - [ ] indexText を保存（`storage/<jobId>/index.txt`）
  - [ ] パースした Segment を job に紐付けて保持
  - [ ] `{ jobId }` を返す

- [ ] アップロードサイズ制限（必要なら）を設定

**Done 条件**

- mp4 が `storage/<jobId>/original.mp4` に保存される

---

### 7. サーバー：ffmpeg 分割処理（ffmpeg.ts）

- [ ] `apps/server/src/services/ffmpeg.ts` 作成
- [ ] `splitVideo({ inputPath, segments, outDir })`
  - [ ] 逐次ループで各セグメントを `spawn` 実行
  - [ ] `-ss start -to end -i input -c copy out.mp4`
  - [ ] 進捗更新：`i / segments.length` で job.progress を更新

- [ ] 出力先：`output/<jobId>/clips/*.mp4`

**Done 条件**

- 指定区間で複数 mp4 が生成される（元動画は変更されない）

---

### 8. サーバー：download API（zip）

- [ ] `GET /api/download/:jobId`
- [ ] zip 生成方法
  - [ ] `archiver` で `output/<jobId>/clips/` を zip にして返す
  - [ ] `Content-Type: application/zip`
  - [ ] `Content-Disposition: attachment; filename="clips_<jobId>.zip"`

- [ ] zip をオンザフライで返す（可能ならファイル生成せず stream）

**Done 条件**

- ブラウザで zip が DL でき、中にクリップが入っている

---

### 9. サーバー：status API（最低限）

- [ ] `GET /api/status/:jobId`
- [ ] `{ state, progress, message, error }` を返す

**Done 条件**

- UI からポーリングして進捗が見える

---

### 10. フロント：UI 骨組み（shadcn/ui）

- [ ] Tailwind セットアップ
- [ ] shadcn/ui 初期化＆必要コンポーネント追加
  - [ ] Button / Card / Textarea / Progress / Alert(or toast)

- [ ] 1 画面構成
  - [ ] mp4 file input
  - [ ] 索引 textarea
  - [ ] mode（all / dawOnly）select or radio
  - [ ] 実行ボタン
  - [ ] 進捗表示
  - [ ] DL ボタン（完了時）

**Done 条件**

- 画面が整い、入力 → 実行 → 結果が見える導線がある

---

### 11. フロント：API 接続（fetch）

- [ ] `POST /api/upload`（FormData）
- [ ] jobId 保持（state）
- [ ] `GET /api/status/:jobId` を 1 秒間隔でポーリング
- [ ] 完了したら `GET /api/download/:jobId` へのリンク or ボタンで DL

**Done 条件**

- UI から一連の流れが動作（MVP 完成）

---

## MVP 完了条件（Definition of Done）

- [ ] mp4 + 索引テキストで分割し、zip を DL できる
- [ ] `mode=dawOnly` で DAW 操作区間のみ切り出せる
- [ ] 長尺でもメモリ落ちしない（ストリーム処理）
- [ ] 生成ファイル名が安全

---

## Phase 2（後回しで OK）

- [ ] SSE で進捗を push（ポーリング削減）
- [ ] `-c copy` のズレ検知＆該当区間だけ再エンコード
- [ ] クリップ一覧を UI で表示（個別 DL）
- [ ] 一時ファイル自動削除（TTL/cleanup）
- [ ] tRPC 導入（status 等の型安全強化）

---

必要ならこの TODO.md を、Codex が動きやすいように
「1 タスク＝ 1PR 単位」みたいにさらに細分化した版も作れるで。

# TODO.md (v2)

## Phase 0: Baseline

- [ ] TASK-00-1: 既存コードを AGENTS.md (v2) に合わせてリファクタできる状態にする
- [ ] TASK-00-2: 不要になった REST エンドポイントをコメントアウト or 削除
- [ ] TASK-00-3: Fastify + tRPC が共存する最小構成を確認

---

## Phase 1: S3互換ストレージ層（MinIO/R2）

- [ ] TASK-01-1: docker-compose で MinIO を起動できるようにする
- [ ] TASK-01-2: S3Client (AWS SDK v3) ラッパー `services/s3.ts` を作成
- [ ] TASK-01-3: バケット存在チェック & 初期化処理を追加
- [ ] TASK-01-4: presigned PUT/GET を生成する util を実装
- [ ] TASK-01-5: ローカルから MinIO に PUT/GET できることを検証

---

## Phase 2: tRPC 基盤

- [ ] TASK-02-1: Fastify に tRPC adapter を組み込む
- [ ] TASK-02-2: tRPC router の雛形を作成
- [ ] TASK-02-3: client 側に tRPC client を導入
- [ ] TASK-02-4: 型共有が動くことを確認

---

## Phase 3: Job フロー（Upload）

- [ ] TASK-03-1: `createJob` procedure を実装
- [ ] TASK-03-2: `getUploadUrl` procedure を実装（presigned PUT）
- [ ] TASK-03-3: フロントで R2/MinIO に直接 PUT する処理を実装
- [ ] TASK-03-4: `uploadComplete` procedure を実装
- [ ] TASK-03-5: オブジェクト存在検証（HEAD）を追加

---

## Phase 4: Index Parsing

- [ ] TASK-04-1: parseIndex の正規表現を堅牢化
- [ ] TASK-04-2: DAW操作 Yes/No の抽出ロジック追加
- [ ] TASK-04-3: sanitizeFileName の共通 util 化
- [ ] TASK-04-4: mode=all / dawOnly 切替に対応

---

## Phase 5: Processing Worker

- [ ] TASK-05-1: `startProcess` procedure を実装
- [ ] TASK-05-2: R2/MinIO からストリーム取得
- [ ] TASK-05-3: ffmpeg spawn ラッパー作成
- [ ] TASK-05-4: 逐次ループで分割処理
- [ ] TASK-05-5: 進捗を jobs store に反映

---

## Phase 6: ZIP 生成 & 配布

- [ ] TASK-06-1: archiver で zip 生成ロジック作成
- [ ] TASK-06-2: zip を R2/MinIO にアップロード
- [ ] TASK-06-3: `getDownloadUrl` procedure 実装
- [ ] TASK-06-4: presigned GET で DL 可能にする

---

## Phase 7: Status & Cleanup

- [ ] TASK-07-1: `getStatus` procedure 実装
- [ ] TASK-07-2: フロントでポーリング表示
- [ ] TASK-07-3: zip DL 後に R2 から削除する仕組み
- [ ] TASK-07-4: 古い job の定期クリーンアップ

---

## Phase 8: UX polish

- [ ] TASK-08-1: アップロード進捗表示
- [ ] TASK-08-2: エラー時の再試行導線
- [ ] TASK-08-3: 成功時の自動 DL

---

## Rule

- TODO.md は「未完了タスクのみ」を残す
- 完了したら削除 or DONE.md に移す
- Codex には「TASK-xx を実装して」と依頼する
