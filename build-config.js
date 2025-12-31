#!/usr/bin/env node

// ビルド時に環境変数から設定ファイルを生成するスクリプト
const fs = require('fs');
const path = require('path');

// .env.localファイルを読み込む関数
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`警告: ${filePath} が見つかりません`);
    return {};
  }

  const envContent = fs.readFileSync(filePath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return envVars;
}

// 設定ファイルを生成
function generateConfig() {
  // .env.localから環境変数を読み込み
  const envVars = loadEnvFile('.env.local');

  // 環境変数またはプロセス環境変数から値を取得
  const supabaseUrl = envVars.SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey = envVars.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  // 設定ファイルの内容を生成
  const configContent = `// Supabase設定（自動生成）
// このファイルは build-config.js によって生成されます
// 直接編集せず、.env.local を編集してください

const SUPABASE_CONFIG = {
  url: '${supabaseUrl}',
  anonKey: '${supabaseAnonKey}',
  
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
}`;

  // ファイルに書き込み
  fs.writeFileSync('supabase/config.js', configContent);
  
  console.log('✅ supabase/config.js を生成しました');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️  警告: SUPABASE_URL または SUPABASE_ANON_KEY が設定されていません');
    console.log('   .env.local ファイルに正しい値を設定してください');
  } else {
    console.log('✅ Supabase設定が正常に読み込まれました');
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  generateConfig();
}

module.exports = { generateConfig };