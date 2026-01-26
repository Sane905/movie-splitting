# DONE.md

- [x] TASK-00-1: 既存コードを AGENTS.md (v2) に合わせてリファクタできる状態にする
- [x] TASK-00-2: 不要になった REST エンドポイントをコメントアウト or 削除
- [x] TASK-00-3: Fastify + tRPC が共存する最小構成を確認
- [x] TASK-01-1: docker-compose で MinIO を起動できるようにする
- [x] TASK-01-2: S3Client (AWS SDK v3) ラッパー `services/s3.ts` を作成
- [x] TASK-01-3: バケット存在チェック & 初期化処理を追加
- [x] TASK-01-4: presigned PUT/GET を生成する util を実装
- [x] TASK-01-5: ローカルから MinIO に PUT/GET できることを検証
- [x] TASK-02-1: Fastify に tRPC adapter を組み込む
- [x] TASK-02-2: tRPC router の雛形を作成
- [x] TASK-02-3: client 側に tRPC client を導入
- [x] TASK-02-4: 型共有が動くことを確認
- [x] TASK-03-1: `createJob` procedure を実装
- [x] TASK-03-2: `getUploadUrl` procedure を実装（presigned PUT）
- [x] TASK-03-3: フロントで R2/MinIO に直接 PUT する処理を実装
- [x] TASK-03-4: `uploadComplete` procedure を実装
- [x] TASK-03-5: オブジェクト存在検証（HEAD）を追加
