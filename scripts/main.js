/**
 * 应用主入口文件
 */

class Application {
    constructor() {
        this.isInitialized = false;
        this.version = '1.0.0';
    }

    /**
     * 初始化应用
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log(`%c员工满意度调查抽选系统 v${this.version}`, 
                'color: #3370FF; font-size: 16px; font-weight: bold;');
            
            // 检查浏览器兼容性
            this.checkBrowserCompatibility();
            
            // 初始化Feather图标
            if (typeof feather !== 'undefined') {
                feather.replace();
                console.log('Feather图标初始化完成');
            }

            // 初始化桌面存储目录
            if (window.desktopStorage && window.desktopStorage.available) {
                try {
                    await window.desktopStorage.init();
                    console.log('桌面存储初始化成功');
                } catch (error) {
                    console.error('桌面存储初始化失败:', error);
                }
            }
            
            // 检查必要的库
            this.checkRequiredLibraries();
            
            // 初始化应用状态
            await this.initializeAppState();

            // 初始化主题（亮/暗）
            this.initializeTheme();
            
            // 设置调试模式
            this.setupDebugMode();
            
            // 显示欢迎信息
            this.showWelcomeMessage();
            
            this.isInitialized = true;
            console.log('应用初始化完成');
            
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showFatalError(error);
        }
    }

    /**
     * 检查浏览器兼容性
     */
    checkBrowserCompatibility() {
        const features = {
            'FileReader': typeof FileReader !== 'undefined',
            'localStorage': typeof Storage !== 'undefined',
            'Promises': typeof Promise !== 'undefined',
            'ES6': (function() {
                try {
                    eval('const test = () => {};');
                    return true;
                } catch (e) {
                    return false;
                }
            })()
        };

        const unsupportedFeatures = Object.keys(features).filter(feature => !features[feature]);
        
        if (unsupportedFeatures.length > 0) {
            const message = `您的浏览器不支持以下功能: ${unsupportedFeatures.join(', ')}。请升级到现代浏览器。`;
            throw new Error(message);
        }
    }

    /**
     * 检查必要的库
     */
    checkRequiredLibraries() {
        const requiredLibs = {
            'XLSX': typeof XLSX !== 'undefined',
            'saveAs': typeof saveAs !== 'undefined' || typeof window.saveAs !== 'undefined',
            'feather': typeof feather !== 'undefined'
        };

        const missingLibs = Object.keys(requiredLibs).filter(lib => !requiredLibs[lib]);
        
        if (missingLibs.length > 0) {
            console.warn('缺少以下库:', missingLibs);
            // 显示友好的错误提示而不是阻止应用启动
            if (missingLibs.includes('XLSX')) {
                Utils.showToast('Excel处理库加载失败，文件解析功能可能无法使用', 'warning');
            }
        }
    }

    /**
     * 初始化应用状态
     */
    async initializeAppState() {
        try {
            const history = await Utils.Storage.getHistory();
            if (Array.isArray(history) && history.length > 0) {
                console.log(`加载了 ${history.length} 条历史记录`);
            }
        } catch (error) {
            console.error('初始化历史记录失败:', error);
            showToast('加载历史记录失败，部分功能可能受限', 'warning');
        }

        this.resetApplicationState();
        uiController.showPage('homePage');
    }

    /**
     * 根据本地存储初始化主题
     */
    initializeTheme() {
        try {
            const saved = localStorage.getItem('theme');
            if (saved === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                const btn = document.getElementById('themeToggleBtn');
                if (btn) {
                    const icon = btn.querySelector('i');
                    if (icon) icon.setAttribute('data-feather', 'sun');
                    btn.setAttribute('aria-label', '切换到亮色主题');
                    feather.replace();
                }
            }
        } catch (e) {
            // 忽略存储异常
        }
    }

    /**
     * 重置应用状态
     */
    resetApplicationState() {
        // 重置数据处理器
        dataProcessor.reset();
        
        // 重置抽选动画
        drawAnimation.reset();
        
        // 重置UI控制器
        uiController.reset();
    }

    /**
     * 设置调试模式
     */
    setupDebugMode() {
        // 开发模式检测
        const isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1' ||
                             window.location.protocol === 'file:';

        if (isDevelopment) {
            console.log('开发模式已启用');
            
            // 添加调试函数到全局作用域
            window.debugApp = {
                version: this.version,
                dataProcessor,
                drawAnimation,
                uiController,
                utils: Utils,
                
                // 调试函数
                generateTestData: this.generateTestData.bind(this),
                clearAllData: this.clearAllData.bind(this),
                exportDebugInfo: this.exportDebugInfo.bind(this),
                showMemoryUsage: this.showMemoryUsage.bind(this)
            };

            // 添加性能监控
            this.setupPerformanceMonitoring();
        }
    }

    /**
     * 生成测试数据
     */
    generateTestData() {
        const testEmployees = [
            { '姓名': '张三', '性别': '男', '部门': '技术部', '分部门': '开发组', '岗位': '工程师', '在职状态': '在岗' },
            { '姓名': '李四', '性别': '女', '部门': '技术部', '分部门': '测试组', '岗位': '测试员', '在职状态': '在岗' },
            { '姓名': '王五', '性别': '男', '部门': '运行部', '分部门': '运行部办公室', '岗位': '主任', '在职状态': '在岗' },
            { '姓名': '赵六', '性别': '女', '部门': '运行部', '分部门': '运行A值', '岗位': '值长', '在职状态': '在岗' },
            { '姓名': '钱七', '性别': '男', '部门': '运行部', '分部门': '运行B值', '岗位': '操作员', '在职状态': '在岗' },
            { '姓名': '孙八', '性别': '女', '部门': '人力资源部', '分部门': '招聘组', '岗位': '专员', '在职状态': '在岗' },
            { '姓名': '周九', '性别': '男', '部门': '财务部', '分部门': '会计组', '岗位': '会计', '在职状态': '在岗' },
            { '姓名': '吴十', '性别': '女', '部门': '市场部', '分部门': '营销组', '岗位': '营销员', '在职状态': '在岗' }
        ];

        dataProcessor.rawData = testEmployees;
        const processedData = dataProcessor.processData();
        uiController.showDepartmentStats();
        
        console.log('测试数据已生成:', processedData);
        Utils.showToast('测试数据已加载', 'success');
    }

    /**
     * 清空所有数据
     */
    clearAllData() {
        if (confirm('确定要清空所有数据吗？此操作无法恢复。')) {
            localStorage.clear();
            this.resetApplicationState();
            console.log('所有数据已清空');
            Utils.showToast('所有数据已清空', 'success');
        }
    }

    /**
     * 导出调试信息
     */
    exportDebugInfo() {
        const debugInfo = {
            timestamp: new Date().toISOString(),
            version: this.version,
            userAgent: navigator.userAgent,
            url: window.location.href,
            localStorage: { ...localStorage },
            historyRecords: Utils.Storage.getHistory(),
            currentState: {
                currentPage: uiController.currentPage,
                hasRawData: !!dataProcessor.rawData,
                hasProcessedData: !!dataProcessor.processedData,
                isAnimating: drawAnimation.isAnimating
            }
        };

        const blob = new Blob([JSON.stringify(debugInfo, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug_info_${Utils.formatDate(new Date()).replace(/\//g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Utils.showToast('调试信息已导出', 'success');
    }

    /**
     * 显示内存使用情况
     */
    showMemoryUsage() {
        if ('memory' in performance) {
            const memory = performance.memory;
            console.log('内存使用情况:', {
                used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
                total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
                limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
            });
        } else {
            console.log('浏览器不支持内存使用情况查询');
        }
    }

    /**
     * 设置性能监控
     */
    setupPerformanceMonitoring() {
        // 监控长任务
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (entry.duration > 50) {
                            console.warn(`长任务检测: ${entry.name || 'unknown'} - ${entry.duration.toFixed(2)}ms`);
                        }
                    });
                });
                
                observer.observe({ entryTypes: ['measure', 'navigation'] });
            } catch (e) {
                console.log('性能监控设置失败:', e.message);
            }
        }
    }

    /**
     * 显示欢迎信息
     */
    showWelcomeMessage() {
        const isFirstVisit = !localStorage.getItem('hasVisited');
        
        if (isFirstVisit) {
            localStorage.setItem('hasVisited', 'true');
            
            setTimeout(() => {
                Utils.showToast('欢迎使用员工满意度调查抽选系统！', 'success');
            }, 1000);
        }
    }

    /**
     * 显示致命错误
     */
    showFatalError(error) {
        document.body.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
                background: #f5f5f5;
            ">
                <div style="
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    max-width: 500px;
                ">
                    <h1 style="color: #F54A45; margin-bottom: 20px;">应用启动失败</h1>
                    <p style="color: #666; margin-bottom: 20px;">${error.message}</p>
                    <p style="color: #999; font-size: 14px;">
                        请尝试刷新页面或联系技术支持。<br>
                        推荐使用Chrome、Firefox或Edge浏览器的最新版本。
                    </p>
                    <button onclick="location.reload()" style="
                        background: #3370FF;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 16px;
                        margin-top: 20px;
                    ">刷新页面</button>
                </div>
            </div>
        `;
    }

    /**
     * 优雅关闭应用
     */
    shutdown() {
        console.log('正在关闭应用...');
        
        // 清理定时器和事件监听器
        // 这里可以添加具体的清理逻辑
        
        // 保存当前状态
        try {
            // 保存一些必要的状态信息
            console.log('应用状态已保存');
        } catch (error) {
            console.warn('保存应用状态失败:', error);
        }
        
        console.log('应用已关闭');
    }
}

// 创建全局应用实例
window.app = new Application();

// 应用初始化函数
window.initApp = async function() {
    try {
        await app.init();
    } catch (error) {
        console.error('应用初始化失败:', error);
    }
};

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    app.shutdown();
});

// 错误处理
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
    
    // 显示用户友好的错误提示
    Utils.showToast('发生了意外错误，请刷新页面重试', 'error');
});

// 未处理的Promise拒绝
window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
    
    // 显示用户友好的错误提示
    Utils.showToast('操作失败，请重试', 'error');
    
    // 阻止默认的控制台错误日志
    event.preventDefault();
});

// 导出主要的全局函数
window.appReady = () => app.isInitialized;
