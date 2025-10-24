/**
 * 存储同步工具
 * 用于在localStorage和JSON文件之间同步历史记录
 */

class StorageSync {
    constructor() {
        this.isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        this.isDesktop = typeof window.isDesktopApp !== 'undefined' && window.isDesktopApp;
        this.syncInterval = null;
        this.lastSyncTime = 0;
    }

    /**
     * 启动自动同步
     */
    startAutoSync() {
        if (this.isDesktop) {
            console.log('桌面环境下无需启用浏览器同步提示');
            return;
        }

        if (this.isLocal) {
            console.log('本地开发环境：启动存储同步监控');
            this.syncInterval = setInterval(() => {
                this.syncToFile();
            }, 5000); // 每5秒检查一次
        }
    }

    /**
     * 停止自动同步
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * 同步到文件（仅在开发环境）
     */
    async syncToFile() {
        if (!this.isLocal || this.isDesktop) return;

        try {
            const currentData = localStorage.getItem('drawHistory');
            if (!currentData) return;

            const currentTime = new Date(JSON.parse(currentData)[0]?.date || 0).getTime();
            if (currentTime <= this.lastSyncTime) return; // 没有新数据

            // 尝试读取现有文件
            let existingData = [];
            try {
                const response = await fetch('data/draw_history.json');
                if (response.ok) {
                    existingData = await response.json();
                }
            } catch (e) {
                console.log('无法读取现有JSON文件，将创建新的');
            }

            const localData = JSON.parse(currentData);
            
            // 检查是否有新数据需要同步
            const needsSync = this.checkNeedsSync(existingData, localData);
            
            if (needsSync) {
                console.log('检测到新的历史记录，需要同步到JSON文件');
                this.showSyncNotification(localData);
                this.lastSyncTime = currentTime;
            }

        } catch (error) {
            console.error('同步检查失败:', error);
        }
    }

    /**
     * 检查是否需要同步
     */
    checkNeedsSync(existingData, localData) {
        if (localData.length === 0) return false;
        if (existingData.length === 0) return true;

        const latestLocal = new Date(localData[0].date).getTime();
        const latestExisting = new Date(existingData[0].date).getTime();

        return latestLocal > latestExisting;
    }

    /**
     * 显示同步通知
     */
    showSyncNotification(data) {
        const jsonContent = JSON.stringify(data, null, 2);
        
        console.group('📄 历史记录同步');
        console.log('检测到新的历史记录，请手动更新 data/draw_history.json 文件：');
        console.log('JSON内容:');
        console.log(jsonContent);
        console.log('或者点击下面的按钮下载文件：');
        console.groupEnd();

        // 在页面上显示同步提示
        this.showSyncButton(data);
    }

    /**
     * 显示同步按钮
     */
    showSyncButton(data) {
        // 检查是否已经有同步按钮
        let syncButton = document.getElementById('syncButton');
        if (syncButton) return;

        syncButton = document.createElement('button');
        syncButton.id = 'syncButton';
        syncButton.innerHTML = '🔄 同步历史记录到JSON文件';
        syncButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #ff6b35;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            z-index: 4000;
            animation: bounce 2s infinite;
        `;

        // 添加CSS动画
        if (!document.getElementById('syncButtonStyle')) {
            const style = document.createElement('style');
            style.id = 'syncButtonStyle';
            style.textContent = `
                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-10px); }
                    60% { transform: translateY(-5px); }
                }
            `;
            document.head.appendChild(style);
        }

        syncButton.onclick = () => {
            this.downloadSyncFile(data);
            syncButton.remove();
        };

        document.body.appendChild(syncButton);

        // 10秒后自动隐藏
        setTimeout(() => {
            if (syncButton && syncButton.parentNode) {
                syncButton.remove();
            }
        }, 10000);
    }

    /**
     * 下载同步文件
     */
    downloadSyncFile(data) {
        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'draw_history.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        if (window.Utils && window.Utils.showToast) {
            window.Utils.showToast('历史记录JSON文件已下载，请替换data目录下的文件', 'info');
        }
    }

    /**
     * 手动触发同步
     */
    manualSync() {
        if (this.isDesktop) {
            console.log('桌面环境已自动同步，无需手动触发');
            return;
        }
        const data = localStorage.getItem('drawHistory');
        if (data) {
            const parsedData = JSON.parse(data);
            this.showSyncNotification(parsedData);
        }
    }
}

// 创建全局实例
window.storageSync = new StorageSync();

// 页面加载完成后启动自动同步
document.addEventListener('DOMContentLoaded', () => {
    if (window.storageSync) {
        window.storageSync.startAutoSync();
    }
});

// 页面关闭前停止同步
window.addEventListener('beforeunload', () => {
    if (window.storageSync) {
        window.storageSync.stopAutoSync();
    }
});
