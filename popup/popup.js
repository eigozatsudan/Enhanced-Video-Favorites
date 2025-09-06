class FavoritesManager {
    constructor() {
        this.init();
    }

    async init() {
        console.log('FavoritesManager初期化開始');

        // データ整合性チェック
        await this.checkDataIntegrity();

        this.selectedTags = new Set();
        this.editingFavoriteId = null;
        this.editSelectedTags = new Set();
        this.setupEventListeners();
        await this.loadCategories();
        await this.loadTags();
        await this.loadFavorites();
        console.log('FavoritesManager初期化完了');
    }

    // データ整合性チェックと復旧
    async checkDataIntegrity() {
        try {
            const result = await browser.storage.local.get(['favorites', 'categories', 'backups']);

            // データが破損している場合の復旧処理
            if (!result.favorites || !Array.isArray(result.favorites)) {
                console.warn('お気に入りデータが破損しています。復旧を試行します。');

                // バックアップから復旧を試行
                if (result.backups && result.backups.length > 0) {
                    const latestBackup = result.backups[0];
                    await browser.storage.local.set({
                        favorites: latestBackup.favorites || [],
                        categories: latestBackup.categories || []
                    });
                    console.log('バックアップからデータを復旧しました');
                } else {
                    // バックアップがない場合は空の配列で初期化
                    await browser.storage.local.set({
                        favorites: [],
                        categories: []
                    });
                    console.log('データを初期化しました');
                }
            }

            // 冗長化のため、重要なデータを複数の場所に保存
            await this.createRedundantBackup();

        } catch (error) {
            console.error('データ整合性チェックエラー:', error);
        }
    }

    // 冗長化バックアップ作成
    async createRedundantBackup() {
        try {
            const result = await browser.storage.local.get(['favorites', 'categories']);
            const redundantData = {
                favorites: result.favorites || [],
                categories: result.categories || [],
                timestamp: new Date().toISOString()
            };

            // 複数のキーに同じデータを保存（冗長化）
            await browser.storage.local.set({
                'favorites_backup_1': redundantData,
                'favorites_backup_2': redundantData,
                'favorites_backup_3': redundantData
            });
        } catch (error) {
            console.error('冗長化バックアップエラー:', error);
        }
    }

    setupEventListeners() {
        // タブ切り替え
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // 現在のページ追加ボタン
        document.getElementById('add-current-btn').addEventListener('click', () => {
            this.addCurrentPage();
        });

        // 現在のページ（アンカーなし）追加ボタン
        document.getElementById('add-current-clean-btn').addEventListener('click', () => {
            this.addCurrentPageClean();
        });

        // 手動URL追加ボタン
        document.getElementById('add-manual-btn').addEventListener('click', () => {
            this.addManualUrl();
        });

        // Web画面で開くボタン
        document.getElementById('open-web-view-btn').addEventListener('click', () => {
            this.openWebView();
        });

        // 編集フォームボタン
        document.getElementById('update-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.updateFavorite();
        });

        document.getElementById('cancel-edit-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.cancelEdit();
        });

        // フォームボタン
        const saveBtn = document.getElementById('save-btn');
        const cancelBtn = document.getElementById('cancel-btn');

        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('保存ボタンがクリックされました');
                this.saveFavorite();
            });
        } else {
            console.error('保存ボタンが見つかりません');
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('キャンセルボタンがクリックされました');
                this.cancelAdd();
            });
        } else {
            console.error('キャンセルボタンが見つかりません');
        }

        // 検索とフィルター
        document.getElementById('search').addEventListener('input', () => {
            this.filterFavorites();
        });

        document.getElementById('filter-category').addEventListener('change', () => {
            this.filterFavorites();
        });

        // バックアップ・復元機能
        const exportBtn = document.getElementById('export-btn');
        const importBtn = document.getElementById('import-btn');
        const importFile = document.getElementById('import-file');
        const backupBtn = document.getElementById('backup-btn');
        const restoreBtn = document.getElementById('restore-btn');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => {
                importFile.click();
            });

            importFile.addEventListener('change', (e) => {
                this.importData(e.target.files[0]);
            });
        }

        if (backupBtn) {
            backupBtn.addEventListener('click', () => {
                this.createBackup();
            });
        }

        if (restoreBtn) {
            restoreBtn.addEventListener('click', () => {
                this.restoreFromBackup();
            });
        }



        // タグ入力のイベントリスナー
        const tagsInput = document.getElementById('tags');
        if (tagsInput) {
            tagsInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    this.addTagFromInput();
                }
            });

            tagsInput.addEventListener('blur', () => {
                this.addTagFromInput();
            });
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    async addCurrentPage() {
        try {
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

            // フォームを表示
            this.showAddForm();
            document.getElementById('title').value = tab.title || '';
            document.getElementById('url').value = tab.url || '';
        } catch (error) {
            console.error('現在のページ追加エラー:', error);
        }
    }

    async addCurrentPageClean() {
        try {
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

            // URLからアンカー（#以降）を削除
            let cleanUrl = tab.url || '';
            const hashIndex = cleanUrl.indexOf('#');
            if (hashIndex !== -1) {
                cleanUrl = cleanUrl.substring(0, hashIndex);
            }

            // フォームを表示
            this.showAddForm();
            document.getElementById('title').value = tab.title || '';
            document.getElementById('url').value = cleanUrl;
        } catch (error) {
            console.error('現在のページ（アンカーなし）追加エラー:', error);
        }
    }

    addManualUrl() {
        // フォームを表示
        this.showAddForm();
        document.getElementById('title').value = '';
        document.getElementById('url').value = '';
        document.getElementById('url').focus();
    }

    showAddForm() {
        // 追加タブに切り替え
        this.switchTab('add');
        // フォームを表示
        document.getElementById('add-form').classList.remove('hidden');
        document.getElementById('add-placeholder').style.display = 'none';
    }

    async saveFavorite() {
        try {
            console.log('saveFavorite メソッド開始');

            const titleElement = document.getElementById('title');
            const urlElement = document.getElementById('url');
            const imageUrlElement = document.getElementById('image-url');
            const categoryElement = document.getElementById('category');
            const newCategoryElement = document.getElementById('new-category');
            const tagsElement = document.getElementById('tags');

            console.log('フォーム要素の確認:', {
                titleElement: !!titleElement,
                urlElement: !!urlElement,
                imageUrlElement: !!imageUrlElement,
                categoryElement: !!categoryElement,
                newCategoryElement: !!newCategoryElement,
                tagsElement: !!tagsElement
            });

            if (!titleElement || !urlElement) {
                console.error('必要なフォーム要素が見つかりません');
                alert('フォーム要素が見つかりません。ページを再読み込みしてください。');
                return;
            }

            const title = titleElement.value;
            const url = urlElement.value;
            const imageUrl = imageUrlElement ? imageUrlElement.value : '';
            const category = (categoryElement ? categoryElement.value : '') || (newCategoryElement ? newCategoryElement.value : '');

            // 選択されたタグと入力されたタグを結合
            const inputTags = tagsElement ? tagsElement.value.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
            inputTags.forEach(tag => this.selectedTags.add(tag));
            const tags = Array.from(this.selectedTags);

            console.log('保存開始:', { title, url, imageUrl, category, tags });

            if (!title || !url) {
                alert('タイトルとURLが必要です');
                return;
            }

            // URLの形式チェック
            try {
                new URL(url);
            } catch (e) {
                alert('有効なURLを入力してください');
                return;
            }

            // 画像URLの形式チェック（入力されている場合のみ）
            if (imageUrl) {
                try {
                    new URL(imageUrl);
                } catch (e) {
                    alert('有効な画像URLを入力してください');
                    return;
                }
            }

            const favorite = {
                id: Date.now().toString(),
                title,
                category,
                tags,
                url: url,
                imageUrl: imageUrl || null,
                timestamp: new Date().toISOString()
            };

            console.log('作成されたお気に入り:', favorite);

            // ストレージに保存
            const result = await browser.storage.local.get(['favorites', 'categories', 'allTags']);
            const favorites = result.favorites || [];
            const categories = result.categories || [];
            const allTags = result.allTags || [];

            favorites.push(favorite);

            if (category && !categories.includes(category)) {
                categories.push(category);
            }

            // 新しいタグを全タグリストに追加
            tags.forEach(tag => {
                if (!allTags.includes(tag)) {
                    allTags.push(tag);
                }
            });

            console.log('保存前のデータ:', { favorites, categories, allTags });

            await browser.storage.local.set({ favorites, categories, allTags });

            console.log('保存完了');

            // 自動バックアップ実行
            await this.autoBackup();

            // 保存後の確認
            const verifyResult = await browser.storage.local.get(['favorites']);
            console.log('保存後の確認:', verifyResult.favorites);

            this.cancelAdd();
            await this.loadCategories();
            await this.loadTags();
            await this.loadFavorites();
            this.switchTab('list');

            // WebViewに更新通知を送信
            this.notifyWebViewUpdate();
        } catch (error) {
            console.error('保存エラー:', error);
            alert('保存中にエラーが発生しました: ' + error.message);
        }
    }

    cancelAdd() {
        document.getElementById('add-form').classList.add('hidden');
        document.getElementById('add-placeholder').style.display = 'block';
        document.getElementById('title').value = '';
        document.getElementById('url').value = '';
        document.getElementById('image-url').value = '';
        document.getElementById('new-category').value = '';
        document.getElementById('tags').value = '';

        // タグ選択をリセット
        this.selectedTags.clear();
        this.updateSelectedTagsDisplay();
        this.updateExistingTagsDisplay();
    }

    async loadCategories() {
        const result = await browser.storage.local.get(['categories']);
        const categories = result.categories || [];

        const categorySelect = document.getElementById('category');
        const filterSelect = document.getElementById('filter-category');

        // カテゴリー選択肢をクリア
        categorySelect.textContent = '';
        const defaultOption1 = document.createElement('option');
        defaultOption1.value = '';
        defaultOption1.textContent = 'カテゴリーを選択';
        categorySelect.appendChild(defaultOption1);

        filterSelect.textContent = '';
        const defaultOption2 = document.createElement('option');
        defaultOption2.value = '';
        defaultOption2.textContent = '全カテゴリー';
        filterSelect.appendChild(defaultOption2);

        categories.forEach(category => {
            const option1 = new Option(category, category);
            const option2 = new Option(category, category);
            categorySelect.appendChild(option1);
            filterSelect.appendChild(option2);
        });
    }

    async loadTags() {
        const result = await browser.storage.local.get(['allTags']);
        const allTags = result.allTags || [];

        const existingTagsContainer = document.getElementById('existing-tags');
        if (!existingTagsContainer) return;

        existingTagsContainer.textContent = '';

        if (allTags.length === 0) {
            const span = document.createElement('span');
            span.style.color = '#999';
            span.style.fontSize = '11px';
            span.textContent = 'まだタグがありません';
            existingTagsContainer.appendChild(span);
            return;
        }

        allTags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'existing-tag';
            tagElement.textContent = tag;
            tagElement.addEventListener('click', () => {
                this.toggleTag(tag);
            });
            existingTagsContainer.appendChild(tagElement);
        });
    }

    toggleTag(tag) {
        if (this.selectedTags.has(tag)) {
            this.selectedTags.delete(tag);
        } else {
            this.selectedTags.add(tag);
        }
        this.updateSelectedTagsDisplay();
        this.updateExistingTagsDisplay();
    }

    addTagFromInput() {
        const tagsInput = document.getElementById('tags');
        if (!tagsInput) return;

        const inputValue = tagsInput.value.trim();
        if (!inputValue) return;

        const newTags = inputValue.split(',').map(tag => tag.trim()).filter(tag => tag);
        newTags.forEach(tag => {
            if (tag) {
                this.selectedTags.add(tag);
            }
        });

        tagsInput.value = '';
        this.updateSelectedTagsDisplay();
    }

    updateSelectedTagsDisplay() {
        const selectedTagsContainer = document.getElementById('selected-tags');
        if (!selectedTagsContainer) return;

        selectedTagsContainer.textContent = '';

        this.selectedTags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'selected-tag';
            tagElement.textContent = tag + ' ';

            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-tag';
            removeBtn.dataset.tag = tag;
            removeBtn.textContent = '×';
            tagElement.appendChild(removeBtn);
            removeBtn.addEventListener('click', () => {
                this.selectedTags.delete(tag);
                this.updateSelectedTagsDisplay();
                this.updateExistingTagsDisplay();
            });

            selectedTagsContainer.appendChild(tagElement);
        });
    }

    updateExistingTagsDisplay() {
        const existingTags = document.querySelectorAll('.existing-tag');
        existingTags.forEach(tagElement => {
            const tag = tagElement.textContent;
            if (this.selectedTags.has(tag)) {
                tagElement.classList.add('selected');
            } else {
                tagElement.classList.remove('selected');
            }
        });
    }

    async loadFavorites() {
        const result = await browser.storage.local.get(['favorites']);
        const favorites = result.favorites || [];

        console.log('ロードされたお気に入り:', favorites);

        // 追加日時順（新しい順）にソートして最新10件のみ表示
        const sortedFavorites = favorites.sort((a, b) => {
            const timeA = new Date(a.timestamp || a.id).getTime();
            const timeB = new Date(b.timestamp || b.id).getTime();
            return timeB - timeA; // 新しい順
        });

        this.allFavorites = sortedFavorites;
        this.displayFavorites(sortedFavorites.slice(0, 10));
    }

    displayFavorites(favorites) {
        const listContainer = document.getElementById('favorites-list');
        listContainer.textContent = '';

        if (favorites.length === 0) {
            const p = document.createElement('p');
            p.textContent = 'お気に入りがありません';
            listContainer.appendChild(p);
            return;
        }

        // 表示件数の情報を追加
        if (this.allFavorites.length > favorites.length) {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'favorites-info';
            const p = document.createElement('p');
            p.style.fontSize = '12px';
            p.style.color = '#666';
            p.style.marginBottom = '10px';
            p.textContent = `最新 ${favorites.length} 件を表示中（全 ${this.allFavorites.length} 件）`;
            infoDiv.appendChild(p);
            listContainer.appendChild(infoDiv);
        }

        favorites.forEach(favorite => {
            const item = document.createElement('div');
            item.className = 'favorite-item';

            // タイトルを10文字前後で切り落とし
            const truncatedTitle = this.truncateTitle(favorite.title, 10);

            // 画像表示部分
            let imageElement;
            if (favorite.imageUrl) {
                const imageDiv = document.createElement('div');
                imageDiv.className = 'favorite-image';
                const img = document.createElement('img');
                img.src = favorite.imageUrl;
                img.alt = favorite.title;
                img.onerror = function () {
                    this.style.display = 'none';
                    this.nextElementSibling.style.display = 'block';
                };
                const fallback = document.createElement('div');
                fallback.className = 'image-fallback';
                fallback.style.display = 'none';
                fallback.textContent = '🔗';
                imageDiv.appendChild(img);
                imageDiv.appendChild(fallback);
                imageElement = imageDiv;
            } else {
                const iconDiv = document.createElement('div');
                iconDiv.className = 'favorite-icon';
                iconDiv.textContent = '🔗';
                imageElement = iconDiv;
            }

            // 情報部分
            const infoDiv = document.createElement('div');
            infoDiv.className = 'favorite-info';

            const titleDiv = document.createElement('div');
            titleDiv.className = 'favorite-title';
            titleDiv.title = favorite.title;
            titleDiv.textContent = truncatedTitle;

            const urlDiv = document.createElement('div');
            urlDiv.className = 'favorite-url';
            urlDiv.textContent = favorite.url;

            const metaDiv = document.createElement('div');
            metaDiv.className = 'favorite-meta';
            let metaText = '';
            if (favorite.category) {
                metaText += `カテゴリー: ${favorite.category}`;
            }
            if (favorite.category) {
                metaText += ' | ';
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

            infoDiv.appendChild(titleDiv);
            infoDiv.appendChild(urlDiv);
            infoDiv.appendChild(metaDiv);
            infoDiv.appendChild(tagsDiv);

            // アクション部分
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'favorite-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.dataset.id = favorite.id;
            editBtn.textContent = '編集';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.dataset.id = favorite.id;
            deleteBtn.textContent = '削除';

            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);

            // アイテムを組み立て
            item.appendChild(imageElement);
            item.appendChild(infoDiv);
            item.appendChild(actionsDiv);

            // クリックでページを開く
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-btn') && !e.target.classList.contains('edit-btn')) {
                    browser.tabs.create({ url: favorite.url });
                }
            });

            // 編集ボタンのイベントリスナーを追加
            editBtn.addEventListener('click', (e) => {
                console.log('編集ボタンがクリックされました:', favorite.id);
                e.stopPropagation();
                this.editFavorite(favorite.id);
            });

            // 削除ボタン
            item.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteFavorite(favorite.id);
            });

            listContainer.appendChild(item);
        });
    }

    async deleteFavorite(id) {
        if (!confirm('このお気に入りを削除しますか？')) return;

        const result = await browser.storage.local.get(['favorites']);
        const favorites = result.favorites || [];
        const updatedFavorites = favorites.filter(fav => fav.id !== id);

        await browser.storage.local.set({ favorites: updatedFavorites });
        await this.loadFavorites();

        // WebViewに更新通知を送信
        this.notifyWebViewUpdate();
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
                fav.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            );
        }

        // フィルター結果も最新10件に制限
        this.displayFavorites(filtered.slice(0, 10));
    }

    // Web画面で開く
    async openWebView() {
        try {
            const webViewUrl = browser.runtime.getURL('web-view.html');

            // 既存のWebViewタブを検索
            const tabs = await browser.tabs.query({});
            const existingTab = tabs.find(tab => tab.url === webViewUrl);

            if (existingTab) {
                // 既存のタブがある場合はそのタブに移動
                await browser.tabs.update(existingTab.id, { active: true });
                await browser.windows.update(existingTab.windowId, { focused: true });
                console.log('既存のWebViewタブに移動しました');
            } else {
                // 既存のタブがない場合は新しいタブを作成
                await browser.tabs.create({ url: webViewUrl });
                console.log('新しいWebViewタブを作成しました');
            }
        } catch (error) {
            console.error('WebView開くエラー:', error);
            // エラーの場合は従来通り新しいタブを作成
            const webViewUrl = browser.runtime.getURL('web-view.html');
            browser.tabs.create({ url: webViewUrl });
        }
    }

    // WebViewに更新通知を送信
    async notifyWebViewUpdate() {
        try {
            // 開いているタブを検索してWebViewタブに更新通知を送信
            const tabs = await browser.tabs.query({});
            const webViewUrl = browser.runtime.getURL('web-view.html');

            tabs.forEach(tab => {
                if (tab.url === webViewUrl) {
                    browser.tabs.sendMessage(tab.id, { action: 'dataUpdated' }).catch(() => {
                        // エラーは無視（タブが閉じられている場合など）
                    });
                }
            });
        } catch (error) {
            console.log('WebView更新通知エラー:', error);
        }
    }

    // お気に入りを編集
    editFavorite(id) {
        try {
            console.log('editFavoriteメソッドが呼び出されました:', id);
            console.log('allFavorites:', this.allFavorites);
            const favorite = this.allFavorites.find(fav => fav.id === id);
            if (!favorite) {
                console.error('編集対象のお気に入りが見つかりません:', id);
                console.error('利用可能なID:', this.allFavorites.map(f => f.id));
                return;
            }
            console.log('編集対象のお気に入り:', favorite);

            // 編集フォームに値を設定
            const editTitleEl = document.getElementById('edit-title');
            const editUrlEl = document.getElementById('edit-url');
            const editImageUrlEl = document.getElementById('edit-image-url');

            if (!editTitleEl || !editUrlEl || !editImageUrlEl) {
                console.error('編集フォーム要素が見つかりません');
                return;
            }

            editTitleEl.value = favorite.title || '';
            editUrlEl.value = favorite.url || '';
            editImageUrlEl.value = favorite.imageUrl || '';

            // カテゴリーを設定
            const editCategorySelect = document.getElementById('edit-category');
            editCategorySelect.value = favorite.category || '';

            // タグを設定
            this.editingFavoriteId = id;
            this.editSelectedTags = new Set(favorite.tags || []);

            // 編集用のカテゴリーとタグを読み込み
            this.loadEditCategories();
            this.loadEditTags();
            this.updateEditSelectedTags();

            // 編集タブを表示して切り替え
            const editTabBtn = document.querySelector('[data-tab="edit"]');
            editTabBtn.style.display = 'block';
            this.switchTab('edit');

        } catch (error) {
            console.error('editFavoriteエラー:', error);
            alert('編集画面の表示中にエラーが発生しました: ' + error.message);
        }
    }

    // 編集をキャンセル
    cancelEdit() {
        this.editingFavoriteId = null;
        this.editSelectedTags = new Set();
        document.querySelector('[data-tab="edit"]').style.display = 'none';
        this.switchTab('list');
    }

    // お気に入りを更新
    async updateFavorite() {
        try {
            if (!this.editingFavoriteId) {
                console.error('編集中のお気に入りIDが設定されていません');
                return;
            }

            const title = document.getElementById('edit-title').value.trim();
            const url = document.getElementById('edit-url').value.trim();
            const imageUrl = document.getElementById('edit-image-url').value.trim();
            const selectedCategory = document.getElementById('edit-category').value;
            const newCategory = document.getElementById('edit-new-category').value.trim();
            const newTagsInput = document.getElementById('edit-tags').value.trim();

            if (!title || !url) {
                alert('タイトルとURLは必須です');
                return;
            }

            // カテゴリーの決定
            let category = selectedCategory;
            if (newCategory) {
                category = newCategory;
                // 新しいカテゴリーを追加
                if (!this.allCategories.includes(newCategory)) {
                    this.allCategories.push(newCategory);
                    await browser.storage.local.set({ categories: this.allCategories });
                }
            }

            // タグの処理
            const tags = Array.from(this.editSelectedTags);
            if (newTagsInput) {
                const newTags = newTagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
                newTags.forEach(tag => {
                    if (!tags.includes(tag)) {
                        tags.push(tag);
                    }
                });
            }

            // お気に入りを更新
            const result = await browser.storage.local.get(['favorites']);
            const favorites = result.favorites || [];
            const favoriteIndex = favorites.findIndex(fav => fav.id === this.editingFavoriteId);

            if (favoriteIndex === -1) {
                console.error('更新対象のお気に入りが見つかりません');
                return;
            }

            favorites[favoriteIndex] = {
                ...favorites[favoriteIndex],
                title,
                url,
                imageUrl: imageUrl || null,
                category: category || null,
                tags,
                updatedAt: Date.now()
            };

            await browser.storage.local.set({ favorites });

            // 全タグリストを更新
            await this.updateAllTags();

            // 表示を更新
            this.cancelEdit();
            await this.loadCategories();
            await this.loadTags();
            await this.loadFavorites();

            // WebViewに更新通知を送信
            this.notifyWebViewUpdate();

            console.log('お気に入りが更新されました');
        } catch (error) {
            console.error('更新エラー:', error);
            alert('更新中にエラーが発生しました: ' + error.message);
        }
    }

    // 編集用カテゴリーを読み込み
    async loadEditCategories() {
        const categorySelect = document.getElementById('edit-category');
        categorySelect.textContent = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'カテゴリーを選択';
        categorySelect.appendChild(defaultOption);

        // allCategoriesが未定義の場合は読み込み
        if (!this.allCategories) {
            console.log('allCategoriesが未定義のため、データを読み込みます');
            await this.loadCategories();
        }

        if (this.allCategories && Array.isArray(this.allCategories)) {
            this.allCategories.forEach(category => {
                const option = new Option(category, category);
                categorySelect.appendChild(option);
            });
        } else {
            console.warn('allCategoriesが配列ではありません:', this.allCategories);
        }
    }

    // 編集用タグを読み込み
    async loadEditTags() {
        const container = document.getElementById('edit-existing-tags');
        container.textContent = '';

        // allTagsが未定義の場合は読み込み
        if (!this.allTags) {
            console.log('allTagsが未定義のため、データを読み込みます');
            await this.loadTags();
        }

        if (this.allTags && Array.isArray(this.allTags)) {
            this.allTags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'existing-tag';
                tagElement.textContent = tag;
                tagElement.addEventListener('click', () => {
                    if (this.editSelectedTags.has(tag)) {
                        this.editSelectedTags.delete(tag);
                    } else {
                        this.editSelectedTags.add(tag);
                    }
                    this.updateEditSelectedTags();
                });
                container.appendChild(tagElement);
            });
        } else {
            console.warn('allTagsが配列ではありません:', this.allTags);
        }
    }

    // 編集用選択済みタグを更新
    updateEditSelectedTags() {
        const container = document.getElementById('edit-selected-tags');
        container.textContent = '';

        this.editSelectedTags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'selected-tag';
            tagElement.textContent = tag + ' ';

            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-tag';
            removeBtn.dataset.tag = tag;
            removeBtn.textContent = '×';
            tagElement.appendChild(removeBtn);

            removeBtn.addEventListener('click', () => {
                this.editSelectedTags.delete(tag);
                this.updateEditSelectedTags();
            });

            container.appendChild(tagElement);
        });

        // 既存タグの表示を更新
        document.querySelectorAll('#edit-existing-tags .existing-tag').forEach(tagEl => {
            const tag = tagEl.textContent;
            if (this.editSelectedTags.has(tag)) {
                tagEl.classList.add('selected');
            } else {
                tagEl.classList.remove('selected');
            }
        });
    }

    // タイトルを指定文字数で切り落とし
    truncateTitle(title, maxLength) {
        if (!title) return '';

        if (title.length <= maxLength) {
            return title;
        }

        // 10文字前後で切り落とし、単語の境界を考慮
        let truncated = title.substring(0, maxLength);

        // 日本語の場合は単純に切り落とし
        if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(title)) {
            return truncated + '...';
        }

        // 英語の場合は単語境界を考慮
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > maxLength * 0.7) { // 70%以上の位置にスペースがある場合
            truncated = truncated.substring(0, lastSpace);
        }

        return truncated + '...';
    }

    // データエクスポート機能
    async exportData() {
        try {
            const result = await browser.storage.local.get(['favorites', 'categories']);
            const exportData = {
                favorites: result.favorites || [],
                categories: result.categories || [],
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const url = URL.createObjectURL(dataBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `favorites-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showBackupStatus('データをエクスポートしました', 'success');
        } catch (error) {
            console.error('エクスポートエラー:', error);
            this.showBackupStatus('エクスポートに失敗しました', 'error');
        }
    }

    // データインポート機能
    async importData(file) {
        if (!file) return;

        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            if (!importData.favorites || !Array.isArray(importData.favorites)) {
                throw new Error('無効なファイル形式です');
            }

            if (confirm('現在のデータを上書きしますか？（既存のデータは失われます）')) {
                await browser.storage.local.set({
                    favorites: importData.favorites,
                    categories: importData.categories || []
                });

                await this.loadCategories();
                await this.loadFavorites();
                this.showBackupStatus('データをインポートしました', 'success');
            }
        } catch (error) {
            console.error('インポートエラー:', error);
            this.showBackupStatus('インポートに失敗しました: ' + error.message, 'error');
        }
    }

    // 手動バックアップ作成
    async createBackup() {
        try {
            const result = await browser.storage.local.get(['favorites', 'categories']);
            const backupData = {
                favorites: result.favorites || [],
                categories: result.categories || [],
                backupDate: new Date().toISOString()
            };

            // 複数のバックアップを保持（最大5個）
            const backups = await browser.storage.local.get(['backups']);
            const existingBackups = backups.backups || [];

            existingBackups.unshift(backupData);
            if (existingBackups.length > 5) {
                existingBackups.splice(5);
            }

            await browser.storage.local.set({
                backups: existingBackups,
                lastBackup: new Date().toISOString()
            });

            this.showBackupStatus('バックアップを作成しました', 'success');
        } catch (error) {
            console.error('バックアップエラー:', error);
            this.showBackupStatus('バックアップに失敗しました', 'error');
        }
    }

    // バックアップから復元
    async restoreFromBackup() {
        try {
            const result = await browser.storage.local.get(['backups']);
            const backups = result.backups || [];

            if (backups.length === 0) {
                this.showBackupStatus('利用可能なバックアップがありません', 'error');
                return;
            }

            const latestBackup = backups[0];
            const backupDate = new Date(latestBackup.backupDate).toLocaleString();

            if (confirm(`${backupDate}のバックアップから復元しますか？`)) {
                await browser.storage.local.set({
                    favorites: latestBackup.favorites,
                    categories: latestBackup.categories
                });

                await this.loadCategories();
                await this.loadFavorites();
                this.showBackupStatus('バックアップから復元しました', 'success');
            }
        } catch (error) {
            console.error('復元エラー:', error);
            this.showBackupStatus('復元に失敗しました', 'error');
        }
    }

    // 自動バックアップ（データ保存時に実行）
    async autoBackup() {
        try {
            const result = await browser.storage.local.get(['lastAutoBackup']);
            const lastBackup = result.lastAutoBackup;
            const now = new Date();

            // 24時間以上経過している場合のみ自動バックアップ
            if (!lastBackup || (now - new Date(lastBackup)) > 24 * 60 * 60 * 1000) {
                await this.createBackup();
                await browser.storage.local.set({ lastAutoBackup: now.toISOString() });
                console.log('自動バックアップを実行しました');
            }
        } catch (error) {
            console.error('自動バックアップエラー:', error);
        }
    }

    // バックアップステータス表示
    showBackupStatus(message, type) {
        const statusDiv = document.getElementById('backup-status');
        statusDiv.textContent = message;
        statusDiv.className = `backup-status ${type}`;

        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'backup-status';
        }, 3000);
    }


}

// グローバルマネージャーインスタンス
let globalManager = null;

// 初期化
console.log('popup.js が読み込まれました');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded イベント発生');
    globalManager = new FavoritesManager();
});