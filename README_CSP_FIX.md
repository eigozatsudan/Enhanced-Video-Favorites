# Content Security Policy (CSP) 修正ガイド

ブラウザ拡張機能の審査で「content_security_policy allows remote code execution」エラーが発生した場合の修正方法です。

## 問題の原因

元の設定では外部スクリプト（`https://unpkg.com`）の読み込みを許可していたため、セキュリティリスクとして審査で却下されました。

## 修正内容

### 1. Content Security Policy の厳格化

**修正前:**
```json
"content_security_policy": "script-src 'self' https://unpkg.com; object-src 'self'"
```

**修正後:**
```json
"content_security_policy": "script-src 'self'; object-src 'self'"
```

### 2. Supabaseクライアントのローカル化

外部CDNからの読み込みを停止し、ローカルファイルとして含めるように変更：

- `supabase/supabase-js.min.js` をローカルに配置
- `popup/popup.html` でローカルファイルを読み込み
- `supabase/client.js` で動的読み込みを削除

### 3. ビルドシステムの改善

`build-config.js` を拡張して以下の機能を追加：

- Supabaseクライアントの自動ダウンロード
- 設定ファイルの自動生成
- 依存関係の管理

## セットアップ手順

### 1. 依存関係のダウンロード

```bash
npm run build
```

このコマンドで以下が実行されます：
- Supabaseクライアントのダウンロード
- 設定ファイルの生成

### 2. ファイル構成の確認

```
project/
├── supabase/
│   ├── supabase-js.min.js    # ローカルSupabaseクライアント
│   ├── config.js             # 生成された設定ファイル
│   └── client.js             # Supabaseクライアントラッパー
├── popup/
│   └── popup.html            # ローカルスクリプトを読み込み
└── manifest.json             # 厳格なCSP設定
```

### 3. 審査対応のポイント

- **外部スクリプト読み込みなし**: すべてのJavaScriptがローカルファイル
- **厳格なCSP**: `script-src 'self'` のみ許可
- **セキュリティ向上**: リモートコード実行のリスクを排除

## 開発時の注意点

### 1. Supabaseクライアントの更新

新しいバージョンを使用したい場合：

```bash
# 既存ファイルを削除
rm supabase/supabase-js.min.js

# 再ダウンロード
npm run build
```

### 2. 設定の変更

`.env.local` を編集後、必ず以下を実行：

```bash
npm run build
```

### 3. デバッグ

ローカルファイルが正しく読み込まれているか確認：

```javascript
// ブラウザの開発者ツールで確認
console.log(typeof window.supabase); // "object" が表示されるべき
```

## トラブルシューティング

### Supabaseクライアントが見つからない

**症状:** `Supabaseクライアントが見つかりません` エラー

**解決方法:**
1. `npm run build` を実行
2. `supabase/supabase-js.min.js` が存在するか確認
3. ファイルサイズが10KB以上あるか確認

### CSPエラーが継続する

**症状:** まだCSPエラーが発生する

**確認点:**
1. `manifest.json` のCSP設定が正しいか
2. HTMLファイルで外部スクリプトを読み込んでいないか
3. インラインスクリプトを使用していないか

### 拡張機能が動作しない

**症状:** 拡張機能が正常に動作しない

**デバッグ手順:**
1. ブラウザの開発者ツールでエラーを確認
2. `popup/popup.html` を直接開いてテスト
3. `console.log` でSupabaseクライアントの読み込み状況を確認

## 審査提出前のチェックリスト

- [ ] `manifest.json` のCSPが `script-src 'self'; object-src 'self'`
- [ ] 外部スクリプトの読み込みがない
- [ ] `supabase/supabase-js.min.js` が存在する
- [ ] 拡張機能が正常に動作する
- [ ] 認証とデータ同期が機能する

これらの修正により、ブラウザ拡張機能の審査を通過できるはずです。