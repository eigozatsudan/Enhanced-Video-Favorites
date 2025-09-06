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
  
  sendResponse({ success: true });
  return false;
});

// インストール時の初期化
browser.runtime.onInstalled.addListener(() => {
  console.log('Enhanced Video Favorites 拡張機能がインストールされました');
});