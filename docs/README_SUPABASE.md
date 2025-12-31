# Supabase連携セットアップガイド

このガイドでは、ブラウザ拡張機能にSupabaseを使ったお気に入り同期機能を追加する手順を説明します。

## 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にアクセスしてアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトのURLとanon keyを取得

### 重要: メール認証の無効化（拡張機能用）

ブラウザ拡張機能では確認メールのリンクをクリックできないため、メール認証を無効にする必要があります：

1. Supabaseダッシュボードで「Authentication」→「Settings」を開く
2. 「Email Confirmation」を**無効**にする
3. 「Save」をクリック

これにより、ユーザー登録後すぐにログインできるようになります。

## 2. データベースのセットアップ

### 新規セットアップの場合
1. Supabaseダッシュボードの「SQL Editor」を開く
2. `supabase/setup.sql`の内容をコピーして実行
3. テーブルとポリシーが正常に作成されたことを確認

### 既存のテーブルがある場合（スキーマエラーが発生する場合）

**オプション1: 既存データを保持して修正**
1. `supabase/add-missing-columns.sql`を実行
2. 不足しているカラムが追加されます

**オプション2: テーブルを再作成（データは削除されます）**
1. `supabase/fix-schema.sql`を実行
2. 既存のテーブルが削除され、正しい構造で再作成されます

### スキーマ確認
以下のSQLでテーブル構造を確認できます：
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'favorites'
ORDER BY ordinal_position;
```

## 3. 設定ファイルの更新

`supabase/config.js`を編集して、あなたのSupabaseプロジェクト情報を設定：

```javascript
const SUPABASE_CONFIG = {
  url: 'https://your-project-id.supabase.co', // あなたのプロジェクトURL
  anonKey: 'your-anon-key', // あなたのanon key
  
  tables: {
    favorites: 'favorites',
    categories: 'categories',
    user_profiles: 'user_profiles'
  }
};
```

## 4. 機能の使い方

### 新規ユーザー登録
1. 拡張機能のポップアップを開く
2. 「新規登録」をクリック
3. メールアドレスとパスワード（6文字以上）を入力
4. 「登録」をクリック
5. **メール認証が無効化されているため、すぐにログイン状態になります**

### ログイン
1. メールアドレスとパスワードを入力
2. 「ログイン」をクリック

### データ同期

#### ローカルからクラウドへ同期
- 「クラウドに同期」ボタンをクリック
- ローカルのお気に入りとカテゴリーがSupabaseに保存されます

#### クラウドからローカルへ同期
- 「クラウドから取得」ボタンをクリック
- Supabaseに保存されたデータでローカルデータを上書きします

## 5. セキュリティ機能

- **Row Level Security (RLS)**: ユーザーは自分のデータのみアクセス可能
- **認証**: Supabase Authによる安全な認証
- **暗号化**: データは暗号化されて保存

## 6. データ構造

### favoritesテーブル
- `id`: 主キー
- `user_id`: ユーザーID（外部キー）
- `title`: お気に入りのタイトル
- `url`: URL
- `image_url`: 画像URL（オプション）
- `category`: カテゴリー
- `tags`: タグの配列
- `created_at`: 作成日時
- `updated_at`: 更新日時

### categoriesテーブル
- `id`: 主キー
- `user_id`: ユーザーID（外部キー）
- `name`: カテゴリー名
- `created_at`: 作成日時

## 7. トラブルシューティング

### 認証エラー
- メールアドレスとパスワードが正しいか確認
- **メール認証が無効化されているか確認**（Authentication → Settings → Email Confirmation を無効に）
- 既に同じメールアドレスで登録済みの場合は、ログインを試してください

### 同期エラー
- インターネット接続を確認
- Supabaseプロジェクトが正常に動作しているか確認
- **スキーマエラーの場合**: `supabase/add-missing-columns.sql`または`supabase/fix-schema.sql`を実行
- ブラウザの開発者ツールでエラーログを確認
- テーブル構造が正しいか確認（上記のスキーマ確認SQLを実行）

### 設定エラー
- `supabase/config.js`のURLとanon keyが正しいか確認
- Supabaseプロジェクトのダッシュボードで設定を確認

## 8. 注意事項

- **重要**: ブラウザ拡張機能で使用するため、Supabaseの「Email Confirmation」を無効にしてください
- 無料プランでは月間のリクエスト数に制限があります
- 大量のデータを同期する場合は、Supabaseの使用量を確認してください
- パスワードは安全なものを使用してください
- メール認証を無効にしているため、有効なメールアドレスを使用することをお勧めします

## 9. 今後の拡張可能性

- リアルタイム同期
- 複数デバイス間での自動同期
- お気に入りの共有機能
- バックアップとリストア機能の強化