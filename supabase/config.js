// Supabase設定（自動生成）
// このファイルは build-config.js によって生成されます
// 直接編集せず、.env.local を編集してください

const SUPABASE_CONFIG = {
  url: 'https://stydfridkqgtwztxsgrx.supabase.co',
  anonKey: 'sb_publishable_yNBZuk3yxZShOKXsAVRixA_wlyswiFC',
  
  // テーブル名
  tables: {
    favorites: 'favorites',
    categories: 'categories',
    user_profiles: 'user_profiles'
  }
};

// 設定の検証
function validateSupabaseConfig() {
  if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
    console.warn('Supabase設定が不完全です。.env.local ファイルでURLとanon keyを設定してください。');
    return false;
  }
  return true;
}

// 設定をエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SUPABASE_CONFIG, validateSupabaseConfig };
} else if (typeof window !== 'undefined') {
  window.SUPABASE_CONFIG = SUPABASE_CONFIG;
  window.validateSupabaseConfig = validateSupabaseConfig;
}