# Android版Firefox対応ガイド

このアドオンのAndroid版Firefoxでの対応状況と制限事項について説明します。

## 対応状況

### ✅ 基本的に対応済み

現在のアドオンは以下の理由でAndroid版Firefoxでも動作します：

1. **Manifest V2使用**: Android版FirefoxはManifest V2をサポート
2. **WebExtensions API**: 使用しているAPIはモバイル版でもサポート
3. **Gecko固有設定**: `browser_specific_settings.gecko` で最適化済み

### ⚠️ 制限事項と注意点

#### 1. ポップアップの制限
- **デスクトップ**: ツールバーボタンクリックでポップアップ表示
- **Android**: ポップアップは表示されず、代わりにタブで開かれる

#### 2. コンテキストメニューの制限
- 画像の右クリックメニューは限定的
- 一部のコンテキストメニュー機能が制限される

#### 3. 通知機能
- Android版では通知の表示方法が異なる
- システム通知として表示される

#### 4. ファイルアクセス
- ファイルのダウンロード/アップロード機能に制限
- エクスポート/インポート機能が制限される可能性

## Android版対応の改善

### 1. ポップアップの代替手段

Android版では、ポップアップの代わりにタブページを使用：

```javascript
// Android版検出とタブページへのリダイレクト
function isAndroidFirefox() {
  return navigator.userAgent.includes('Mobile') && 
         navigator.userAgent.includes('Firefox');
}

// ポップアップの代わりにタブページを開く
if (isAndroidFirefox()) {
  browser.tabs.create({ url: browser.runtime.getURL('popup/popup.html') });
}
```

### 2. レスポンシブデザインの改善

モバイル向けのスタイル調整を追加済み：

- タッチ操作に適したボタンサイズ（最小44px）
- フルスクリーン表示対応
- 縦向きレイアウトの最適化
- フォント サイズの調整

### 3. タッチ操作の最適化

- ダブルタップズームの防止
- スクロール動作の改善
- タッチイベントの最適化

## 実装済みの改善点

### ✅ 自動検出とUI調整

```javascript
// Android Firefox検出
isAndroidFirefox() {
    return navigator.userAgent.includes('Mobile') && 
           navigator.userAgent.includes('Firefox');
}

// モバイル向けUI調整
adjustForMobile() {
    if (this.isAndroidFirefox()) {
        // ポップアップがタブで開かれた場合の調整
        // タッチ操作の最適化
        // レスポンシブレイアウトの適用
    }
}
```

### ✅ レスポンシブCSS

```css
/* Android Firefox専用スタイル */
@media (max-width: 768px) and (-moz-touch-enabled: 1) {
  .container {
    padding: 15px;
  }
  
  .btn {
    min-height: 44px;
    touch-action: manipulation;
  }
}
```

### ✅ タッチ操作対応

- 最小タッチターゲットサイズ: 44px
- ダブルタップズーム防止
- スムーズスクロール

## 使用方法（Android版）

### 1. インストール

1. Android版Firefoxを開く
2. メニュー → アドオン
3. 「Enhanced Video Favorites」を検索してインストール

### 2. 基本操作

- **アドオンアクセス**: メニュー → アドオン → Enhanced Video Favorites
- **お気に入り追加**: ページでメニューを開き、アドオンを選択
- **一覧表示**: Web画面で開くボタンをタップ

### 3. 制限事項の回避

#### ポップアップ制限
- ツールバーボタンをタップするとタブで開かれます
- フルスクリーン表示で使いやすくなります

#### コンテキストメニュー制限
- 画像の長押しでコンテキストメニューが表示されます
- 一部機能は制限される場合があります

#### ファイル操作制限
- エクスポート機能は制限される場合があります
- クラウド同期機能を推奨します

## パフォーマンス最適化

### メモリ使用量の削減

```javascript
// 大きな画像の遅延読み込み
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
});
```

### バッテリー消費の最適化

- 不要なタイマーの削除
- イベントリスナーの最適化
- DOM操作の最小化

## トラブルシューティング

### よくある問題

#### 1. ポップアップが表示されない
**原因**: Android版Firefoxはポップアップをサポートしていません
**解決**: タブで開かれるのが正常な動作です

#### 2. 画面が小さく表示される
**原因**: レスポンシブCSSが適用されていない
**解決**: ページを再読み込みしてください

#### 3. タッチ操作が反応しない
**原因**: タッチイベントの競合
**解決**: アドオンを再インストールしてください

### デバッグ方法

1. **開発者ツール**: メニュー → ツール → Web開発者ツール
2. **コンソール確認**: エラーメッセージをチェック
3. **ネットワーク**: Supabase接続状況を確認

## 今後の改善予定

- [ ] プッシュ通知対応
- [ ] オフライン機能の強化
- [ ] ジェスチャー操作の追加
- [ ] 音声入力対応

Android版Firefoxでも快適にお気に入り管理ができるよう最適化されています！