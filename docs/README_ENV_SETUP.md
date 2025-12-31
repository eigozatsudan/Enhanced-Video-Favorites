# 環境変数を使用したSupabase設定

このガイドでは、Supabase設定を環境変数で管理する方法を説明します。

## セットアップ手順

### 1. 環境変数ファイルの作成

`.env.local` ファイルを作成し、Supabase設定を記述：

```bash
# .env.local
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. 設定ファイルの生成

以下のコマンドで設定ファイルを生成：

```bash
# Node.jsがインストールされている場合
npm run build

# または直接実行
node build-config.js
```

### 3. 確認

`supabase/config.js` が正しい値で生成されていることを確認してください。

## 利用可能なコマンド

```bash
# 設定ファイルを生成
npm run build

# 開発用（設定ファイル生成 + メッセージ表示）
npm run dev

# セットアップ（buildと同じ）
npm run setup
```

## ファイル構成

```
project/
├── .env.example          # 設定例
├── .env.local           # 実際の設定（Gitで管理されない）
├── build-config.js      # 設定ファイル生成スクリプト
├── package.json         # NPMスクリプト定義
├── supabase/
│   └── config.js        # 生成される設定ファイル
└── .gitignore          # .env.localを除外
```

## セキュリティ

- `.env.local` は `.gitignore` に含まれており、Gitで管理されません
- 実際のAPIキーがソースコードに含まれることはありません
- チーム開発では各開発者が独自の `.env.local` を作成します

## トラブルシューティング

### Node.jsがない場合

Node.jsがインストールされていない場合は、従来通り `supabase/config.js` を直接編集してください：

```javascript
const SUPABASE_CONFIG = {
  url: 'https://your-project-id.supabase.co',
  anonKey: 'your-anon-key-here',
  // ...
};
```

### 設定が反映されない場合

1. `.env.local` ファイルが正しい場所にあるか確認
2. `npm run build` を実行
3. `supabase/config.js` の内容を確認
4. ブラウザ拡張機能を再読み込み

### 環境変数の優先順位

1. `.env.local` ファイル
2. システム環境変数（`process.env`）
3. デフォルト値（空文字）

## 本番環境での使用

本番環境やCI/CDでは、システム環境変数を使用できます：

```bash
export SUPABASE_URL=https://your-project-id.supabase.co
export SUPABASE_ANON_KEY=your-anon-key-here
node build-config.js
```