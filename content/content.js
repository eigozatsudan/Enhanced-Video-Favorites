// コンテンツスクリプト - お気に入り登録済みページの表示
class FavoriteIndicator {
    constructor() {
        this.currentUrl = window.location.href;
        this.cleanUrl = this.getCleanUrl(this.currentUrl);
        this.indicator = null;
        this.init();
    }

    async init() {
        console.log('FavoriteIndicator初期化開始:', this.currentUrl);
        
        // ページが完全に読み込まれるまで待機
        if (document.readyState === 'loading') {
            console.log('ページ読み込み中 - DOMContentLoadedを待機');
            document.addEventListener('DOMContentLoaded', () => {
                console.log('DOMContentLoaded - インジケーターチェック開始');
                this.checkAndShowIndicator();
            });
        } else {
            console.log('ページ読み込み完了 - 即座にインジケーターチェック開始');
            this.checkAndShowIndicator();
        }

        // 少し遅延してもう一度チェック（拡張機能の初期化待ち）
        setTimeout(() => {
            console.log('遅延チェック実行');
            this.checkAndShowIndicator();
        }, 1000);

        // URL変更を監視（SPAサイト対応）
        this.observeUrlChanges();
    }

    // URLからアンカーやクエリパラメータを除去
    getCleanUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.origin + urlObj.pathname;
        } catch (e) {
            return url.split('#')[0].split('?')[0];
        }
    }

    // お気に入りに登録されているかチェック
    async checkFavoriteStatus() {
        try {
            console.log('お気に入りステータスチェック開始:', this.currentUrl);
            
            const response = await browser.runtime.sendMessage({
                action: 'checkFavoriteStatus',
                url: this.currentUrl
            });

            console.log('お気に入りステータス応答:', response);

            if (response && response.success) {
                const status = {
                    isFavorite: response.isFavorite,
                    exactMatch: response.exactMatch,
                    cleanMatch: response.cleanMatch,
                    favoriteData: response.favoriteData
                };
                console.log('お気に入りステータス結果:', status);
                return status;
            }
        } catch (error) {
            console.error('お気に入りステータスチェックエラー:', error);
        }

        console.log('お気に入りステータス: 未登録');
        return { isFavorite: false, exactMatch: false, cleanMatch: false, favoriteData: null };
    }

    // インジケーターを表示
    async checkAndShowIndicator() {
        console.log('checkAndShowIndicator開始');
        const status = await this.checkFavoriteStatus();

        console.log('お気に入りステータス判定:', status.isFavorite);

        if (status.isFavorite) {
            console.log('お気に入り登録済み - インジケーター表示');
            this.showIndicator(status);
            this.updateFavicon(true);
            this.updatePageTitle(true);
        } else {
            console.log('お気に入り未登録 - インジケーター非表示');
            this.hideIndicator();
            this.updateFavicon(false);
            this.updatePageTitle(false);
        }
    }

    // ファビコンにお気に入りマークを追加
    updateFavicon(isFavorite) {
        try {
            if (!isFavorite) return;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 32;
            canvas.height = 32;

            // 既存のファビコンを取得
            const favicon = document.querySelector('link[rel*="icon"]');
            const faviconUrl = favicon ? favicon.href : '/favicon.ico';

            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                // 既存のファビコンを描画
                ctx.drawImage(img, 0, 0, 32, 32);

                // お気に入りマーク（星）を右上に追加
                ctx.font = '16px Arial';
                ctx.fillStyle = '#FFD700';
                ctx.strokeStyle = '#FF6B00';
                ctx.lineWidth = 1;
                ctx.fillText('⭐', 18, 16);
                ctx.strokeText('⭐', 18, 16);

                // 新しいファビコンを設定
                const newFaviconUrl = canvas.toDataURL('image/png');
                this.setFavicon(newFaviconUrl);
            };

            img.onerror = () => {
                // 既存のファビコンが読み込めない場合は星だけ表示
                ctx.fillStyle = '#4CAF50';
                ctx.fillRect(0, 0, 32, 32);
                ctx.font = '20px Arial';
                ctx.fillStyle = '#FFD700';
                ctx.fillText('⭐', 6, 22);

                const newFaviconUrl = canvas.toDataURL('image/png');
                this.setFavicon(newFaviconUrl);
            };

            img.src = faviconUrl;
        } catch (error) {
            console.log('ファビコン更新エラー:', error);
        }
    }

    // ファビコンを設定
    setFavicon(url) {
        // 既存のファビコンを削除
        const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
        existingFavicons.forEach(favicon => favicon.remove());

        // 新しいファビコンを追加
        const newFavicon = document.createElement('link');
        newFavicon.rel = 'icon';
        newFavicon.type = 'image/png';
        newFavicon.href = url;
        document.head.appendChild(newFavicon);
    }

    // ページタイトルにお気に入りマークを追加
    updatePageTitle(isFavorite) {
        try {
            const title = document.title;

            if (isFavorite && !title.startsWith('⭐ ')) {
                document.title = '⭐ ' + title;
            } else if (!isFavorite && title.startsWith('⭐ ')) {
                document.title = title.substring(2);
            }
        } catch (error) {
            console.log('タイトル更新エラー:', error);
        }
    }

    // お気に入りインジケーターを表示
    showIndicator(status) {
        console.log('showIndicator開始:', status);
        
        // 既存のインジケーターを削除
        this.hideIndicator();

        // お気に入りデータから情報を取得
        const favoriteData = status.favoriteData;
        const hasCategory = favoriteData && favoriteData.category;
        const hasTags = favoriteData && favoriteData.tags && favoriteData.tags.length > 0;
        
        console.log('お気に入りデータ:', {
            favoriteData: favoriteData,
            hasCategory: hasCategory,
            hasTags: hasTags
        });

        // インジケーター要素を作成
        this.indicator = document.createElement('div');
        this.indicator.id = 'favorite-indicator';

        // ヘッダー部分を作成
        const header = document.createElement('div');
        header.className = 'favorite-header';
        
        const icon = document.createElement('div');
        icon.className = 'favorite-icon';
        icon.textContent = '⭐';
        
        const mainText = document.createElement('div');
        mainText.className = 'favorite-main-text';
        mainText.textContent = 'お気に入り登録済み';
        
        header.appendChild(icon);
        header.appendChild(mainText);
        this.indicator.appendChild(header);

        // 詳細情報を追加
        if (favoriteData) {
            const details = document.createElement('div');
            details.className = 'favorite-details';
            
            if (hasCategory) {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'favorite-category';
                categoryDiv.textContent = `📁 ${favoriteData.category}`;
                details.appendChild(categoryDiv);
            }
            
            if (hasTags) {
                const tagsDiv = document.createElement('div');
                tagsDiv.className = 'favorite-tags';
                const tagsText = favoriteData.tags.slice(0, 3).join(', ');
                const moreTagsText = favoriteData.tags.length > 3 ? ` +${favoriteData.tags.length - 3}` : '';
                tagsDiv.textContent = `🏷️ ${tagsText}${moreTagsText}`;
                details.appendChild(tagsDiv);
            }
            
            this.indicator.appendChild(details);
        }

        if (!status.exactMatch) {
            const note = document.createElement('div');
            note.className = 'favorite-note';
            note.textContent = '（類似URL）';
            this.indicator.appendChild(note);
        }

        // スタイルを適用
        this.applyIndicatorStyles();

        // ページに追加
        console.log('インジケーターをページに追加:', this.indicator);
        document.body.appendChild(this.indicator);
        console.log('インジケーター追加完了 - DOM要素:', document.getElementById('favorite-indicator'));

        // 5秒後に透明度を下げる
        setTimeout(() => {
            if (this.indicator) {
                this.indicator.style.opacity = '0.8';
            }
        }, 4000);

        // 10秒後に完全に非表示
        setTimeout(() => {
            if (this.indicator) {
                this.indicator.style.opacity = '0.5';
            }
        }, 8000);

        // クリックで非表示
        this.indicator.addEventListener('click', () => {
            this.hideIndicator();
        });

        // ダブルクリックでお気に入り管理を開く
        this.indicator.addEventListener('dblclick', () => {
            this.openFavoriteManager();
        });
    }

    // インジケーターのスタイルを適用
    applyIndicatorStyles() {
        if (!this.indicator) return;

        // メインコンテナのスタイル
        Object.assign(this.indicator.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)',
            zIndex: '10000',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            maxWidth: '300px',
            minWidth: '200px',
            wordWrap: 'break-word',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
        });

        // ヘッダー部分のスタイル
        const header = this.indicator.querySelector('.favorite-header');
        if (header) {
            Object.assign(header.style, {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
            });
        }

        // アイコンのスタイル
        const icon = this.indicator.querySelector('.favorite-icon');
        if (icon) {
            Object.assign(icon.style, {
                fontSize: '18px',
                lineHeight: '1',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'
            });
        }

        // メインテキストのスタイル
        const mainText = this.indicator.querySelector('.favorite-main-text');
        if (mainText) {
            Object.assign(mainText.style, {
                lineHeight: '1.2',
                fontWeight: '600'
            });
        }

        // 詳細情報のスタイル
        const details = this.indicator.querySelector('.favorite-details');
        if (details) {
            Object.assign(details.style, {
                fontSize: '11px',
                opacity: '0.9',
                lineHeight: '1.3'
            });
        }

        // カテゴリーのスタイル
        const category = this.indicator.querySelector('.favorite-category');
        if (category) {
            Object.assign(category.style, {
                marginBottom: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
            });
        }

        // タグのスタイル
        const tags = this.indicator.querySelector('.favorite-tags');
        if (tags) {
            Object.assign(tags.style, {
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
            });
        }

        // 注記のスタイル
        const note = this.indicator.querySelector('.favorite-note');
        if (note) {
            Object.assign(note.style, {
                fontSize: '10px',
                opacity: '0.7',
                marginTop: '6px',
                fontStyle: 'italic',
                textAlign: 'center'
            });
        }

        // ホバー効果
        this.indicator.addEventListener('mouseenter', () => {
            this.indicator.style.transform = 'translateY(-3px) scale(1.02)';
            this.indicator.style.boxShadow = '0 8px 25px rgba(76, 175, 80, 0.4)';
            this.indicator.style.opacity = '1';
        });

        this.indicator.addEventListener('mouseleave', () => {
            this.indicator.style.transform = 'translateY(0) scale(1)';
            this.indicator.style.boxShadow = '0 4px 20px rgba(76, 175, 80, 0.3)';
        });
    }

    // お気に入り管理画面を開く
    async openFavoriteManager() {
        try {
            // 拡張機能のポップアップを開く（ブラウザによって異なる実装が必要）
            await browser.runtime.sendMessage({ action: 'openPopup' });
        } catch (error) {
            console.log('お気に入り管理画面を開けませんでした:', error);
        }
    }

    // インジケーターを非表示
    hideIndicator() {
        if (this.indicator) {
            console.log('既存のインジケーターを削除');
            this.indicator.remove();
            this.indicator = null;
        } else {
            console.log('削除するインジケーターが存在しません');
        }
    }

    // URL変更を監視（SPA対応）
    observeUrlChanges() {
        let lastUrl = this.currentUrl;

        // pushState/replaceStateの監視
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function (...args) {
            originalPushState.apply(history, args);
            setTimeout(() => this.onUrlChange(), 100);
        }.bind(this);

        history.replaceState = function (...args) {
            originalReplaceState.apply(history, args);
            setTimeout(() => this.onUrlChange(), 100);
        }.bind(this);

        // popstateイベントの監視
        window.addEventListener('popstate', () => {
            setTimeout(() => this.onUrlChange(), 100);
        });

        // 定期的なURL変更チェック（フォールバック）
        setInterval(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                this.onUrlChange();
            }
        }, 1000);
    }

    // URL変更時の処理
    onUrlChange() {
        const newUrl = window.location.href;
        if (newUrl !== this.currentUrl) {
            this.currentUrl = newUrl;
            this.cleanUrl = this.getCleanUrl(newUrl);
            this.checkAndShowIndicator();
        }
    }
}

// メッセージリスナーを追加
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'showImageFavoriteForm') {
        showImageFavoriteForm(message.imageUrl, message.pageUrl, message.pageTitle);
        sendResponse({ success: true });
    }
    return false;
});

// 画像お気に入り登録フォームを表示
function showImageFavoriteForm(imageUrl, pageUrl, pageTitle) {
    // 既存のフォームがあれば削除
    const existingForm = document.getElementById('image-favorite-form');
    if (existingForm) {
        existingForm.remove();
    }

    // フォーム要素を作成
    const formContainer = document.createElement('div');
    formContainer.id = 'image-favorite-form';
    
    // オーバーレイを作成
    const overlay = document.createElement('div');
    overlay.className = 'form-overlay';
    
    // コンテンツを作成
    const content = document.createElement('div');
    content.className = 'form-content';
    
    // ヘッダーを作成
    const header = document.createElement('div');
    header.className = 'form-header';
    
    const title = document.createElement('h3');
    title.textContent = '画像付きお気に入り登録';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => {
        imageFormSelectedTags.clear();
        formContainer.remove();
    });
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // ボディを作成
    const body = document.createElement('div');
    body.className = 'form-body';
    
    // 画像プレビューを作成
    const imagePreview = document.createElement('div');
    imagePreview.className = 'image-preview';
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = '選択された画像';
    img.addEventListener('error', () => {
        img.style.display = 'none';
        imageError.style.display = 'block';
    });
    
    const imageError = document.createElement('div');
    imageError.className = 'image-error';
    imageError.style.display = 'none';
    imageError.textContent = '画像を読み込めませんでした';
    
    imagePreview.appendChild(img);
    imagePreview.appendChild(imageError);
    
    // フォームフィールドを作成
    const formFields = document.createElement('div');
    formFields.className = 'form-fields';
    
    // タイトル入力
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.id = 'image-form-title';
    titleInput.placeholder = 'タイトル';
    titleInput.value = pageTitle || '';
    titleInput.required = true;
    
    // URL入力
    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.id = 'image-form-url';
    urlInput.placeholder = 'URL';
    urlInput.value = pageUrl || '';
    urlInput.required = true;
    
    // 画像URL入力
    const imageUrlInput = document.createElement('input');
    imageUrlInput.type = 'url';
    imageUrlInput.id = 'image-form-image-url';
    imageUrlInput.placeholder = '画像URL';
    imageUrlInput.value = imageUrl || '';
    imageUrlInput.required = true;
    
    // カテゴリー選択
    const categorySelect = document.createElement('select');
    categorySelect.id = 'image-form-category';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'カテゴリーを選択';
    categorySelect.appendChild(defaultOption);
    
    // 新しいカテゴリー入力
    const newCategoryInput = document.createElement('input');
    newCategoryInput.type = 'text';
    newCategoryInput.id = 'image-form-new-category';
    newCategoryInput.placeholder = '新しいカテゴリー';
    
    // タグセクションを作成
    const tagsSection = document.createElement('div');
    tagsSection.className = 'image-tags-section';
    
    const tagsLabel = document.createElement('label');
    tagsLabel.setAttribute('for', 'image-form-tags');
    tagsLabel.textContent = 'タグ:';
    
    const existingTags = document.createElement('div');
    existingTags.id = 'image-form-existing-tags';
    existingTags.className = 'existing-tags';
    
    const tagsInput = document.createElement('input');
    tagsInput.type = 'text';
    tagsInput.id = 'image-form-tags';
    tagsInput.placeholder = '新しいタグを入力（カンマ区切り）';
    
    const selectedTags = document.createElement('div');
    selectedTags.id = 'image-form-selected-tags';
    selectedTags.className = 'selected-tags';
    
    tagsSection.appendChild(tagsLabel);
    tagsSection.appendChild(existingTags);
    tagsSection.appendChild(tagsInput);
    tagsSection.appendChild(selectedTags);
    
    // フォームフィールドを組み立て
    formFields.appendChild(titleInput);
    formFields.appendChild(urlInput);
    formFields.appendChild(imageUrlInput);
    formFields.appendChild(categorySelect);
    formFields.appendChild(newCategoryInput);
    formFields.appendChild(tagsSection);
    
    // アクションボタンを作成
    const formActions = document.createElement('div');
    formActions.className = 'form-actions';
    
    const saveBtn = document.createElement('button');
    saveBtn.id = 'image-form-save';
    saveBtn.className = 'btn-primary';
    saveBtn.textContent = '保存';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'image-form-cancel';
    cancelBtn.className = 'btn-secondary';
    cancelBtn.textContent = 'キャンセル';
    
    formActions.appendChild(saveBtn);
    formActions.appendChild(cancelBtn);
    
    // ボディを組み立て
    body.appendChild(imagePreview);
    body.appendChild(formFields);
    body.appendChild(formActions);
    
    // コンテンツを組み立て
    content.appendChild(header);
    content.appendChild(body);
    
    // オーバーレイを組み立て
    overlay.appendChild(content);
    
    // フォームコンテナを組み立て
    formContainer.appendChild(overlay);

    // スタイルを適用
    applyImageFormStyles(formContainer);

    // ページに追加
    document.body.appendChild(formContainer);

    // カテゴリーとタグを読み込み
    loadCategoriesForImageForm();
    loadTagsForImageForm();

    // タグ選択状態をリセット
    imageFormSelectedTags.clear();

    // イベントリスナーを設定
    setupImageFormEventListeners(formContainer);

    // タイトル入力欄にフォーカス
    setTimeout(() => {
        const titleInput = formContainer.querySelector('#image-form-title');
        if (titleInput) {
            titleInput.focus();
            titleInput.select();
        }
    }, 100);
}

// 画像フォームのスタイルを適用
function applyImageFormStyles(formContainer) {
    Object.assign(formContainer.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        zIndex: '10001',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });

    const overlay = formContainer.querySelector('.form-overlay');
    Object.assign(overlay.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(5px)'
    });

    const content = formContainer.querySelector('.form-content');
    Object.assign(content.style, {
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'hidden',
        animation: 'slideIn 0.3s ease-out'
    });

    const header = formContainer.querySelector('.form-header');
    Object.assign(header.style, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid #eee',
        backgroundColor: '#f8f9fa'
    });

    const title = formContainer.querySelector('h3');
    Object.assign(title.style, {
        margin: '0',
        fontSize: '18px',
        fontWeight: '600',
        color: '#333'
    });

    const closeBtn = formContainer.querySelector('.close-btn');
    Object.assign(closeBtn.style, {
        background: 'none',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        color: '#666',
        padding: '0',
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    });

    const body = formContainer.querySelector('.form-body');
    Object.assign(body.style, {
        padding: '20px',
        maxHeight: 'calc(80vh - 120px)',
        overflowY: 'auto'
    });

    const imagePreview = formContainer.querySelector('.image-preview');
    Object.assign(imagePreview.style, {
        textAlign: 'center',
        marginBottom: '20px',
        padding: '10px',
        border: '2px dashed #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9'
    });

    const img = formContainer.querySelector('.image-preview img');
    Object.assign(img.style, {
        maxWidth: '100%',
        maxHeight: '200px',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    });

    const fields = formContainer.querySelector('.form-fields');
    Object.assign(fields.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    });

    // 入力フィールドのスタイル
    const inputs = formContainer.querySelectorAll('input, select');
    inputs.forEach(input => {
        Object.assign(input.style, {
            padding: '10px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s'
        });
    });

    // タグセクションのスタイル
    const tagsSection = formContainer.querySelector('.image-tags-section');
    if (tagsSection) {
        Object.assign(tagsSection.style, {
            marginBottom: '12px'
        });

        const label = tagsSection.querySelector('label');
        if (label) {
            Object.assign(label.style, {
                display: 'block',
                fontSize: '12px',
                color: '#666',
                marginBottom: '4px'
            });
        }

        const existingTags = tagsSection.querySelector('.existing-tags');
        if (existingTags) {
            Object.assign(existingTags.style, {
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                marginBottom: '8px',
                maxHeight: '80px',
                overflowY: 'auto',
                padding: '4px',
                border: '1px solid #eee',
                borderRadius: '4px',
                backgroundColor: '#f9f9f9',
                minHeight: '32px'
            });
        }

        const selectedTags = tagsSection.querySelector('.selected-tags');
        if (selectedTags) {
            Object.assign(selectedTags.style, {
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                marginTop: '4px',
                minHeight: '20px'
            });
        }
    }

    const actions = formContainer.querySelector('.form-actions');
    Object.assign(actions.style, {
        display: 'flex',
        gap: '10px',
        marginTop: '20px'
    });

    const primaryBtn = formContainer.querySelector('.btn-primary');
    Object.assign(primaryBtn.style, {
        flex: '1',
        padding: '12px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    });

    const secondaryBtn = formContainer.querySelector('.btn-secondary');
    Object.assign(secondaryBtn.style, {
        flex: '1',
        padding: '12px 20px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    });

    // アニメーション用のCSSを追加
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-50px) scale(0.9);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
    `;
    document.head.appendChild(style);
}

// 画像フォーム用のカテゴリーを読み込み
async function loadCategoriesForImageForm() {
    try {
        const response = await browser.runtime.sendMessage({ action: 'getFavoritesData' });
        if (response && response.success) {
            const categories = response.data.categories || [];
            const categorySelect = document.getElementById('image-form-category');

            if (categorySelect) {
                // 既存のオプションをクリア
                while (categorySelect.firstChild) {
                    categorySelect.removeChild(categorySelect.firstChild);
                }
                
                // デフォルトオプションを追加
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'カテゴリーを選択';
                categorySelect.appendChild(defaultOption);
                
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    categorySelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('カテゴリー読み込みエラー:', error);
    }
}

// 画像フォーム用のタグを読み込み
async function loadTagsForImageForm() {
    try {
        const response = await browser.runtime.sendMessage({ action: 'getFavoritesData' });
        if (response && response.success) {
            const allTags = response.data.allTags || [];
            const container = document.getElementById('image-form-existing-tags');
            
            if (container) {
                // 既存の内容をクリア
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }
                
                if (allTags.length === 0) {
                    const span = document.createElement('span');
                    span.style.color = '#999';
                    span.style.fontSize = '11px';
                    span.textContent = 'まだタグがありません';
                    container.appendChild(span);
                    return;
                }

                allTags.forEach(tag => {
                    const tagElement = document.createElement('span');
                    tagElement.className = 'existing-tag';
                    tagElement.textContent = tag;
                    
                    // スタイルを適用
                    Object.assign(tagElement.style, {
                        background: '#e9ecef',
                        color: '#495057',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        border: '1px solid transparent',
                        userSelect: 'none'
                    });
                    
                    tagElement.addEventListener('click', () => {
                        toggleImageFormTag(tag);
                    });
                    
                    tagElement.addEventListener('mouseenter', () => {
                        if (!tagElement.classList.contains('selected')) {
                            tagElement.style.background = '#dee2e6';
                        }
                    });
                    
                    tagElement.addEventListener('mouseleave', () => {
                        if (!tagElement.classList.contains('selected')) {
                            tagElement.style.background = '#e9ecef';
                        }
                    });
                    
                    container.appendChild(tagElement);
                });
            }
        }
    } catch (error) {
        console.error('タグ読み込みエラー:', error);
    }
}

// 画像フォーム用のタグ選択状態を管理
let imageFormSelectedTags = new Set();

// 画像フォームでタグを切り替え
function toggleImageFormTag(tag) {
    if (imageFormSelectedTags.has(tag)) {
        imageFormSelectedTags.delete(tag);
    } else {
        imageFormSelectedTags.add(tag);
    }
    updateImageFormSelectedTags();
    updateImageFormExistingTagsDisplay();
}

// 画像フォームの選択済みタグ表示を更新
function updateImageFormSelectedTags() {
    const container = document.getElementById('image-form-selected-tags');
    if (!container) return;
    
    // 既存の内容をクリア
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    imageFormSelectedTags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'selected-tag';
        tagElement.textContent = tag + ' ';
        
        // スタイルを適用
        Object.assign(tagElement.style, {
            background: '#007bff',
            color: 'white',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            marginRight: '4px',
            marginBottom: '4px'
        });

        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-tag';
        removeBtn.textContent = '×';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.fontWeight = 'bold';
        removeBtn.style.fontSize = '12px';
        
        removeBtn.addEventListener('click', () => {
            imageFormSelectedTags.delete(tag);
            updateImageFormSelectedTags();
            updateImageFormExistingTagsDisplay();
        });
        
        removeBtn.addEventListener('mouseenter', () => {
            removeBtn.style.color = '#ffcccc';
        });
        
        removeBtn.addEventListener('mouseleave', () => {
            removeBtn.style.color = 'white';
        });

        tagElement.appendChild(removeBtn);
        container.appendChild(tagElement);
    });
}

// 画像フォームの既存タグ表示を更新
function updateImageFormExistingTagsDisplay() {
    const existingTags = document.querySelectorAll('#image-form-existing-tags .existing-tag');
    existingTags.forEach(tagElement => {
        const tag = tagElement.textContent;
        if (imageFormSelectedTags.has(tag)) {
            tagElement.classList.add('selected');
            tagElement.style.background = '#007bff';
            tagElement.style.color = 'white';
            tagElement.style.borderColor = '#0056b3';
        } else {
            tagElement.classList.remove('selected');
            tagElement.style.background = '#e9ecef';
            tagElement.style.color = '#495057';
            tagElement.style.borderColor = 'transparent';
        }
    });
}

// 画像フォームでタグ入力から追加
function addImageFormTagFromInput() {
    const tagsInput = document.getElementById('image-form-tags');
    if (!tagsInput) return;

    const inputValue = tagsInput.value.trim();
    if (!inputValue) return;

    const newTags = inputValue.split(',').map(tag => tag.trim()).filter(tag => tag);
    newTags.forEach(tag => {
        if (tag) {
            imageFormSelectedTags.add(tag);
        }
    });

    tagsInput.value = '';
    updateImageFormSelectedTags();
}

// 画像フォームのイベントリスナーを設定
function setupImageFormEventListeners(formContainer) {
    const saveBtn = formContainer.querySelector('#image-form-save');
    const cancelBtn = formContainer.querySelector('#image-form-cancel');
    const overlay = formContainer.querySelector('.form-overlay');

    // 保存ボタン
    saveBtn.addEventListener('click', async () => {
        await saveImageFavorite(formContainer);
    });

    // キャンセルボタン
    cancelBtn.addEventListener('click', () => {
        imageFormSelectedTags.clear();
        formContainer.remove();
    });

    // オーバーレイクリックで閉じる
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            imageFormSelectedTags.clear();
            formContainer.remove();
        }
    });

    // Escキーで閉じる
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            imageFormSelectedTags.clear();
            formContainer.remove();
            document.removeEventListener('keydown', escHandler);
        }
    });

    // ホバー効果
    saveBtn.addEventListener('mouseenter', () => {
        saveBtn.style.backgroundColor = '#0056b3';
    });
    saveBtn.addEventListener('mouseleave', () => {
        saveBtn.style.backgroundColor = '#007bff';
    });

    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.backgroundColor = '#545b62';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.backgroundColor = '#6c757d';
    });

    // タグ入力のイベントリスナー
    const tagsInput = formContainer.querySelector('#image-form-tags');
    if (tagsInput) {
        tagsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addImageFormTagFromInput();
            }
        });

        tagsInput.addEventListener('blur', () => {
            addImageFormTagFromInput();
        });
    }
}

// 画像お気に入りを保存
async function saveImageFavorite(formContainer) {
    try {
        const title = formContainer.querySelector('#image-form-title').value.trim();
        const url = formContainer.querySelector('#image-form-url').value.trim();
        const imageUrl = formContainer.querySelector('#image-form-image-url').value.trim();
        const selectedCategory = formContainer.querySelector('#image-form-category').value;
        const newCategory = formContainer.querySelector('#image-form-new-category').value.trim();
        const tagsInput = formContainer.querySelector('#image-form-tags').value.trim();

        if (!title || !url) {
            alert('タイトルとURLは必須です');
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

        // カテゴリーの決定
        const category = newCategory || selectedCategory;

        // タグの処理 - 選択されたタグと入力されたタグを結合
        const inputTags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        inputTags.forEach(tag => imageFormSelectedTags.add(tag));
        const tags = Array.from(imageFormSelectedTags);

        // お気に入りデータを作成
        const favorite = {
            id: Date.now().toString(),
            title,
            url,
            imageUrl: imageUrl || null,
            category: category || '',
            tags,
            timestamp: new Date().toISOString()
        };

        // ストレージに保存
        const result = await browser.storage.local.get(['favorites', 'categories', 'allTags']);
        const favorites = result.favorites || [];
        const categories = result.categories || [];
        const allTags = result.allTags || [];

        favorites.push(favorite);

        // 新しいカテゴリーを追加
        if (category && !categories.includes(category)) {
            categories.push(category);
        }

        // 新しいタグを追加
        tags.forEach(tag => {
            if (!allTags.includes(tag)) {
                allTags.push(tag);
            }
        });

        await browser.storage.local.set({ favorites, categories, allTags });

        // 成功メッセージを表示
        showSuccessMessage('お気に入りに追加しました！');

        // フォームを閉じる
        imageFormSelectedTags.clear();
        formContainer.remove();

        // インジケーターを更新
        const indicator = new FavoriteIndicator();
        indicator.checkAndShowIndicator();

    } catch (error) {
        console.error('画像お気に入り保存エラー:', error);
        alert('保存中にエラーが発生しました: ' + error.message);
    }
}

// 成功メッセージを表示
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.textContent = message;

    Object.assign(successDiv.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#28a745',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '10002',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px',
        fontWeight: '500'
    });

    document.body.appendChild(successDiv);

    // 3秒後に自動で削除
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 3000);
}

// ページ読み込み時に初期化
if (typeof browser !== 'undefined') {
    const favoriteIndicator = new FavoriteIndicator();
    
    // デバッグ用: グローバルに公開
    window.favoriteIndicator = favoriteIndicator;
    
    // デバッグ用: 手動チェック機能
    window.checkFavoriteStatus = () => {
        console.log('手動お気に入りステータスチェック実行');
        favoriteIndicator.checkAndShowIndicator();
    };
    
    console.log('FavoriteIndicator初期化完了 - デバッグ用関数: window.checkFavoriteStatus()');
} else {
    console.log('Browser API not available');
}