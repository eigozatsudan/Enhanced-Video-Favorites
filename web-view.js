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
                console.log('WebView: お気に入りID一覧:', this.allFavorites.map(f => f.id));

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
            <div class="favorite-card" data-url="${this.escapeHtml(favorite.url)}" data-id="${favorite.id}">
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
                <div class="favorite-actions">
                    <button class="action-btn edit-btn" data-id="${favorite.id}">編集</button>
                    <button class="action-btn delete-btn" data-id="${favorite.id}">削除</button>
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
            // カードクリック（ページを開く）
            card.addEventListener('click', this.handleCardClick.bind(this));

            // 編集ボタン
            const editBtn = card.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', this.handleEditClick.bind(this));
            }

            // 削除ボタン
            const deleteBtn = card.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', this.handleDeleteClick.bind(this));
            }
        });
    }

    async handleCardClick(event) {
        // ボタンクリックの場合は無視
        if (event.target.classList.contains('action-btn')) {
            return;
        }

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

    handleEditClick(event) {
        event.stopPropagation();
        const favoriteId = event.target.dataset.id;
        this.showEditModal(favoriteId);
    }

    async handleDeleteClick(event) {
        event.stopPropagation();
        const favoriteId = event.target.dataset.id;

        const favorite = this.allFavorites.find(fav => fav.id === favoriteId);
        if (!favorite) return;

        if (confirm(`「${favorite.title}」を削除しますか？`)) {
            await this.deleteFavorite(favoriteId);
        }
    }

    async deleteFavorite(favoriteId) {
        try {
            console.log('WebView: 削除開始 - favoriteId:', favoriteId);

            const response = await new Promise((resolve, reject) => {
                browser.runtime.sendMessage(
                    {
                        action: 'deleteFavorite',
                        favoriteId: favoriteId
                    },
                    (response) => {
                        console.log('WebView: background からの応答:', response);
                        if (browser.runtime.lastError) {
                            console.error('WebView: runtime.lastError:', browser.runtime.lastError);
                            reject(new Error(browser.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    }
                );
            });

            if (response && response.success) {
                console.log('WebView: 削除成功、データ再読み込み開始');
                // データを再読み込み
                await this.loadData();
                console.log('WebView: データ再読み込み完了');
                alert('お気に入りを削除しました');
            } else {
                console.error('WebView: 削除失敗:', response);
                throw new Error(response?.error || '削除に失敗しました');
            }
        } catch (error) {
            console.error('削除エラー:', error);
            alert('削除中にエラーが発生しました: ' + error.message);
        }
    }

    showEditModal(favoriteId) {
        const favorite = this.allFavorites.find(fav => fav.id === favoriteId);
        if (!favorite) return;

        // モーダルを作成
        const modal = document.createElement('div');
        modal.className = 'edit-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>お気に入りを編集</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <form class="edit-form">
                    <div class="form-group">
                        <label for="edit-title">タイトル</label>
                        <input type="text" id="edit-title" value="${this.escapeHtml(favorite.title)}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-url">URL</label>
                        <input type="url" id="edit-url" value="${this.escapeHtml(favorite.url)}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-image-url">画像URL</label>
                        <input type="url" id="edit-image-url" value="${favorite.imageUrl || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-category">カテゴリー</label>
                        <select id="edit-category">
                            <option value="">カテゴリーを選択</option>
                            ${this.allCategories.map(cat =>
            `<option value="${this.escapeHtml(cat)}" ${cat === favorite.category ? 'selected' : ''}>${this.escapeHtml(cat)}</option>`
        ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="edit-new-category">新しいカテゴリー</label>
                        <input type="text" id="edit-new-category" placeholder="新しいカテゴリー名">
                    </div>
                    <div class="form-group">
                        <label>タグ</label>
                        <div class="tags-container">
                            <div class="selected-tags" id="edit-selected-tags">
                                ${favorite.tags.map(tag =>
            `<span class="selected-tag">${this.escapeHtml(tag)} <span class="remove-tag" data-tag="${this.escapeHtml(tag)}">&times;</span></span>`
        ).join('')}
                            </div>
                            <input type="text" id="edit-tags-input" placeholder="新しいタグを入力（Enterで追加）">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn primary">更新</button>
                        <button type="button" class="btn cancel-btn">キャンセル</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        this.setupEditModalEvents(modal, favoriteId, favorite.tags);
    }

    setupEditModalEvents(modal, favoriteId, originalTags) {
        let selectedTags = new Set(originalTags);

        // 閉じるボタン
        modal.querySelector('.close-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // モーダル外クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        // タグ削除
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-tag')) {
                const tag = e.target.dataset.tag;
                selectedTags.delete(tag);
                this.updateSelectedTagsDisplay(modal, selectedTags);
            }
        });

        // タグ追加
        const tagsInput = modal.querySelector('#edit-tags-input');
        tagsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const newTag = tagsInput.value.trim();
                if (newTag) {
                    selectedTags.add(newTag);
                    tagsInput.value = '';
                    this.updateSelectedTagsDisplay(modal, selectedTags);
                }
            }
        });

        // フォーム送信
        modal.querySelector('.edit-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateFavorite(modal, favoriteId, selectedTags);
        });
    }

    updateSelectedTagsDisplay(modal, selectedTags) {
        const container = modal.querySelector('#edit-selected-tags');
        container.innerHTML = Array.from(selectedTags).map(tag =>
            `<span class="selected-tag">${this.escapeHtml(tag)} <span class="remove-tag" data-tag="${this.escapeHtml(tag)}">&times;</span></span>`
        ).join('');
    }

    async updateFavorite(modal, favoriteId, selectedTags) {
        try {
            const title = modal.querySelector('#edit-title').value.trim();
            const url = modal.querySelector('#edit-url').value.trim();
            const imageUrl = modal.querySelector('#edit-image-url').value.trim();
            const selectedCategory = modal.querySelector('#edit-category').value;
            const newCategory = modal.querySelector('#edit-new-category').value.trim();

            if (!title || !url) {
                alert('タイトルとURLは必須です');
                return;
            }

            const category = newCategory || selectedCategory || null;
            const tags = Array.from(selectedTags);

            const response = await new Promise((resolve, reject) => {
                browser.runtime.sendMessage(
                    {
                        action: 'updateFavorite',
                        favoriteId: favoriteId,
                        data: {
                            title,
                            url,
                            imageUrl: imageUrl || null,
                            category,
                            tags
                        }
                    },
                    (response) => {
                        if (browser.runtime.lastError) {
                            reject(new Error(browser.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    }
                );
            });

            if (response && response.success) {
                document.body.removeChild(modal);
                await this.loadData();
                alert('お気に入りを更新しました');
            } else {
                throw new Error(response?.error || '更新に失敗しました');
            }
        } catch (error) {
            console.error('更新エラー:', error);
            alert('更新中にエラーが発生しました: ' + error.message);
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