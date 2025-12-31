#!/usr/bin/env node

// ビルド時に環境変数から設定ファイルを生成し、Supabaseクライアントをダウンロードするスクリプト
const fs = require('fs');
const path = require('path');
const https = require('https');

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

// Supabaseクライアントをダウンロード
async function downloadSupabaseClient() {
  const supabaseDir = 'supabase';
  const supabaseFile = path.join(supabaseDir, 'supabase-js.min.js');
  
  // ディレクトリが存在しない場合は作成
  if (!fs.existsSync(supabaseDir)) {
    fs.mkdirSync(supabaseDir, { recursive: true });
  }
  
  // 既にファイルが存在し、サイズが適切な場合はスキップ
  if (fs.existsSync(supabaseFile)) {
    const stats = fs.statSync(supabaseFile);
    if (stats.size > 10000) { // 10KB以上なら有効なファイルとみなす
      console.log('✅ Supabaseクライアントは既に存在します');
      return;
    }
  }
  
  console.log('📥 Supabaseクライアントをダウンロード中...');
  
  return new Promise((resolve, reject) => {
    const url = 'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js';
    const file = fs.createWriteStream(supabaseFile);
    
    https.get(url, (response) => {
      // リダイレクトの処理
      if (response.statusCode === 301 || response.statusCode === 302) {
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log('✅ Supabaseクライアントをダウンロードしました');
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('✅ Supabaseクライアントをダウンロードしました');
          resolve();
        });
      }
    }).on('error', reject);
  });
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

// メイン処理
async function main() {
  try {
    await downloadSupabaseClient();
    generateConfig();
    console.log('🎉 ビルド完了！');
  } catch (error) {
    console.error('❌ ビルドエラー:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  main();
}

module.exports = { generateConfig, downloadSupabaseClient };