(function() {
    const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.invoke;

    class DesktopStorageAdapter {
        constructor() {
            this.available = !!isTauri;
            this.initialized = false;
            this.usingFallback = false;
            this.dataDir = null;
            this.fallbackDir = null;
            this.queue = Promise.resolve();
        }

        async init() {
            if (!this.available) {
                return false;
            }

            if (this.initialized) {
                return true;
            }

            try {
                const result = await window.__TAURI__.invoke('ensure_data_dir');
                this.dataDir = result.data_dir || result.dataDir || null;
                this.usingFallback = Boolean(result.using_fallback ?? result.usingFallback);
                this.fallbackDir = result.fallback_dir || result.fallbackDir || null;

                if (result.message) {
                    console.warn(result.message);
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast(result.message, 'warning');
                    }
                }

                this.initialized = true;
                return true;
            } catch (error) {
                console.error('初始化桌面存储失败:', error);
                this.available = false;
                return false;
            }
        }

        async _enqueue(operation) {
            this.queue = this.queue.then(() => operation()).catch(error => {
                console.error('桌面存储操作失败', error);
                throw error;
            });
            return this.queue;
        }

        async readHistory() {
            if (!(await this.init())) {
                return null;
            }

            return this._enqueue(async () => {
                const response = await window.__TAURI__.invoke('read_history_file');
                if (response) {
                    this.dataDir = response.data_dir || response.dataDir || this.dataDir;
                    this.usingFallback = Boolean(response.using_fallback ?? response.usingFallback ?? this.usingFallback);
                    this.fallbackDir = response.fallback_dir || response.fallbackDir || this.fallbackDir;
                    return Array.isArray(response.history) ? response.history : (response.history ?? []);
                }
                return [];
            });
        }

        async writeHistory(history) {
            if (!(await this.init())) {
                throw new Error('桌面存储不可用');
            }

            if (!Array.isArray(history)) {
                throw new Error('历史记录必须是数组');
            }

            return this._enqueue(async () => {
                const response = await window.__TAURI__.invoke('write_history_file', { data: history });
                if (response) {
                    this.dataDir = response.data_dir || response.dataDir || this.dataDir;
                    this.usingFallback = Boolean(response.using_fallback ?? response.usingFallback ?? this.usingFallback);
                }
                return response;
            });
        }
    }

    window.desktopStorage = new DesktopStorageAdapter();
    window.isDesktopApp = !!isTauri;
})();
