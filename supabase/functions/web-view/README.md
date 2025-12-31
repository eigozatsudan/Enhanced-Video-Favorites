# Web View Edge Function

お気に入り一覧APIをEdge Functionで提供し、HTMLは外部の静的ホスティング（例: GitHub Pages / Netlify / Vercel / S3 など）に置き、リダイレクトで配信します。

## 🚀 デプロイ手順

### 1. Supabase CLIのインストール
```bash
npm install -g supabase
```

### 2. Supabaseプロジェクトにログイン
```bash
supabase login
```

### 3. プロジェクトの初期化（既存プロジェクトの場合）
```bash
supabase init
supabase link --project-ref YOUR_PROJECT_REF
```

### 4. HTMLを準備して静的ホスティングへ配置
- `supabase/functions/web-view/index.html` もしくは `templates/web-view-public.html` をベースに、以下を置換して保存
     - `SUPABASE_URL`: プロジェクトURL (`https://<project>.supabase.co`)
     - `SUPABASE_ANON_KEY`: anon key（ダッシュボードの API → Project API Keys）
     - `EDGE_BASE`: 関数のベースURL（例: `https://<project>.supabase.co/functions/v1/web-view`）
- GitHub Pages / Netlify / Vercel / S3 などの静的サイトホスティングにアップロードし、HTTPSで配信できるURLを控える

### 5. 環境変数の設定
Supabaseダッシュボード（プロジェクト設定 → Functions → Environment variables）で以下を設定：
- `PUBLIC_WEBVIEW_URL`: 上でアップロードしたHTMLの公開URL（例: `https://example.github.io/favorites/index.html`）

### 6. Edge Functionをデプロイ
```bash
supabase functions deploy web-view
```

## 🌐 アクセス

デプロイ後、以下でアクセス：
- HTML: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/web-view/` または `/favorites` → `PUBLIC_WEBVIEW_URL` へ302リダイレクト
- API: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/web-view/api/favorites`

## 📋 機能

### HTMLページ提供（外部ホスティング）
- HTMLは外部の静的ホスティングで配信（Edge Functionはリダイレクトのみ）
- 認証フォーム付きのSPA、レスポンシブ

### APIエンドポイント
- `GET /api/favorites` - 認証されたユーザーのお気に入りデータを取得
- Authorization ヘッダーが必要
- ユーザー固有のデータのみ返却

## 🔐 認証

### ログイン方法
1. Web画面にアクセス
2. 拡張機能で使用しているメールアドレス・パスワードを入力
3. ログインボタンをクリック

### セキュリティ
- Row Level Security (RLS) により保護
- 認証されたユーザーのみが自分のデータにアクセス可能
- JWTトークンによる認証

## 🛠 開発

### ローカル開発
```bash
supabase functions serve web-view
```

### ログ確認
```bash
supabase functions logs web-view
```

### テスト
```bash
# HTMLページのテスト
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/web-view

# APIエンドポイントのテスト（要認証）
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://YOUR_PROJECT_REF.supabase.co/functions/v1/web-view/api/favorites
```

## 📁 ファイル構成

```
supabase/functions/web-view/
├── index.ts          # メインのEdge Function
├── deno.json         # Deno設定
└── README.md         # このファイル
```

## 🔧 カスタマイズ

### HTMLテンプレートの編集
`supabase/functions/web-view/index.html` または `templates/web-view-public.html` を編集し、置換後にStorageへ再アップロードします。

### APIエンドポイントの追加
新しいエンドポイントを追加する場合は、`index.ts` のルーティング部分を編集してください。

## 🚨 トラブルシューティング

### デプロイエラー
```bash
# 関数の状態確認
supabase functions list

# ログ確認
supabase functions logs web-view --follow
```

### 認証エラー
1. 環境変数が正しく設定されているか確認
2. RLSポリシーが有効になっているか確認
3. ユーザーが正しく認証されているか確認

### データが表示されない
1. データベースにデータが存在するか確認
2. テーブル名が正しいか確認（`favorites`, `categories`）
3. ユーザーIDが正しく設定されているか確認

## 📊 パフォーマンス

- Edge Functionは世界中のエッジロケーションで実行
- 初回アクセス時のコールドスタートあり
- 静的アセット（CSS、JS）はインライン化済み

## 🔄 更新

コードを更新した場合：
```bash
supabase functions deploy web-view
```

## 💡 Tips

### CORS設定
すべてのオリジンからのアクセスを許可しています。本番環境では適切に制限してください。

### エラーハンドリング
すべてのエラーはJSONレスポンスとして返されます。

### キャッシュ
HTMLページはキャッシュされません。必要に応じてCache-Controlヘッダーを追加してください。

## 🆚 静的ホスティングとの比較

| 項目 | Edge Function | 静的ホスティング |
|------|---------------|------------------|
| 認証 | サーバーサイド | クライアントサイド |
| セキュリティ | 高 | 中 |
| パフォーマンス | 中（コールドスタート） | 高 |
| 更新頻度 | リアルタイム | 手動更新 |
| 複雑さ | 中 | 低 |

## 📞 サポート

問題が発生した場合：
1. Supabaseダッシュボードでログを確認
2. 環境変数の設定を確認
3. RLSポリシーの設定を確認
4. ブラウザの開発者ツールでネットワークエラーを確認