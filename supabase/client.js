// Supabaseクライアント
class SupabaseClient {
  constructor() {
    this.supabase = null;
    this.user = null;
    this.isInitialized = false;
  }

  // 初期化
  async init() {
    try {
      if (!validateSupabaseConfig()) {
        throw new Error('Supabase設定が不完全です');
      }

      // Supabaseクライアントを初期化（ローカルファイルから）
      if (typeof window !== 'undefined' && !window.supabase) {
        throw new Error('Supabaseクライアントが見つかりません。supabase-js.min.jsが正しく読み込まれているか確認してください。');
      }

      this.supabase = window.supabase.createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey
      );

      // 認証状態の監視
      this.supabase.auth.onAuthStateChange((event, session) => {
        console.log('認証状態変更:', event, session?.user?.email);
        this.user = session?.user || null;
        this.notifyAuthStateChange(event, session);
      });

      // 現在のセッションを取得
      const { data: { session } } = await this.supabase.auth.getSession();
      this.user = session?.user || null;

      this.isInitialized = true;
      console.log('Supabaseクライアント初期化完了');
      return true;
    } catch (error) {
      console.error('Supabaseクライアント初期化エラー:', error);
      return false;
    }
  }

  // Supabaseクライアントを動的に読み込み
  async loadSupabaseScript() {
    // ローカルファイルが既に読み込まれている場合はスキップ
    if (typeof window !== 'undefined' && window.supabase) {
      return Promise.resolve();
    }
    
    // ローカルファイルが読み込まれていない場合はエラー
    throw new Error('Supabaseクライアントが読み込まれていません。supabase-js.min.jsが正しく読み込まれているか確認してください。');
  }

  // 認証状態変更の通知
  notifyAuthStateChange(event, session) {
    // 他のコンポーネントに認証状態変更を通知
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabaseAuthChange', {
        detail: { event, session, user: session?.user }
      }));
    }
  }

  // ログイン
  async signIn(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      console.log('ログイン成功:', data.user.email);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('ログインエラー:', error);
      return { success: false, error: error.message };
    }
  }

  // サインアップ
  async signUp(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined // メール認証を無効化
        }
      });

      if (error) throw error;

      console.log('サインアップ成功:', data.user?.email);
      
      // 拡張機能では即座にログイン状態にする
      if (data.user && !data.user.email_confirmed_at) {
        console.log('拡張機能用: メール認証をスキップしてログイン状態にします');
        return { success: true, user: data.user, needsConfirmation: false };
      }
      
      return { success: true, user: data.user, needsConfirmation: !data.user?.email_confirmed_at };
    } catch (error) {
      console.error('サインアップエラー:', error);
      return { success: false, error: error.message };
    }
  }

  // ログアウト
  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;

      console.log('ログアウト成功');
      return { success: true };
    } catch (error) {
      console.error('ログアウトエラー:', error);
      return { success: false, error: error.message };
    }
  }

  // 認証状態確認
  isAuthenticated() {
    return !!this.user;
  }

  // 現在のユーザー取得
  getCurrentUser() {
    return this.user;
  }

  // お気に入りを同期（アップロード）
  async syncFavoritesToCloud(favorites) {
    if (!this.isAuthenticated()) {
      throw new Error('認証が必要です');
    }

    try {
      // 既存のお気に入りを削除
      await this.supabase
        .from(SUPABASE_CONFIG.tables.favorites)
        .delete()
        .eq('user_id', this.user.id);

      // 新しいお気に入りを挿入
      const favoritesWithUserId = favorites.map(fav => ({
        user_id: this.user.id,
        title: fav.title,
        url: fav.url,
        image_url: fav.imageUrl, // imageUrl -> image_url
        category: fav.category,
        tags: fav.tags || [],
        created_at: fav.timestamp || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      if (favoritesWithUserId.length > 0) {
        const { error } = await this.supabase
          .from(SUPABASE_CONFIG.tables.favorites)
          .insert(favoritesWithUserId);

        if (error) throw error;
      }

      console.log('お気に入りをクラウドに同期しました:', favorites.length);
      return { success: true };
    } catch (error) {
      console.error('お気に入り同期エラー:', error);
      return { success: false, error: error.message };
    }
  }

  // お気に入りをクラウドから取得
  async getFavoritesFromCloud() {
    if (!this.isAuthenticated()) {
      throw new Error('認証が必要です');
    }

    try {
      const { data, error } = await this.supabase
        .from(SUPABASE_CONFIG.tables.favorites)
        .select('*')
        .eq('user_id', this.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // ローカル形式に変換
      const favorites = data.map(item => ({
        id: item.id.toString(),
        title: item.title,
        url: item.url,
        imageUrl: item.image_url, // image_url -> imageUrl
        category: item.category,
        tags: item.tags || [],
        timestamp: item.created_at
      }));

      console.log('クラウドからお気に入りを取得しました:', favorites.length);
      return { success: true, favorites };
    } catch (error) {
      console.error('お気に入り取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  // カテゴリーを同期
  async syncCategoriesToCloud(categories) {
    if (!this.isAuthenticated()) {
      throw new Error('認証が必要です');
    }

    try {
      // 既存のカテゴリーを削除
      await this.supabase
        .from(SUPABASE_CONFIG.tables.categories)
        .delete()
        .eq('user_id', this.user.id);

      // 新しいカテゴリーを挿入
      const categoriesWithUserId = categories.map(category => ({
        name: category,
        user_id: this.user.id,
        created_at: new Date().toISOString()
      }));

      if (categoriesWithUserId.length > 0) {
        const { error } = await this.supabase
          .from(SUPABASE_CONFIG.tables.categories)
          .insert(categoriesWithUserId);

        if (error) throw error;
      }

      console.log('カテゴリーをクラウドに同期しました:', categories.length);
      return { success: true };
    } catch (error) {
      console.error('カテゴリー同期エラー:', error);
      return { success: false, error: error.message };
    }
  }

  // カテゴリーをクラウドから取得
  async getCategoriesFromCloud() {
    if (!this.isAuthenticated()) {
      throw new Error('認証が必要です');
    }

    try {
      const { data, error } = await this.supabase
        .from(SUPABASE_CONFIG.tables.categories)
        .select('name')
        .eq('user_id', this.user.id);

      if (error) throw error;

      const categories = data.map(item => item.name);
      console.log('クラウドからカテゴリーを取得しました:', categories.length);
      return { success: true, categories };
    } catch (error) {
      console.error('カテゴリー取得エラー:', error);
      return { success: false, error: error.message };
    }
  }
}

// グローバルインスタンス
let supabaseClient = null;

// インスタンス取得
function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = new SupabaseClient();
  }
  return supabaseClient;
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SupabaseClient, getSupabaseClient };
} else if (typeof window !== 'undefined') {
  window.SupabaseClient = SupabaseClient;
  window.getSupabaseClient = getSupabaseClient;
}