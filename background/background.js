// バックグラウンドスクリプト（Firefox用）
console.log('background.js が読み込まれました');

// スクリプト読み込み時にもコンテキストメニューを作成
setTimeout(() => {
  console.log('遅延コンテキストメニュー作成を実行');
  createContextMenus();
}, 1000);

// デバッグ用: コンテキストメニューの状態を確認する関数
function checkContextMenus() {
  browser.contextMenus.removeAll(() => {
    console.log('既存のコンテキストメニューをクリアしました');
    createContextMenus();
  });
}

// デバッグ用: グローバルに公開
if (typeof window !== 'undefined') {
  window.checkContextMenus = checkContextMenus;
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('background.js: メッセージ受信:', message);
  console.log('background.js: sendResponse関数:', typeof sendResponse);
  
  if (message.action === 'checkFavoriteStatus') {
    // 特定のURLがお気に入りに登録されているかチェック
    (async () => {
      try {
        console.log('background.js: お気に入りステータスチェック開始:', message.url);
        
        const result = await browser.storage.local.get(['favorites']);
        const favorites = result.favorites || [];
        const targetUrl = message.url;
        
        console.log('background.js: 登録済みお気に入り数:', favorites.length);
        console.log('background.js: チェック対象URL:', targetUrl);
        
        // 完全一致チェック
        const exactMatch = favorites.find(fav => fav.url === targetUrl);
        console.log('background.js: 完全一致:', !!exactMatch);
        
        // クリーンURL一致チェック（アンカーやクエリパラメータを除去）
        const getCleanUrl = (url) => {
          try {
            const urlObj = new URL(url);
            return urlObj.origin + urlObj.pathname;
          } catch (e) {
            return url.split('#')[0].split('?')[0];
          }
        };
        
        const cleanTargetUrl = getCleanUrl(targetUrl);
        const cleanMatch = favorites.find(fav => getCleanUrl(fav.url) === cleanTargetUrl);
        console.log('background.js: クリーンURL一致:', !!cleanMatch);
        console.log('background.js: クリーンURL:', cleanTargetUrl);
        
        const isFavorite = !!(exactMatch || cleanMatch);
        const favoriteData = exactMatch || cleanMatch || null;
        
        console.log('background.js: 最終判定 - お気に入り登録済み:', isFavorite);
        if (favoriteData) {
          console.log('background.js: お気に入りデータ:', {
            id: favoriteData.id,
            title: favoriteData.title,
            url: favoriteData.url
          });
        }
        
        const response = {
          success: true,
          isFavorite: isFavorite,
          exactMatch: !!exactMatch,
          cleanMatch: !!cleanMatch,
          favoriteData: favoriteData
        };
        
        console.log('background.js: 応答データ:', response);
        sendResponse(response);
      } catch (error) {
        console.error('background.js: お気に入りステータスチェックエラー:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      }
    })();
    
    return true; // 非同期レスポンスを示す
  }

  if (message.action === 'getFavoritesData') {
    // 非同期処理を実行
    (async () => {
      try {
        const result = await browser.storage.local.get(['favorites', 'categories', 'allTags']);
        console.log('background.js: ストレージから取得したデータ:', {
          favorites: result.favorites?.length || 0,
          categories: result.categories?.length || 0,
          allTags: result.allTags?.length || 0,
          rawFavorites: result.favorites
        });
        
        const responseData = {
          success: true,
          data: {
            favorites: result.favorites || [],
            categories: result.categories || [],
            allTags: result.allTags || []
          }
        };
        
        console.log('background.js: 送信する応答:', responseData);
        sendResponse(responseData);
      } catch (error) {
        console.error('データ取得エラー:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      }
    })();
    
    return true; // 非同期レスポンスを示す
  }

  if (message.action === 'deleteFavorite') {
    (async () => {
      try {
        console.log('background.js: 削除リクエスト受信 - favoriteId:', message.favoriteId);
        
        const result = await browser.storage.local.get(['favorites']);
        const favorites = result.favorites || [];
        console.log('background.js: 削除前のお気に入り数:', favorites.length);
        
        // IDの型を統一して比較（文字列として比較）
        const targetId = String(message.favoriteId);
        const updatedFavorites = favorites.filter(fav => String(fav.id) !== targetId);
        console.log('background.js: 削除後のお気に入り数:', updatedFavorites.length);
        
        if (favorites.length === updatedFavorites.length) {
          console.warn('background.js: 削除対象が見つかりませんでした');
          console.log('background.js: 削除対象ID:', message.favoriteId, '(型:', typeof message.favoriteId, ')');
          console.log('background.js: 既存のID一覧:', favorites.map(f => ({ id: f.id, type: typeof f.id })));
        }
        
        await browser.storage.local.set({ favorites: updatedFavorites });
        console.log('background.js: ストレージ更新完了');
        
        sendResponse({
          success: true,
          message: 'お気に入りを削除しました'
        });
      } catch (error) {
        console.error('削除エラー:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      }
    })();
    
    return true;
  }

  if (message.action === 'updateFavorite') {
    (async () => {
      try {
        const result = await browser.storage.local.get(['favorites', 'categories', 'allTags']);
        const favorites = result.favorites || [];
        const categories = result.categories || [];
        const allTags = result.allTags || [];
        
        const favoriteIndex = favorites.findIndex(fav => fav.id === message.favoriteId);
        if (favoriteIndex === -1) {
          throw new Error('お気に入りが見つかりません');
        }
        
        // お気に入りを更新
        favorites[favoriteIndex] = {
          ...favorites[favoriteIndex],
          ...message.data,
          updatedAt: new Date().toISOString()
        };
        
        // 新しいカテゴリーを追加
        if (message.data.category && !categories.includes(message.data.category)) {
          categories.push(message.data.category);
        }
        
        // 新しいタグを追加
        message.data.tags.forEach(tag => {
          if (!allTags.includes(tag)) {
            allTags.push(tag);
          }
        });
        
        await browser.storage.local.set({ favorites, categories, allTags });
        
        sendResponse({
          success: true,
          message: 'お気に入りを更新しました'
        });
      } catch (error) {
        console.error('更新エラー:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      }
    })();
    
    return true;
  }
  
  sendResponse({ success: true });
  return false;
});

// コンテキストメニューを作成する関数
function createContextMenus() {
  console.log('コンテキストメニューを作成中...');
  
  // 既存のコンテキストメニューをクリア
  browser.contextMenus.removeAll(() => {
    // 画像用コンテキストメニューを作成
    browser.contextMenus.create({
      id: 'add-image-to-favorites',
      title: 'この画像を使ってお気に入り登録',
      contexts: ['image']
    }, () => {
      if (browser.runtime.lastError) {
        console.error('コンテキストメニュー作成エラー:', browser.runtime.lastError);
      } else {
        console.log('コンテキストメニューが正常に作成されました');
      }
    });
  });
}

// インストール時の初期化
browser.runtime.onInstalled.addListener((details) => {
  console.log('Enhanced Video Favorites 拡張機能がインストールされました:', details.reason);
  createContextMenus();
});

// 起動時の初期化（既にインストール済みの場合）
browser.runtime.onStartup.addListener(() => {
  console.log('Enhanced Video Favorites 拡張機能が起動しました');
  createContextMenus();
});

// 拡張機能が有効化された時の初期化
if (browser.management && browser.management.onEnabled) {
  browser.management.onEnabled.addListener((info) => {
    if (info.id === browser.runtime.id) {
      console.log('Enhanced Video Favorites 拡張機能が有効化されました');
      createContextMenus();
    }
  });
}

// コンテキストメニューのクリック処理
browser.contextMenus.onClicked.addListener((info, tab) => {
  console.log('コンテキストメニューがクリックされました:', info.menuItemId);
  
  if (info.menuItemId === 'add-image-to-favorites') {
    console.log('画像お気に入り登録メニューがクリックされました');
    // 画像URLとページ情報を取得してお気に入り追加フォームを開く
    handleImageContextMenu(info, tab);
  }
});

// 画像コンテキストメニューの処理
async function handleImageContextMenu(info, tab) {
  try {
    console.log('画像コンテキストメニューがクリックされました:', {
      menuItemId: info.menuItemId,
      srcUrl: info.srcUrl,
      pageUrl: tab.url,
      tabId: tab.id
    });
    
    // 画像URLの検証
    if (!info.srcUrl) {
      console.error('画像URLが取得できませんでした');
      return;
    }
    
    // アンカータグを削除したクリーンなURLを作成
    const cleanUrl = getCleanUrl(tab.url);
    console.log('クリーンURL:', cleanUrl);
    
    // 画像情報をコンテンツスクリプトに送信
    console.log('コンテンツスクリプトにメッセージを送信中...');
    const response = await browser.tabs.sendMessage(tab.id, {
      action: 'showImageFavoriteForm',
      imageUrl: info.srcUrl,
      pageUrl: cleanUrl,
      pageTitle: tab.title
    });
    
    console.log('コンテンツスクリプトからの応答:', response);
    
  } catch (error) {
    console.error('画像コンテキストメニュー処理エラー:', error);
    console.log('フォールバック処理を実行中...');
    
    // コンテンツスクリプトが利用できない場合は、ポップアップを開く
    try {
      console.log('一時データをストレージに保存中...');
      await browser.storage.local.set({
        tempImageData: {
          imageUrl: info.srcUrl,
          pageUrl: getCleanUrl(tab.url),
          pageTitle: tab.title,
          timestamp: Date.now()
        }
      });
      
      console.log('ポップアップを開こうとしています...');
      // 新しいタブでポップアップページを開く（Firefox対応）
      await browser.tabs.create({
        url: browser.runtime.getURL('popup/popup.html'),
        active: true
      });
      
    } catch (popupError) {
      console.error('フォールバック処理エラー:', popupError);
      // 最後の手段として通知を表示
      if (browser.notifications) {
        browser.notifications.create({
          type: 'basic',
          title: 'お気に入り登録',
          message: '画像のお気に入り登録フォームを開けませんでした。拡張機能のポップアップから手動で登録してください。'
        });
      }
    }
  }
}

// URLからアンカーやクエリパラメータを除去
function getCleanUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.origin + urlObj.pathname;
  } catch (e) {
    return url.split('#')[0].split('?')[0];
  }
}