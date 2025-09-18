// バックグラウンドスクリプト（Firefox用）
console.log('background.js が読み込まれました');

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('background.js: メッセージ受信:', message);
  console.log('background.js: sendResponse関数:', typeof sendResponse);
  
  if (message.action === 'checkFavoriteStatus') {
    // 特定のURLがお気に入りに登録されているかチェック
    (async () => {
      try {
        const result = await browser.storage.local.get(['favorites']);
        const favorites = result.favorites || [];
        const targetUrl = message.url;
        
        // 完全一致チェック
        const exactMatch = favorites.find(fav => fav.url === targetUrl);
        
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
        
        sendResponse({
          success: true,
          isFavorite: !!(exactMatch || cleanMatch),
          exactMatch: !!exactMatch,
          cleanMatch: !!cleanMatch,
          favoriteData: exactMatch || cleanMatch || null
        });
      } catch (error) {
        console.error('お気に入りステータスチェックエラー:', error);
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

// インストール時の初期化
browser.runtime.onInstalled.addListener(() => {
  console.log('Enhanced Video Favorites 拡張機能がインストールされました');
  
  // コンテキストメニューを作成
  browser.contextMenus.create({
    id: 'add-image-to-favorites',
    title: 'この画像を使ってお気に入り登録',
    contexts: ['image']
  });
});

// コンテキストメニューのクリック処理
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'add-image-to-favorites') {
    // 画像URLとページ情報を取得してお気に入り追加フォームを開く
    handleImageContextMenu(info, tab);
  }
});

// 画像コンテキストメニューの処理
async function handleImageContextMenu(info, tab) {
  try {
    console.log('画像コンテキストメニューがクリックされました:', info);
    
    // アンカータグを削除したクリーンなURLを作成
    const cleanUrl = getCleanUrl(tab.url);
    
    // 画像情報をコンテンツスクリプトに送信
    await browser.tabs.sendMessage(tab.id, {
      action: 'showImageFavoriteForm',
      imageUrl: info.srcUrl,
      pageUrl: cleanUrl,
      pageTitle: tab.title
    });
    
  } catch (error) {
    console.error('画像コンテキストメニュー処理エラー:', error);
    
    // コンテンツスクリプトが利用できない場合は、ポップアップを開く
    try {
      // ストレージに一時的に画像情報を保存
      await browser.storage.local.set({
        tempImageData: {
          imageUrl: info.srcUrl,
          pageUrl: getCleanUrl(tab.url),
          pageTitle: tab.title,
          timestamp: Date.now()
        }
      });
      
      // ポップアップを開く（ブラウザアクションをクリックしたのと同じ効果）
      browser.browserAction.openPopup();
    } catch (popupError) {
      console.error('ポップアップ開けませんでした:', popupError);
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