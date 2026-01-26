# AGENTS.md

## Project: Video Slicer for DTM Lecture Index (Cloud-ready)

### Goal

ユーザーが作曲講座の **索引テキスト（タイムスタンプ付き）** と **動画ファイル** を投入すると、

1. 動画を **R2 (S3互換) に直接アップロード**
2. バックエンドが索引を解析
3. ffmpeg により **索引区間ごとに自動分割**
4. 生成クリップを **ZIP でまとめてダウンロード**

できるクラウド対応ツールを作る。

---

## Primary Use Case

- 長尺の講座動画を、NotebookLM 等で生成した「時間 × 内容」索引に基づいて分割
- 特に「DAW 操作」パートだけ抽出するなど、学習効率を最大化
- 大容量動画でも **API サーバーに保存しない構成**で安全に処理

---

## Stack & Architecture

### Frontend

- Vite + React (TypeScript)
- Tailwind CSS + shadcn/ui
- API: **tRPC client**
- 動画アップロード: **R2 presigned PUT URL に直接送信**

### Backend

- **Fastify + tRPC**
- ffmpeg: child_process.spawn
- 動画は **R2 / MinIO からストリーム読み込み**
- ZIP は archiver で生成し、R2 に保存 or ストリーミング返却

### Storage

- 本番: **Cloudflare R2**
- ローカル: **MinIO (S3互換 Docker)**

---

## Monorepo Tooling

- pnpm workspaces
- Turbo / concurrently で並列起動

---

## Suggested Repository Layout

movie-splitting/
apps/
client/
server/
src/
trpc/
router.ts
procedures/
createJob.ts
getUploadUrl.ts
startProcess.ts
getStatus.ts
getDownloadUrl.ts
services/
parseIndex.ts
ffmpeg.ts
jobs.ts
zip.ts
s3.ts

---

## Core Features & Requirements

### 1) Index Text Parsing

入力例：

- `■ [00:22:12 – 00:29:29] ... DAW操作：Yes ...`

Parsing:

```ts
type Segment = {
  start: string;
  end: string;
  title?: string;
  daw?: boolean;
  type?: string;
};
```

mode = "all" | "dawOnly" をサポート

sanitize + 安全なファイル名に変換

2. Video Upload (R2 Direct)
   Flow

tRPC: createJob() → jobId

tRPC: getUploadUrl(jobId)

Browser → R2: PUT (presigned URL)

tRPC: uploadComplete(jobId)

tRPC: startProcess(jobId)

動画は API サーバーを通らない。

3. ffmpeg Splitting
   ffmpeg -ss START -to END -i input.mp4 -c copy output.mp4

R2 からストリーム読み込み

出力は一時ローカル or 直接 R2

4. ZIP Download

クリップを zip にまとめる

R2 に保存し presigned GET で返す

5. Job Model

```ts
type Job = {
  id: string;
  state: "queued" | "processing" | "done" | "error";
  progress: number;
  message?: string;
  segments: Segment[];
};
```

tRPC Procedures

| name           | purpose        |
| -------------- | -------------- |
| createJob      | jobId 発行     |
| getUploadUrl   | presigned PUT  |
| uploadComplete | R2保存完了通知 |
| startProcess   | ffmpeg開始     |
| getStatus      | 進捗取得       |
| getDownloadUrl | presigned GET  |

Operational Constraints

動画は API サーバーに保存しない

ストリーミングのみ

presigned URL は短時間

zip 完了後は一定時間後に R2 から削除

Definition of Done

UI → R2 → 分割 → zip → DL が一連で動く

サーバーディスクが増えない

同時処理でも落ちない
