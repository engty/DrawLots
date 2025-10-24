/**
 * UI控制模块
 */

class UIController {
    constructor() {
        this.currentPage = 'homePage';
        this.initializeEventListeners();
    }

    /**
     * 复制当前查看记录的名单为：部门名称(人数) 姓名 姓名...\n
     */
    async copyNamesFromCurrentRecord() {
        try {
            const record = this.currentViewedRecord;
            if (!record || !record.selectedEmployees) {
                Utils.showToast('没有可复制的名单', 'warning');
                return;
            }
            // 分组并排序姓名
            const groups = {};
            record.selectedEmployees.forEach(emp => {
                if (!groups[emp.department]) groups[emp.department] = [];
                groups[emp.department].push(emp);
            });

            const lines = Object.keys(groups).map(dept => {
                const sorted = Utils.sortByStrokeOrder(groups[dept]);
                const names = sorted.map(e => e.name).join(' ');
                return `${dept} (${sorted.length}人) ${names}`;
            });

            const text = lines.join('\n');
            const ok = await Utils.copyToClipboard(text);
            if (ok) {
                Utils.showToast('人员名单已复制到剪贴板', 'success');
            } else {
                Utils.showToast('复制失败，请重试', 'error');
            }
        } catch (e) {
            console.error('复制名单失败:', e);
            Utils.showToast('复制失败: ' + e.message, 'error');
        }
    }

    /**
     * 从当前抽选结果复制名单
     */
    async copyNamesFromResults() {
        try {
            if (!drawAnimation.currentResults || drawAnimation.currentResults.length === 0) {
                Utils.showToast('暂无可复制的结果', 'warning');
                return;
            }
            const lines = drawAnimation.currentResults.map(dept => {
                // 将部门内姓名按笔画排序
                const sorted = Utils.sortByStrokeOrder(dept.employees);
                const names = sorted.map(e => e.name).join(' ');
                return `${dept.department} (${sorted.length}人) ${names}`;
            });
            const ok = await Utils.copyToClipboard(lines.join('\n'));
            Utils.showToast(ok ? '当前结果名单已复制' : '复制失败，请重试', ok ? 'success' : 'error');
        } catch (e) {
            console.error('复制结果名单失败:', e);
            Utils.showToast('复制失败: ' + e.message, 'error');
        }
    }

    /**
     * 导出当前抽选结果为 Markdown 文件
     */
    async exportResultsMarkdown() {
        try {
            if (!drawAnimation.currentResults || drawAnimation.currentResults.length === 0) {
                Utils.showToast('暂无可导出的结果', 'warning');
                return;
            }
            const timestamp = new Date();
            const markdown = Utils.generateMarkdown(drawAnimation.currentResults, timestamp);

            // 组装文件名：优先使用当前 periodLabel；若无，则尝试使用最近历史的 periodLabel（且名单相同），否则回退日期名
            let filenameLabel = drawAnimation.currentPeriodLabel;
            if (!filenameLabel) {
                try {
                    const history = await Utils.Storage.getHistory();
                    if (Array.isArray(history) && history.length > 0) {
                        const last = history[0];
                        if (last && Array.isArray(last.selectedEmployees)) {
                            const lastKeys = last.selectedEmployees.map(e => e && `${e.name}|${e.department}`).filter(Boolean);
                            const currentKeys = [];
                            drawAnimation.currentResults.forEach(dept => {
                                dept.employees.forEach(emp => currentKeys.push(`${emp.name}|${emp.department}`));
                            });
                            const norm = arr => arr.slice().sort().join('|');
                            if (currentKeys.length > 0 && norm(lastKeys) === norm(currentKeys) && last.periodLabel) {
                                filenameLabel = last.periodLabel;
                            }
                        }
                    }
                } catch (e) { /* 忽略历史读取异常，使用回退命名 */ }
            }

            const fallback = `抽选结果_${Utils.formatDate(timestamp).replace(/\//g, '-')}`;
            const filename = `${filenameLabel || fallback}.md`;
            Utils.downloadFile(markdown, filename, 'text/markdown');
            Utils.showToast(`已导出：${filename}`, 'success');
        } catch (e) {
            console.error('导出失败:', e);
            Utils.showToast('导出失败: ' + e.message, 'error');
        }
    }

    /**
     * 初始化事件监听器
     */
    initializeEventListeners() {
        // 文件上传相关事件
        this.setupFileUploadEvents();
        
        // 点击事件委托
        this.setupClickDelegation();
        
        // 窗口大小变化事件
        window.addEventListener('resize', Utils.debounce(this.handleWindowResize.bind(this), 300));
        
        // 键盘事件
        document.addEventListener('keydown', this.handleKeydown.bind(this));
        
        // 防止页面意外离开
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    }

    /**
     * 设置文件上传事件
     */
    setupFileUploadEvents() {
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');

        // 文件选择事件
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // 拖拽事件
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleFileDrop.bind(this));
        
        // 点击上传区域
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
    }

    /**
     * 设置点击事件委托
     */
    setupClickDelegation() {
        document.addEventListener('click', (e) => {
            // 复选框点击事件
            if (e.target.matches('.checkbox-item input[type="checkbox"]') || 
                e.target.closest('.checkbox-item')) {
                this.handleCheckboxClick(e);
            }
            
            // 模态框背景点击关闭
            if (e.target.matches('.modal-overlay')) {
                Utils.closeModal();
            }
            
            // 历史记录按钮点击事件
            const button = e.target.closest('[data-action]');
            if (button) {
                const action = button.dataset.action;
                const recordId = button.dataset.recordId;
                const name = button.dataset.name;
                const department = button.dataset.department;
                
                try {
                    switch (action) {
                        // 全局导航/操作（移除内联 onclick 后统一处理）
                        case 'nav-history':
                            this.showHistoryPage();
                            break;
                        case 'nav-home':
                        case 'breadcrumb-home':
                            this.showHomePage();
                            break;
                        case 'start-draw':
                            this.startDraw();
                            break;
                        case 'supplement-draw':
                            drawAnimation.supplementDraw();
                            break;
                        case 'save-results':
                            drawAnimation.saveResults();
                            break;
                        case 'offline-save':
                            drawAnimation.offlineSave();
                            break;
                        case 'reupload-roster':
                            // 完整回到上传初始状态
                            this.reset();
                            break;
                        case 'copy-result-names':
                            this.copyNamesFromResults();
                            break;
                        case 'export-results':
                            this.exportResultsMarkdown();
                            break;
                        case 'modal-close':
                            Utils.closeModal();
                            break;
                        case 'confirm-save-meta': {
                            const yearSel = document.getElementById('saveYearSelect');
                            const quarterSel = document.getElementById('saveQuarterSelect');
                            const year = yearSel ? parseInt(yearSel.value, 10) : new Date().getFullYear();
                            const quarter = quarterSel ? quarterSel.value : '第一季度';
                            drawAnimation.finalizeSaveWithMeta(year, quarter);
                            break;
                        }
                        case 'toggle-theme':
                            this.toggleTheme(button);
                            break;
                        case 'trigger-file': {
                            const fileInput = document.getElementById('fileInput');
                            if (fileInput) fileInput.click();
                            break;
                        }
                        case 'view-detail':
                            this.viewHistoryDetail(recordId);
                            break;
                        case 'edit-record':
                            this.editHistoryRecord(recordId);
                            break;
                        case 'delete-record':
                            this.deleteHistoryRecord(recordId);
                            break;
                        case 'delete-employee':
                            this.deleteEmployeeFromHistory(recordId, name, department);
                            break;
                        case 'copy-names':
                            this.copyNamesFromCurrentRecord();
                            break;
                    }
                } catch (error) {
                    console.error('执行按钮动作失败:', error);
                    Utils.showToast('操作失败: ' + error.message, 'error');
                }
            }
        }, true); // 使用capture模式确保能捕获所有点击
    }

    /**
     * 主题切换（亮/暗）
     */
    toggleTheme(buttonEl) {
        const root = document.documentElement;
        const current = root.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        if (next === 'light') {
            root.removeAttribute('data-theme');
        } else {
            root.setAttribute('data-theme', 'dark');
        }
        try {
            localStorage.setItem('theme', next);
        } catch (e) {}

        // 更新按钮图标与无障碍标签（Feather 会将 <i> 替换为 <svg>，因此需重建）
        if (buttonEl) {
            // 移除旧的 svg 图标
            const oldSvg = buttonEl.querySelector('svg');
            if (oldSvg) oldSvg.remove();
            // 插入新的占位元素并仅替换当前按钮内的图标
            buttonEl.insertAdjacentHTML('afterbegin', `<i data-feather="${next === 'dark' ? 'sun' : 'moon'}"></i>`);
            buttonEl.setAttribute('aria-label', next === 'dark' ? '切换到亮色主题' : '切换到暗色主题');
            if (typeof feather !== 'undefined') {
                feather.replace({ elements: [buttonEl] });
            }
        }
    }

    /**
     * 处理文件选择
     */
    async handleFileSelect(event) {
        const file = event.target.files[0];
        await this.processFile(file);
    }

    /**
     * 处理拖拽悬停
     */
    handleDragOver(event) {
        event.preventDefault();
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.classList.add('drag-over');
    }

    /**
     * 处理拖拽离开
     */
    handleDragLeave(event) {
        event.preventDefault();
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.classList.remove('drag-over');
    }

    /**
     * 处理文件拖放
     */
    async handleFileDrop(event) {
        event.preventDefault();
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.classList.remove('drag-over');

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            await this.processFile(files[0]);
        }
    }

    /**
     * 处理文件处理
     */
    async processFile(file) {
        if (!file) return;

        // 验证文件
        const validation = Utils.validateExcelFile(file);
        if (!validation.valid) {
            Utils.showToast(validation.message, 'error');
            return;
        }

        // 显示解析状态
        this.showParseStatus(true);

        try {
            // 模拟解析进度
            await this.simulateParseProgress();

            // 解析Excel文件
            const rawData = await dataProcessor.parseExcelFile(file);
            // 记录上传文件名
            this.lastUploadedFileName = file.name || '';
            
            // 处理数据
            const processedData = dataProcessor.processData();
            
            // 显示统计信息
            this.showDepartmentStats();
            
            Utils.showToast(`成功解析 ${processedData.length} 名员工数据`, 'success');

        } catch (error) {
            Utils.showToast('文件解析失败: ' + error.message, 'error');
            this.showParseStatus(false);
        }
    }

    /**
     * 显示/隐藏解析状态
     */
    showParseStatus(show) {
        const parseStatus = document.getElementById('parseStatus');
        const uploadSection = document.querySelector('.upload-section');
        
        if (show) {
            uploadSection.style.display = 'none';
            parseStatus.style.display = 'block';
        } else {
            uploadSection.style.display = 'block';
            parseStatus.style.display = 'none';
        }
    }

    /**
     * 模拟解析进度
     */
    async simulateParseProgress() {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        return new Promise(resolve => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 15 + 5;
                if (progress > 100) progress = 100;
                
                progressFill.style.width = progress + '%';
                progressText.textContent = Math.round(progress) + '%';
                
                if (progress >= 100) {
                    clearInterval(interval);
                    setTimeout(resolve, 200);
                }
            }, 100);
        });
    }

    /**
     * 显示部门统计信息
     */
    showDepartmentStats() {
        const overviewSection = document.getElementById('overviewSection');
        const departmentSection = document.getElementById('departmentSection');
        const departmentGrid = document.getElementById('departmentGrid');
        const actionSection = document.getElementById('actionSection');
        const parseStatus = document.getElementById('parseStatus');

        // 隐藏解析状态
        parseStatus.style.display = 'none';
        
        // 获取统计数据
        const stats = dataProcessor.getStatsSummary();
        if (!stats) return;

        // 显示总体统计
        this.showOverviewStats(stats);

        // 清空网格
        departmentGrid.innerHTML = '';

        let hasOperationsDept = false;

        // 创建部门卡片
        Object.keys(stats.departments).forEach(deptName => {
            const deptData = stats.departments[deptName];
            const card = this.createDepartmentCard(deptName, deptData);
            departmentGrid.appendChild(card);

            if (deptData.isOperations) {
                hasOperationsDept = true;
            }
        });

        // 显示运行部选择面板
        const operationsPanel = document.getElementById('operationsPanel');
        if (hasOperationsDept) {
            operationsPanel.style.display = 'block';
        } else {
            operationsPanel.style.display = 'none';
        }

        // 显示统计面板和操作按钮
        overviewSection.style.display = 'block';
        departmentSection.style.display = 'block';
        actionSection.style.display = 'block';

        // 添加入场动画
        overviewSection.classList.add('fade-in');
        departmentSection.classList.add('fade-in');
        actionSection.classList.add('fade-in');

        // 重新渲染图标
        feather.replace();
    }

    /**
     * 显示总体统计
     */
    showOverviewStats(stats) {
        // 计算统计数据
        const rosterTotal = dataProcessor.rawData ? dataProcessor.rawData.length : 0;
        const eligibleTotal = stats.totalEmployees;
        const willDrawTotal = stats.totalDrawCount;

        // 更新数字与标签显示
        document.getElementById('rosterTotalStat').textContent = rosterTotal;
        const rosterLabelEl = document.getElementById('rosterTotalLabel');
        if (rosterLabelEl) {
            const fileHint = this.lastUploadedFileName ? `（${this.lastUploadedFileName}）` : '';
            rosterLabelEl.textContent = `上传花名册人员总数 ${fileHint}`;
        }
        document.getElementById('eligibleStat').textContent = eligibleTotal;
        document.getElementById('willDrawStat').textContent = willDrawTotal;

        // 绘制饼图
        const canvas = document.getElementById('overviewChart');
        const chartData = [
            { name: '花名册总人数', value: rosterTotal },
            { name: '参与抽签人数', value: eligibleTotal },
            { name: '将抽取人数', value: willDrawTotal }
        ];
        // 使用主题变量：主色蓝，成功/警告色保持不变
        const rootStyles = getComputedStyle(document.documentElement);
        const colors = [
            rootStyles.getPropertyValue('--primary-blue').trim() || '#3370FF',
            rootStyles.getPropertyValue('--success-green').trim() || '#00D6B9',
            rootStyles.getPropertyValue('--warning-orange').trim() || '#FF7A45'
        ];
        
        // 调整数据以避免重叠显示
        const adjustedData = [
            { name: '未参与抽签', value: rosterTotal - eligibleTotal },
            { name: '参与但未抽中', value: eligibleTotal - willDrawTotal },
            { name: '将被抽中', value: willDrawTotal }
        ].filter(item => item.value > 0);
        
        Utils.drawPieChart(canvas, adjustedData, colors);
    }

    /**
     * 创建部门卡片
     */
    createDepartmentCard(deptName, deptData) {
        const card = document.createElement('div');
        card.className = 'department-card hover-lift';
        
        if (deptData.isOperations) {
            card.classList.add('special');
        }

        card.innerHTML = `
            <div class="department-header">
                <span class="department-name">${deptName}</span>
                ${deptData.isOperations ? '<span class="special-badge">特殊</span>' : ''}
            </div>
            <div class="department-stats">
                <div class="stat-item">
                    <div class="stat-number">${deptData.totalCount}</div>
                    <div class="stat-label">总人数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${deptData.drawCount}</div>
                    <div class="stat-label">应抽人数</div>
                </div>
            </div>
        `;

        return card;
    }

    /**
     * 处理复选框点击
     */
    handleCheckboxClick(event) {
        const checkbox = event.target.matches('input[type="checkbox"]') 
            ? event.target 
            : event.target.closest('.checkbox-item').querySelector('input[type="checkbox"]');
            
        if (!checkbox || checkbox.disabled) return;

        // 阻止事件冒泡
        event.stopPropagation();
        
        // 切换选中状态
        checkbox.checked = !checkbox.checked;
        
        // 更新数据处理器中的选择状态
        this.updateSelectedSubDepartments();
    }

    /**
     * 更新选择的分部门
     */
    updateSelectedSubDepartments() {
        const checkboxes = document.querySelectorAll('#operationsCheckboxes input[type="checkbox"]:not([disabled])');
        const selectedList = [];

        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedList.push(checkbox.value);
            }
        });

        dataProcessor.setSelectedSubDepartments(selectedList);
        
        // 更新按钮状态
        this.updateStartButtonState();
    }

    /**
     * 更新开始按钮状态
     */
    updateStartButtonState() {
        const startBtn = document.getElementById('startDrawBtn');
        const drawPool = dataProcessor.getDrawPool();
        
        const hasValidPool = Object.keys(drawPool).length > 0;
        startBtn.disabled = !hasValidPool;
        
        if (!hasValidPool) {
            startBtn.innerHTML = '<i data-feather="alert-triangle"></i><span>没有可抽选的员工</span>';
        } else {
            startBtn.innerHTML = '<i data-feather="play"></i><span>开始抽选</span>';
        }
        
        feather.replace();
    }

    /**
     * 开始抽选
     */
    async startDraw() {
        const drawPool = dataProcessor.getDrawPool();
        
        if (Object.keys(drawPool).length === 0) {
            Utils.showToast('没有可抽选的员工', 'warning');
            return;
        }

        // 添加按钮点击动画
        const startBtn = document.getElementById('startDrawBtn');
        Utils.AnimationUtils.addTempClass(startBtn, 'btn-click', 200);

        try {
            await drawAnimation.startDrawAnimation(drawPool);
        } catch (error) {
            Utils.showToast('抽选失败: ' + error.message, 'error');
        }
    }

    /**
     * 显示页面
     */
    showPage(pageId) {
        // 隐藏所有页面
        const pages = document.querySelectorAll('.main-content');
        pages.forEach(page => {
            page.style.display = 'none';
        });

        // 显示目标页面
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.style.display = 'block';
            this.currentPage = pageId;
            
            // 添加页面切换动画
            targetPage.classList.add('page-transition-enter');
            setTimeout(() => {
                targetPage.classList.remove('page-transition-enter');
            }, 300);
        }

        // 如果是历史记录页面，加载历史数据
        if (pageId === 'historyPage') {
            this.loadHistoryData();
        }
    }

    /**
     * 显示首页
     */
    showHomePage() {
        // 重置抽选动画状态
        if (window.drawAnimation) {
            window.drawAnimation.resetAnimationState();
        }
        this.showPage('homePage');
    }

    /**
     * 显示历史记录页面
     */
    showHistoryPage() {
        this.showPage('historyPage');
        this.loadHistoryData();
    }

    /**
     * 加载历史数据
     */
    async loadHistoryData() {
        const historyContent = document.getElementById('historyContent');
        
        try {
            const historyRecords = await Utils.Storage.getHistory();

            if (historyRecords.length === 0) {
                historyContent.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i data-feather="clock"></i>
                        </div>
                        <div class="empty-title">暂无历史记录</div>
                        <div class="empty-desc">开始第一次抽选吧</div>
                    </div>
                `;
                feather.replace();
                return;
            }

            // 渲染历史记录列表
            historyContent.innerHTML = historyRecords.map(record => 
                this.createHistoryItemHTML(record)
            ).join('');

            feather.replace();
            
        } catch (error) {
            console.error('加载历史记录失败:', error);
            historyContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i data-feather="alert-circle"></i>
                    </div>
                    <div class="empty-title">加载历史记录失败</div>
                    <div class="empty-desc">${error.message}</div>
                </div>
            `;
            feather.replace();
        }
    }

    /**
     * 创建历史记录项HTML
     */
    createHistoryItemHTML(record) {
        const date = new Date(record.date);
        const departmentNames = Object.keys(record.departmentBreakdown).join('、');
        const title = record.periodLabel
            ? `${record.periodLabel} (${Utils.formatDateTime(date)})`
            : `${Utils.formatDateTime(date)}`;

        return `
            <div class="history-item hover-lift">
                <div class="history-header">
                    <span class="history-date">${title}</span>
                </div>
                <div class="history-stats">
                    <div class="history-stat">
                        <div class="stat-value">${record.rosterTotalCount || record.totalSelected}</div>
                        <div class="stat-desc">公司员工花名册总人数</div>
                    </div>
                    <div class="history-stat">
                        <div class="stat-value">${record.eligibleCount || record.totalSelected}</div>
                        <div class="stat-desc">参与抽签人数</div>
                    </div>
                    <div class="history-stat">
                        <div class="stat-value">${record.finalSelectedCount || record.totalSelected}</div>
                        <div class="stat-desc">本次参与调查人数</div>
                    </div>
                </div>
                <div class="history-description">
                    <strong>部门分布：</strong>${departmentNames}
                </div>
                <div class="history-actions">
                    <button class="btn-secondary btn-small" data-action="view-detail" data-record-id="${record.id}">
                        <i data-feather="eye"></i>
                        <span>查看详情</span>
                    </button>
                    <button class="btn-secondary btn-small" data-action="edit-record" data-record-id="${record.id}">
                        <i data-feather="edit"></i>
                        <span>编辑</span>
                    </button>
                    <button class="btn-danger btn-small" data-action="delete-record" data-record-id="${record.id}">
                        <i data-feather="trash-2"></i>
                        <span>删除</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 查看历史记录详情
     */
    async viewHistoryDetail(recordId) {
        try {
            const historyRecords = await Utils.Storage.getHistory();
            const record = historyRecords.find(r => r.id === recordId);

            if (!record) {
                Utils.showToast('记录不存在', 'error');
                return;
            }

            const departmentGroups = {};
            record.selectedEmployees.forEach(emp => {
                if (!departmentGroups[emp.department]) {
                    departmentGroups[emp.department] = [];
                }
                departmentGroups[emp.department].push(emp);
            });

            // 保存当前查看记录，供复制使用
            this.currentViewedRecord = record;

            let content = `
                <div class="record-detail">
                    <div class="record-section record-meta">
                        <h4>抽取时间</h4>
                        <p>${Utils.formatDateTime(new Date(record.date))}</p>
                    </div>
                    <div class="record-section record-stats">
                        <h4>统计信息</h4>
                        <p>公司员工花名册总人数：${record.rosterTotalCount || '未记录'}人</p>
                        <p>参与抽签人数：${record.eligibleCount || '未记录'}人</p>
                        <p>本次参与调查人数：${record.finalSelectedCount || record.totalSelected}人</p>
                        <p>涉及部门数：${record.departmentCount}个</p>
                    </div>
                    <div class="record-section record-list">
                        <h4>详细名单</h4>
            `;

            // 按部门显示，每个部门内按姓氏笔画排序
            Object.keys(departmentGroups).forEach(dept => {
                const employees = departmentGroups[dept];
                // 使用姓氏笔画排序
                const sortedEmployees = Utils.sortByStrokeOrder(employees);
                
                const names = sortedEmployees.map(emp => emp.name).join(' ');
                content += `
                    <div class=\"dept-line\">${dept} (${employees.length}人): ${names}</div>
                `;
            });

            // 结束详细名单分区
            content += `</div>`;
            
            // 添加总名单（按姓氏笔画排序的一串名单）
            const allEmployees = record.selectedEmployees || [];
            const allSortedNames = Utils.sortByStrokeOrder(allEmployees).map(emp => emp.name);
            
            if (allSortedNames.length > 0) {
                content += `
                    <div class="department-detail">
                        <h5>按姓氏笔画排列的总名单</h5>
                        <div class="name-string">
                            ${allSortedNames.join('、')}
                        </div>
                    </div>
                `;
            }

            content += `</div>`;

            Utils.showModal('抽选记录详情', content);

            // 设置页脚按钮：复制 + 关闭
            const footer = document.querySelector('.modal-footer');
            if (footer) {
                footer.innerHTML = `
                    <button class=\"btn-secondary\" data-action=\"copy-names\">复制人员名单</button>
                    <button class=\"btn-secondary\" data-action=\"modal-close\">关闭</button>
                `;
            }
            
        } catch (error) {
            console.error('查看历史记录详情失败:', error);
            Utils.showToast('查看记录详情失败: ' + error.message, 'error');
        }
    }

    /**
     * 编辑历史记录
     */
    async editHistoryRecord(recordId) {
        try {
            const historyRecords = await Utils.Storage.getHistory();
            const record = historyRecords.find(r => r.id === recordId);

            if (!record) {
                Utils.showToast('记录不存在', 'error');
                return;
            }

            // 按部门分组员工
            const departmentGroups = {};
            record.selectedEmployees.forEach(emp => {
                if (!departmentGroups[emp.department]) {
                    departmentGroups[emp.department] = [];
                }
                departmentGroups[emp.department].push(emp);
            });

            let content = `
                <div class="edit-record">
                    <p><strong>抽选时间：</strong>${Utils.formatDateTime(new Date(record.date))}</p>
                    <p class="edit-warning-text" style="margin: 16px 0;">
                        <i data-feather="alert-triangle" style="width: 16px; height: 16px; vertical-align: middle;"></i>
                        点击人员姓名后的删除按钮可以将其从历史记录中移除
                    </p>
                    <h4>编辑人员名单：</h4>
            `;

            // 为每个部门显示可编辑的员工列表
            Object.keys(departmentGroups).forEach(dept => {
                const employees = departmentGroups[dept];
                const sortedEmployees = Utils.sortByStrokeOrder(employees);
                
                content += `
                    <div class="department-detail edit-department">
                        <h5>${dept} (${employees.length}人)</h5>
                        <div class="editable-employee-list">
                            ${sortedEmployees.map((emp, index) => `
                                <div class="editable-employee-item" data-emp-name="${emp.name}" data-emp-dept="${emp.department}">
                                    <span class="employee-info">
                                        ${emp.name} (${emp.gender}, ${emp.subDepartment})
                                    </span>
                                    <button class="delete-employee-btn" data-action="delete-employee" data-record-id="${recordId}" data-name="${emp.name}" data-department="${emp.department}">
                                        <i data-feather="x"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            });

            content += `
                    <div class="edit-note">
                        <p class="edit-note-text" style="margin: 0;">
                            <strong>注意：</strong>删除人员将会影响降权机制的计算，该操作不可撤销。
                        </p>
                    </div>
                </div>
            `;

            Utils.showModal('编辑历史记录', content);
            
            // 重新渲染图标
            setTimeout(() => feather.replace(), 100);
            
        } catch (error) {
            console.error('编辑历史记录失败:', error);
            Utils.showToast('编辑记录失败: ' + error.message, 'error');
        }
    }

    /**
     * 从历史记录中删除单个员工
     */
    async deleteEmployeeFromHistory(recordId, employeeName, department) {
        if (!confirm(`确定要从历史记录中删除 ${employeeName} 吗？此操作无法恢复。`)) {
            return;
        }

        try {
            const historyRecords = await Utils.Storage.getHistory();
            const recordIndex = historyRecords.findIndex(r => r.id === recordId);
            
            if (recordIndex === -1) {
                Utils.showToast('记录不存在', 'error');
                return;
            }

            const record = historyRecords[recordIndex];
            
            // 从选中员工列表中删除该员工
            record.selectedEmployees = record.selectedEmployees.filter(emp => 
                !(emp.name === employeeName && emp.department === department)
            );
            
            // 更新统计数据
            record.finalSelectedCount = record.selectedEmployees.length;
            record.totalSelected = record.selectedEmployees.length;
            
            // 更新部门分布
            const newDepartmentBreakdown = {};
            record.selectedEmployees.forEach(emp => {
                newDepartmentBreakdown[emp.department] = (newDepartmentBreakdown[emp.department] || 0) + 1;
            });
            record.departmentBreakdown = newDepartmentBreakdown;
            record.departmentCount = Object.keys(newDepartmentBreakdown).length;

            // 保存更新后的记录
            await Utils.Storage.updateHistoryItem(recordId, record);
            
            Utils.showToast('员工已从历史记录中删除', 'success');
            
            // 重新打开编辑界面以显示更新
            Utils.closeModal();
            setTimeout(() => {
                this.editHistoryRecord(recordId);
            }, 300);
            
            // 刷新历史记录列表
            if (this.currentPage === 'historyPage') {
                setTimeout(() => {
                    this.loadHistoryData();
                }, 600);
            }
            
        } catch (error) {
            console.error('删除员工失败:', error);
            Utils.showToast('删除员工失败: ' + error.message, 'error');
        }
    }

    /**
     * 删除历史记录
     */
    async deleteHistoryRecord(recordId) {
        if (confirm('确定要删除这条历史记录吗？此操作无法恢复。')) {
            try {
                await Utils.Storage.deleteHistoryItem(recordId);
                await this.loadHistoryData();
                Utils.showToast('记录已删除', 'success');
            } catch (error) {
                console.error('删除历史记录失败:', error);
                Utils.showToast('删除记录失败: ' + error.message, 'error');
            }
        }
    }

    /**
     * 处理窗口大小变化
     */
    handleWindowResize() {
        // 重新计算抽签动画窗口大小
        const drawWindow = document.querySelector('.draw-window');
        if (drawWindow) {
            const windowWidth = window.innerWidth;
            if (windowWidth < 768) {
                drawWindow.style.minWidth = '90%';
            } else {
                drawWindow.style.minWidth = '400px';
            }
        }
    }

    /**
     * 处理键盘事件
     */
    handleKeydown(event) {
        // ESC键关闭模态框
        if (event.key === 'Escape') {
            const overlay = document.getElementById('modalOverlay');
            if (overlay.classList.contains('show')) {
                Utils.closeModal();
            }

            const drawOverlay = document.getElementById('drawOverlay');
            if (drawOverlay.classList.contains('show') && !drawAnimation.isAnimating) {
                drawOverlay.classList.remove('show');
            }
        }

        // Enter键触发操作
        if (event.key === 'Enter' && event.target.matches('input[type="file"]')) {
            event.target.click();
        }
    }

    /**
     * 处理页面离开前事件
     */
    handleBeforeUnload(event) {
        // 如果正在抽选，阻止离开
        if (drawAnimation.isAnimating) {
            event.preventDefault();
            event.returnValue = '抽选正在进行中，确定要离开吗？';
            return event.returnValue;
        }
    }

    /**
     * 重置UI状态
     */
    reset() {
        // 重置文件输入
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.value = '';
        }

        // 隐藏各个区域
        this.showParseStatus(false);
        document.getElementById('departmentSection').style.display = 'none';
        document.getElementById('operationsPanel').style.display = 'none';
        document.getElementById('actionSection').style.display = 'none';

        // 清空复选框状态
        const checkboxes = document.querySelectorAll('#operationsCheckboxes input[type="checkbox"]:not([disabled])');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        // 显示首页
        this.showPage('homePage');
    }
}

// 全局UI控制器实例
window.uiController = new UIController();

// 全局函数绑定
window.showHomePage = () => uiController.showHomePage();
window.showHistoryPage = () => uiController.showHistoryPage();
window.startDraw = () => uiController.startDraw();
window.deleteEmployee = (name, dept) => drawAnimation.deleteEmployee(name, dept);
window.supplementDraw = () => drawAnimation.supplementDraw();
window.saveResults = () => drawAnimation.saveResults();
window.offlineSave = () => drawAnimation.offlineSave();
// 保留 closeModal 用于HTML中的直接调用
window.closeModal = () => Utils.closeModal();