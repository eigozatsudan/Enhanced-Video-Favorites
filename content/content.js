// コンテンツスクリプト - お気に入り登録済みページの表示
class FavoriteIndicator {
    constructor() {
        this.currentUrl = window.location.href;
        this.cleanUrl = this.getCleanUrl(this.currentUrl);
        this.indicator = null;
        this.init();
    }

    async init() {
        // ページが完全に読み込まれるまで待機
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.checkAndShowIndicator());
        } else {
            this.checkAndShowIndicator();
        }

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
            const response = await browser.runtime.sendMessage({
                action: 'checkFavoriteStatus',
                url: this.currentUrl
            });

            if (response && response.success) {
                return {
                    isFavorite: response.isFavorite,
                    exactMatch: response.exactMatch,
                    cleanMatch: response.cleanMatch,
                    favoriteData: response.favoriteData
                };
            }
        } catch (error) {
            console.log('お気に入りステータスチェックエラー:', error);
        }

        return { isFavorite: false, exactMatch: false, cleanMatch: false, favoriteData: null };
    }

    // インジケーターを表示
    async checkAndShowIndicator() {
        const status = await this.checkFavoriteStatus();

        if (status.isFavorite) {
            this.showIndicator(status);
            this.updateFavicon(true);
            this.updatePageTitle(true);
        } else {
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
        // 既存のインジケーターを削除
        this.hideIndicator();

        // お気に入りデータから情報を取得
        const favoriteData = status.favoriteData;
        const hasCategory = favoriteData && favoriteData.category;
        const hasTags = favoriteData && favoriteData.tags && favoriteData.tags.length > 0;

        // インジケーター要素を作成
        this.indicator = document.createElement('div');
        this.indicator.id = 'favorite-indicator';

        let content = `
            <div class="favorite-header">
                <div class="favorite-icon">⭐</div>
                <div class="favorite-main-text">お気に入り登録済み</div>
            </div>
        `;

        // 詳細情報を追加
        if (favoriteData) {
            content += '<div class="favorite-details">';

            if (hasCategory) {
                content += `<div class="favorite-category">📁 ${favoriteData.category}</div>`;
            }

            if (hasTags) {
                const tagsText = favoriteData.tags.slice(0, 3).join(', ');
                const moreTagsText = favoriteData.tags.length > 3 ? ` +${favoriteData.tags.length - 3}` : '';
                content += `<div class="favorite-tags">🏷️ ${tagsText}${moreTagsText}</div>`;
            }

            content += '</div>';
        }

        if (!status.exactMatch) {
            content += '<div class="favorite-note">（類似URL）</div>';
        }

        this.indicator.innerHTML = content;

        // スタイルを適用
        this.applyIndicatorStyles();

        // ページに追加
        document.body.appendChild(this.indicator);

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
            this.indicator.remove();
            this.indicator = null;
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

// ページ読み込み時に初期化
if (typeof browser !== 'undefined') {
    new FavoriteIndicator();
} else {
    console.log('Browser API not available');
}