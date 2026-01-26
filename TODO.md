# TODO.md (v2)

## Phase 1: S3互換ストレージ層（MinIO/R2）

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
