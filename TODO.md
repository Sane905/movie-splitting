# TODO.md (v2)

## Phase 4: Index Parsing

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
