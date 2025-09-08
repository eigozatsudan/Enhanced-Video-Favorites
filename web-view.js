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
        filterSelect.textContent = '';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '全カテゴリー';
        filterSelect.appendChild(defaultOption);

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
            container.textContent = '';
            const noFavDiv = document.createElement('div');
            noFavDiv.className = 'no-favorites';
            const h3 = document.createElement('h3');
            h3.textContent = 'お気に入りがありません';
            const p = document.createElement('p');
            p.textContent = '拡張機能のポップアップからお気に入りを追加してください';
            noFavDiv.appendChild(h3);
            noFavDiv.appendChild(p);
            container.appendChild(noFavDiv);
            this.updatePagination(0);
            return;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const itemsToShow = favorites.slice(0, endIndex);

        const fragment = document.createDocumentFragment();
        itemsToShow.forEach(favorite => {
            const cardElement = this.createFavoriteCard(favorite);
            fragment.appendChild(cardElement);
        });

        if (append) {
            container.appendChild(fragment);
        } else {
            container.textContent = '';
            container.appendChild(fragment);
        }

        // クリックイベントリスナーを追加
        this.addCardClickListeners(container);

        this.updatePagination(favorites.length);
        this.updateLoadingState(false);
    }

    createFavoriteCard(favorite) {
        const card = document.createElement('div');
        card.className = 'favorite-card';
        card.dataset.url = favorite.url;
        card.dataset.id = favorite.id;

        // Image section
        const imageDiv = document.createElement('div');
        imageDiv.className = 'favorite-image';

        if (favorite.imageUrl) {
            const img = document.createElement('img');
            img.src = favorite.imageUrl;
            img.alt = favorite.title;
            img.loading = 'lazy';
            img.onerror = function () {
                this.style.display = 'none';
                this.nextElementSibling.style.display = 'flex';
            };

            const fallback = document.createElement('div');
            fallback.className = 'image-fallback';
            fallback.style.display = 'none';
            fallback.textContent = '🔗';

            imageDiv.appendChild(img);
            imageDiv.appendChild(fallback);
        } else {
            const fallback = document.createElement('div');
            fallback.className = 'image-fallback';
            fallback.textContent = '🔗';
            imageDiv.appendChild(fallback);
        }

        // Content section
        const contentDiv = document.createElement('div');
        contentDiv.className = 'favorite-content';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'favorite-title';
        titleDiv.textContent = favorite.title;

        const urlDiv = document.createElement('div');
        urlDiv.className = 'favorite-url';
        urlDiv.textContent = favorite.url;

        const metaDiv = document.createElement('div');
        metaDiv.className = 'favorite-meta';
        let metaText = '';
        if (favorite.category) {
            metaText += `カテゴリー: ${favorite.category} | `;
        }
        metaText += new Date(favorite.timestamp).toLocaleDateString();
        metaDiv.textContent = metaText;

        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'favorite-tags';
        favorite.tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag';
            tagSpan.textContent = tag;
            tagsDiv.appendChild(tagSpan);
        });

        contentDiv.appendChild(titleDiv);
        contentDiv.appendChild(urlDiv);
        contentDiv.appendChild(metaDiv);
        contentDiv.appendChild(tagsDiv);

        // Actions section
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'favorite-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn edit-btn';
        editBtn.dataset.id = favorite.id;
        editBtn.textContent = '編集';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete-btn';
        deleteBtn.dataset.id = favorite.id;
        deleteBtn.textContent = '削除';

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);

        // Assemble card
        card.appendChild(imageDiv);
        card.appendChild(contentDiv);
        card.appendChild(actionsDiv);

        return card;
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
                return; // 成功した場合はここで終了
            }
        } catch (error) {
            console.error('browser.tabs.createでエラー:', error);
        }

        // browser APIが利用できない場合、またはエラーの場合のフォールバック
        window.open(url, '_blank');
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

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        // Header
        const header = document.createElement('div');
        header.className = 'modal-header';
        const h3 = document.createElement('h3');
        h3.textContent = 'お気に入りを編集';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.textContent = '×';
        header.appendChild(h3);
        header.appendChild(closeBtn);

        // Form
        const form = document.createElement('form');
        form.className = 'edit-form';

        // Title field
        const titleGroup = document.createElement('div');
        titleGroup.className = 'form-group';
        const titleLabel = document.createElement('label');
        titleLabel.setAttribute('for', 'edit-title');
        titleLabel.textContent = 'タイトル';
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.id = 'edit-title';
        titleInput.value = favorite.title;
        titleInput.required = true;
        titleGroup.appendChild(titleLabel);
        titleGroup.appendChild(titleInput);

        // URL field
        const urlGroup = document.createElement('div');
        urlGroup.className = 'form-group';
        const urlLabel = document.createElement('label');
        urlLabel.setAttribute('for', 'edit-url');
        urlLabel.textContent = 'URL';
        const urlInput = document.createElement('input');
        urlInput.type = 'url';
        urlInput.id = 'edit-url';
        urlInput.value = favorite.url;
        urlInput.required = true;
        urlGroup.appendChild(urlLabel);
        urlGroup.appendChild(urlInput);

        // Image URL field
        const imageGroup = document.createElement('div');
        imageGroup.className = 'form-group';
        const imageLabel = document.createElement('label');
        imageLabel.setAttribute('for', 'edit-image-url');
        imageLabel.textContent = '画像URL';
        const imageInput = document.createElement('input');
        imageInput.type = 'url';
        imageInput.id = 'edit-image-url';
        imageInput.value = favorite.imageUrl || '';
        imageGroup.appendChild(imageLabel);
        imageGroup.appendChild(imageInput);

        // Category field
        const categoryGroup = document.createElement('div');
        categoryGroup.className = 'form-group';
        const categoryLabel = document.createElement('label');
        categoryLabel.setAttribute('for', 'edit-category');
        categoryLabel.textContent = 'カテゴリー';
        const categorySelect = document.createElement('select');
        categorySelect.id = 'edit-category';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'カテゴリーを選択';
        categorySelect.appendChild(defaultOption);
        this.allCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            if (cat === favorite.category) option.selected = true;
            categorySelect.appendChild(option);
        });
        categoryGroup.appendChild(categoryLabel);
        categoryGroup.appendChild(categorySelect);

        // New category field
        const newCategoryGroup = document.createElement('div');
        newCategoryGroup.className = 'form-group';
        const newCategoryLabel = document.createElement('label');
        newCategoryLabel.setAttribute('for', 'edit-new-category');
        newCategoryLabel.textContent = '新しいカテゴリー';
        const newCategoryInput = document.createElement('input');
        newCategoryInput.type = 'text';
        newCategoryInput.id = 'edit-new-category';
        newCategoryInput.placeholder = '新しいカテゴリー名';
        newCategoryGroup.appendChild(newCategoryLabel);
        newCategoryGroup.appendChild(newCategoryInput);

        // Tags field
        const tagsGroup = document.createElement('div');
        tagsGroup.className = 'form-group';
        const tagsLabel = document.createElement('label');
        tagsLabel.textContent = 'タグ';
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'tags-container';
        const selectedTags = document.createElement('div');
        selectedTags.className = 'selected-tags';
        selectedTags.id = 'edit-selected-tags';
        favorite.tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'selected-tag';
            tagSpan.textContent = tag + ' ';
            const removeSpan = document.createElement('span');
            removeSpan.className = 'remove-tag';
            removeSpan.dataset.tag = tag;
            removeSpan.textContent = '×';
            tagSpan.appendChild(removeSpan);
            selectedTags.appendChild(tagSpan);
        });
        const tagsInput = document.createElement('input');
        tagsInput.type = 'text';
        tagsInput.id = 'edit-tags-input';
        tagsInput.placeholder = '新しいタグを入力（Enterで追加）';
        tagsContainer.appendChild(selectedTags);
        tagsContainer.appendChild(tagsInput);
        tagsGroup.appendChild(tagsLabel);
        tagsGroup.appendChild(tagsContainer);

        // Actions
        const actionsGroup = document.createElement('div');
        actionsGroup.className = 'form-actions';
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'btn primary';
        submitBtn.textContent = '更新';
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn cancel-btn';
        cancelBtn.textContent = 'キャンセル';
        actionsGroup.appendChild(submitBtn);
        actionsGroup.appendChild(cancelBtn);

        // Assemble form
        form.appendChild(titleGroup);
        form.appendChild(urlGroup);
        form.appendChild(imageGroup);
        form.appendChild(categoryGroup);
        form.appendChild(newCategoryGroup);
        form.appendChild(tagsGroup);
        form.appendChild(actionsGroup);

        // Assemble modal
        modalContent.appendChild(header);
        modalContent.appendChild(form);
        modal.appendChild(modalContent);

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
        container.textContent = '';
        Array.from(selectedTags).forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'selected-tag';
            tagSpan.textContent = tag + ' ';
            const removeSpan = document.createElement('span');
            removeSpan.className = 'remove-tag';
            removeSpan.dataset.tag = tag;
            removeSpan.textContent = '×';
            tagSpan.appendChild(removeSpan);
            container.appendChild(tagSpan);
        });
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
        container.textContent = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'no-favorites';
        const h3 = document.createElement('h3');
        h3.textContent = 'エラーが発生しました';
        const p = document.createElement('p');
        p.textContent = message;
        const button = document.createElement('button');
        button.className = 'refresh-btn';
        button.textContent = '再読み込み';
        button.onclick = () => location.reload();
        errorDiv.appendChild(h3);
        errorDiv.appendChild(p);
        errorDiv.appendChild(button);
        container.appendChild(errorDiv);
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
        const container = document.getElementById('favorites-grid');
        container.textContent = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'no-favorites';
        const h3 = document.createElement('h3');
        h3.textContent = '拡張機能APIにアクセスできません';
        const p1 = document.createElement('p');
        p1.textContent = 'この画面は拡張機能のコンテキストで開く必要があります。';
        const p2 = document.createElement('p');
        p2.textContent = '拡張機能のポップアップから「Web画面で開く」ボタンを使用してください。';
        errorDiv.appendChild(h3);
        errorDiv.appendChild(p1);
        errorDiv.appendChild(p2);
        container.appendChild(errorDiv);
        return;
    }

    console.log('WebView: browser API が利用可能です');
    webViewer = new WebFavoritesViewer();

    // メッセージリスナーを追加（データ更新通知を受信）
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        console.log('WebView: メッセージ受信:', message);
        if (message.action === 'dataUpdated' && webViewer) {
            console.log('WebView: データ更新通知を受信、リロード開始');
            webViewer.loadData();
        }
        sendResponse({ success: true });
    });
});