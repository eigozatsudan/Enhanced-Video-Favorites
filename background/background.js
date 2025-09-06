// バックグラウンドスクリプト（Firefox用）
console.log('background.js が読み込まれました');

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('background.js: メッセージ受信:', message);
  console.log('background.js: sendResponse関数:', typeof sendResponse);
  
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
});