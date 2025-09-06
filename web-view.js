class WebFavoritesViewer {
    constructor() {
        console.log('WebView: WebFavoritesViewer constructor');
        this.allFavorites = [];
        this.allCategories = [];
        this.allTags = [];
        this.filteredFavorites = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.isLoading = false;
        this.init();
    }

    async init() {
        console.log('WebView: init開始');
        await this.loadData();
        console.log('WebView: loadData完了、データ件数:', this.allFavorites.length);
        this.setupEventListeners();
        this.filteredFavorites = [...this.allFavorites];
        this.displayFavorites();
        this.updateStats();
        console.log('WebView: init完了');
    }

    setupEventListeners() {
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadData();
        });

        // 検索とフィルターにデバウンス機能を追加
        let searchTimeout;
        document.getElementById('search').addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterFavorites();
            }, 300);
        });

        document.getElementById('filter-category').addEventListener('change', () => {
            this.filterFavorites();
        });

        // ページサイズ変更
        document.getElementById('items-per-page').addEventListener('change', (e) => {
            this.itemsPerPage = parseInt(e.target.value);
            this.currentPage = 1;
            this.displayFavorites();
        });

        // 無限スクロール
        window.addEventListener('scroll', () => {
            if (this.isLoading) return;

            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            if (scrollTop + clientHeight >= scrollHeight - 1000) {
                this.loadMoreItems();
            }
        });


    }

    async loadData() {
        try {
            console.log('WebView: データ読み込み開始');

            // browser APIの確認
            if (!browser || !browser.runtime) {
                console.error('WebView: browser.runtime が利用できません');
                this.showError('拡張機能APIにアクセスできません');
                return;
            }

            // background scriptからデータを取得
            const response = await new Promise((resolve, reject) => {
                browser.runtime.sendMessage(
                    { action: 'getFavoritesData' },
                    (response) => {
                        if (browser.runtime.lastError) {
                            console.error('WebView: runtime.lastError:', browser.runtime.lastError);
                            reject(new Error(browser.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    }
                );
            });

            console.log('WebView: background scriptからの応答:', response);
            console.log('WebView: 応答の型:', typeof response);
            console.log('WebView: 応答の内容:', JSON.stringify(response));

            if (response && response.success) {
                this.allFavorites = response.data.favorites || [];
                this.allCategories = response.data.categories || [];
                this.allTags = response.data.allTags || [];

                console.log('WebView: 読み込まれたデータ:', {
                    favorites: this.allFavorites.length,
                    categories: this.allCategories.length,
                    tags: this.allTags.length
                });

                this.loadCategories();
                this.filteredFavorites = [...this.allFavorites];
                this.currentPage = 1;
                this.displayFavorites();
                this.updateStats();
            } else {
                console.error('データ取得失敗:', response);
                const errorMessage = response && response.error ? response.error : '不明なエラー（応答形式が不正）';
                this.showError('データの読み込みに失敗しました: ' + errorMessage);
            }
        } catch (error) {
            console.error('データ読み込みエラー:', error);
            this.showError('データの読み込み中にエラーが発生しました: ' + error.message);
        }
    }

    loadCategories() {
        const filterSelect = document.getElementById('filter-category');
        filterSelect.innerHTML = '<option value="">全カテゴリー</option>';

        this.allCategories.forEach(category => {
            const option = new Option(category, category);
            filterSelect.appendChild(option);
        });
    }

    displayFavorites(append = false) {
        const favorites = this.filteredFavorites;
        console.log('WebView: displayFavorites呼び出し', favorites.length, '件');
        const container = document.getElementById('favorites-grid');

        if (!container) {
            console.error('WebView: favorites-grid要素が見つかりません');
            return;
        }

        if (favorites.length === 0) {
            console.log('WebView: お気に入りが0件のため、メッセージを表示');
            container.innerHTML = `
                <div class="no-favorites">
                    <h3>お気に入りがありません</h3>
                    <p>拡張機能のポップアップからお気に入りを追加してください</p>
                </div>
            `;
            this.updatePagination(0);
            return;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const itemsToShow = favorites.slice(0, endIndex);

        const html = itemsToShow.map(favorite => this.createFavoriteCard(favorite)).join('');

        if (append) {
            container.insertAdjacentHTML('beforeend', html);
        } else {
            container.innerHTML = html;
        }

        // クリックイベントリスナーを追加
        this.addCardClickListeners(container);

        this.updatePagination(favorites.length);
        this.updateLoadingState(false);
    }

    createFavoriteCard(favorite) {
        return `
            <div class="favorite-card" data-url="${this.escapeHtml(favorite.url)}">
                <div class="favorite-image">
                    ${favorite.imageUrl
                ? `<img src="${favorite.imageUrl}" alt="${favorite.title}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                           <div class="image-fallback" style="display:none;">🔗</div>`
                : `<div class="image-fallback">🔗</div>`
            }
                </div>
                <div class="favorite-content">
                    <div class="favorite-title">${this.escapeHtml(favorite.title)}</div>
                    <div class="favorite-url">${this.escapeHtml(favorite.url)}</div>
                    <div class="favorite-meta">
                        ${favorite.category ? `カテゴリー: ${this.escapeHtml(favorite.category)} | ` : ''}
                        ${new Date(favorite.timestamp).toLocaleDateString()}
                    </div>
                    <div class="favorite-tags">
                        ${favorite.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    addCardClickListeners(container) {
        const cards = container.querySelectorAll('.favorite-card[data-url]');
        cards.forEach(card => {
            // 既存のイベントリスナーを削除（重複防止）
            card.removeEventListener('click', this.handleCardClick);
            // 新しいイベントリスナーを追加
            card.addEventListener('click', this.handleCardClick.bind(this));
        });
    }

    async handleCardClick(event) {
        const card = event.currentTarget;
        const url = card.dataset.url;

        if (!url) return;

        try {
            // browser APIが利用可能な場合はそれを使用
            if (browser && browser.tabs && browser.tabs.create) {
                await browser.tabs.create({ url: url });
            } else {
                // フォールバック: window.openを使用
                window.open(url, '_blank');
            }
        } catch (error) {
            console.error('ページを開くエラー:', error);
            // エラーの場合はフォールバック
            window.open(url, '_blank');
        }
    }

    loadMoreItems() {
        if (this.isLoading) return;

        const totalPages = Math.ceil(this.filteredFavorites.length / this.itemsPerPage);
        if (this.currentPage >= totalPages) return;

        this.updateLoadingState(true);
        this.currentPage++;

        // パフォーマンスのため少し遅延
        setTimeout(() => {
            this.displayFavorites(true);
        }, 100);
    }

    updateLoadingState(loading) {
        this.isLoading = loading;
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = loading ? 'block' : 'none';
        }
    }

    updatePagination(totalItems) {
        const paginationInfo = document.getElementById('pagination-info');
        if (paginationInfo) {
            const displayedItems = Math.min(this.currentPage * this.itemsPerPage, totalItems);
            paginationInfo.textContent = `${displayedItems} / ${totalItems} 件表示`;
        }
    }

    filterFavorites() {
        const searchTerm = document.getElementById('search').value.toLowerCase();
        const selectedCategory = document.getElementById('filter-category').value;

        let filtered = this.allFavorites;

        if (selectedCategory) {
            filtered = filtered.filter(fav => fav.category === selectedCategory);
        }

        if (searchTerm) {
            filtered = filtered.filter(fav =>
                fav.title.toLowerCase().includes(searchTerm) ||
                fav.url.toLowerCase().includes(searchTerm) ||
                fav.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            );
        }

        this.filteredFavorites = filtered;
        this.currentPage = 1;
        this.displayFavorites();
    }

    updateStats() {
        document.getElementById('total-count').textContent = this.allFavorites.length;
        document.getElementById('category-count').textContent = this.allCategories.length;
        document.getElementById('with-image-count').textContent =
            this.allFavorites.filter(fav => fav.imageUrl).length;
    }

    showError(message) {
        const container = document.getElementById('favorites-grid');
        container.innerHTML = `
            <div class="no-favorites">
                <h3>エラーが発生しました</h3>
                <p>${message}</p>
                <button class="refresh-btn" onclick="location.reload()">再読み込み</button>
            </div>
        `;
    }
}

// グローバル変数でビューアーインスタンスを保持
let webViewer = null;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('WebView: DOMContentLoaded');

    // browser APIの存在確認
    if (typeof browser === 'undefined') {
        console.error('WebView: browser API が利用できません');
        document.getElementById('favorites-grid').innerHTML = `
            <div class="no-favorites">
                <h3>拡張機能APIにアクセスできません</h3>
                <p>この画面は拡張機能のコンテキストで開く必要があります。</p>
                <p>拡張機能のポップアップから「Web画面で開く」ボタンを使用してください。</p>
            </div>
        `;
        return;
    }

    console.log('WebView: browser API が利用可能です');
    webViewer = new WebFavoritesViewer();

    // メッセージリスナーを追加（データ更新通知を受信）
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('WebView: メッセージ受信:', message);
        if (message.action === 'dataUpdated' && webViewer) {
            console.log('WebView: データ更新通知を受信、リロード開始');
            webViewer.loadData();
        }
        sendResponse({ success: true });
    });
});