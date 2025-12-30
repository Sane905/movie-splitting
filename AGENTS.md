---

# AGENTS.md

## Project: Video Slicer for DTM Lecture Index

### Goal

ユーザーが作曲講座の **索引テキスト（タイムスタンプ付き）** と **動画 MP4** を UI から投入すると、バックエンドで **ffmpeg により索引区間ごとに自動分割**し、生成されたクリップを **ZIP でまとめてダウンロード**できるツールを作る。

### Primary Use Case

- 長尺の講座動画を、NotebookLM 等で生成した「時間 × 内容」索引に基づいて分割。
- 特に「DAW 操作解説」パートにすぐ飛べるよう、区間ごとにクリップ化して再利用しやすくする。
- ユーザーは Mac を想定。動画は大きいので **ローカル実行**（動画を外部に送らない）を基本方針とする。

---

## Stack & Architecture

### Frontend

- Vite + React (TypeScript)
- Tailwind CSS + shadcn/ui
- router は不要（1 画面 + 状態遷移で十分）
- API 呼び出しは `fetch` を基本（multipart upload, zip download）

### Backend

- Fastify (TypeScript)
- ffmpeg を child_process.spawn で実行（`exec`は避ける）
- 大容量ファイル対応のため、**multipart は必ずストリームでディスク保存**（メモリに載せない）
- ZIP 生成はストリーミング（archiver 等）で返せる設計を優先

### Optional (Phase 2)

- 状態取得や進捗は jobId を返し、ポーリング/SSE で表示可能
- tRPC は必須ではない（アップロード/ダウンロードは Fastify REST の方が素直）。必要なら status 系のみ導入。

---

## Monorepo Tooling

- 推奨: pnpm workspaces（必要なら Turborepo でタスク統合）
- 重要: “大掛かりにしない”。まずは pnpm workspaces + 同時起動（turbo or concurrently）で十分。

---

## Suggested Repository Layout

```
video-slicer/
  package.json
  pnpm-workspace.yaml
  apps/
    client/
      src/
      index.html
      vite.config.ts
      tailwind.config.ts
    server/
      src/
        main.ts
        routes/
          upload.ts
          download.ts
          status.ts        # optional
        services/
          parseIndex.ts
          ffmpeg.ts
          jobs.ts
          zip.ts
        utils/
          sanitizeFileName.ts
  storage/                # gitignored: uploaded videos / temp
  output/                 # gitignored: generated clips / zip
```

### Notes

- `storage/` と `output/` は **.gitignore** 対象。
- 生成物は jobId ごとにサブフォルダ作成（例: `output/<jobId>/clips/...`）

---

## Core Features & Requirements

### 1) Index Text Parsing

索引テキストは、以下のような形式を含む（例）：

- `■ [00:22:12 – 00:29:29] ... DAW操作：Yes ...`
- 時刻表記は `HH:MM:SS`（`01:04:25`など）を基本
- 区切り記号は `–`（en dash）や `-` が混在する可能性あり
- 追加情報（内容、種類、DAW 操作:Yes/No など）が同一行または近接行に存在する

#### Parsing Rules

- 全区間を抽出して `[{ start, end, title?, daw?: boolean, type? }]` の配列にする
- `DAW操作：Yes` が含まれる区間のみ切り出すモード `mode=dawOnly` をサポート
- タイトルが長すぎる/不正文字がある場合は安全なファイル名に変換する（sanitize）
- 1 区間=1 クリップ（必ず改行など UI 整形が崩れてもパースできる頑健さを重視）

### 2) Video Upload (MP4)

- UI から mp4 をアップロード
- バックエンドは `@fastify/multipart` を使い、動画をストリームで `storage/<jobId>/original.mp4` に保存
- アップロード後、jobId を返す

### 3) ffmpeg Splitting

- 基本コマンドは高速＆劣化なしの **stream copy**：

  - `ffmpeg -ss START -to END -i input.mp4 -c copy output.mp4`

- 注意：キーフレームの都合で数フレームずれる場合がある

  - 初期リリースは `-c copy` で OK
  - 将来的には「ズレた区間だけ再エンコード」オプションを追加可能（Phase 2）

### 4) Download as ZIP

- 生成されたクリップを `clips.zip` にまとめてダウンロード
- 大容量対応のため、可能なら zip を **ストリーミング生成**して返す（archiver 推奨）
- ダウンロードエンドポイントはブラウザが扱いやすい `GET` で実装

### 5) Job Model (Minimal)

最低限のジョブ状態：

- `queued` → `processing` → `done` / `error`
- `progress`（0-100）や `currentClip`（任意）を持てる設計

保存場所：

- 最初は in-memory で OK（ローカルツール前提）
- 進捗表示をやる場合は job store を導入（簡単な Map で十分）

---

## API Design (Fastify)

### POST `/api/upload`

- Request: `multipart/form-data`

  - `video`: File (mp4)
  - `indexText`: string
  - `mode`: `"all" | "dawOnly"` (optional)

- Response JSON:

  - `{ jobId: string }`

Behavior:

- 受信した動画を `storage/<jobId>/original.mp4` に保存
- indexText をパースしてセグメント配列を作成
- バックグラウンドで分割開始（同期でも良いが長尺だと UI が固まるため非同期推奨）
- jobId を返す

### GET `/api/status/:jobId` (optional)

- Response JSON:

  - `{ state, progress, message?, clipsCount?, error? }`

### GET `/api/download/:jobId`

- Response: `application/zip`
- `clips.zip` を返す（生成済み or オンザフライ）

---

## Frontend UX (Minimal)

Single-page flow:

1. mp4 選択
2. 索引テキスト貼り付け
3. mode 選択（all / dawOnly）
4. 「分割開始」押下
5. 進捗表示（status ポーリング or シンプルに待機表示）
6. 完了後「ZIP ダウンロード」ボタン表示

UI Components:

- Card / Button / Textarea / Progress / Alert / Toast (shadcn/ui)

---

## Non-Goals (for initial release)

- クラウドデプロイ（まずローカル完結）
- ユーザー認証
- 動画解析（音声認識や自動チャプター生成）
- 高度な編集（クロスフェード等）
- 100%フレーム精度保証（初期は-c copy 優先）

---

## Operational Constraints & Safety

- 動画ファイルは巨大になり得るため、**必ずストリーミングで取り扱う**
- メモリに動画全体を載せない（base64 禁止）
- 生成ファイル名は OS 禁止文字を除去し、長さも制限する（例: 120 chars 以内）
- 同名ファイル衝突を避けるため、`NN_HHMMSS-HHMMSS_タイトル` の命名規則を採用
- 一時ファイルの掃除（job 削除/一定時間後削除）は Phase 2 で追加可能

---

## Implementation Notes / Best Practices

- ffmpeg 呼び出しは `spawn`（stdout/stderr はログ用に取り、必要なら進捗解析）
- 並列分割は CPU/IO を食うので、初期は逐次（for-loop）で OK
- Vite dev server から `/api` を proxy して開発体験を簡単にする

---

## Definition of Done (MVP)

- UI から mp4 + indexText を投入し、`mode=all` で全区間のクリップを zip で取得できる
- `mode=dawOnly` で DAW 操作の区間のみ切り出して zip で取得できる
- 長尺（1〜2 時間）動画でメモリが落ちない（ストリーミング処理）
- 生成結果が `clips/` のようにまとまって保存され、zip がダウンロードできる

---

## Example Index Snippet (Supported)

- `■ [00:22:12 – 00:29:29] ... DAW操作：Yes ...`
- `■ [01:06:59 – 01:15:01] ... DAW操作：Yes ...`

Parsing should accept:

- en dash `–` or hyphen `-`
- spaces around separator are optional

---
