/**
 * 抽选动画控制模块
 */

class DrawAnimation {
    constructor() {
        this.isAnimating = false;
        this.currentResults = null;
        this.animationConfig = {
            prepareDuration: 1000,     // 准备阶段
            fastRollDuration: 3000,    // 快速滚动阶段
            slowRollDuration: 2000,    // 慢速滚动阶段
            finalRollDuration: 1500,   // 最终滚动阶段
            selectionDuration: 1000,   // 选中展示阶段
            confirmDuration: 1000      // 确认阶段
        };

        // 初始化AutoSaveManager
        this.autoSaveManager = new Utils.AutoSaveManager();
        this.initializeAutoSave();
    }

    /**
     * 初始化自动保存功能
     */
    async initializeAutoSave() {
        try {
            await this.autoSaveManager.initializeFileSystem();
            console.log('AutoSaveManager initialized successfully');
        } catch (error) {
            console.warn('Failed to initialize AutoSaveManager:', error);
        }
    }

    /**
     * 重置动画状态
     */
    resetAnimationState() {
        // 清理星空容器
        const starfield = document.getElementById('starfield');
        if (starfield) {
            starfield.innerHTML = '';
        }
        
        // 隐藏和重置结果窗口
        const resultWindow = document.getElementById('resultWindow');
        if (resultWindow) {
            resultWindow.style.display = 'none';
            resultWindow.classList.remove('fade-in');
        }
        
        // 清理任何残留的动画元素
        const overlay = document.getElementById('drawOverlay');
        if (overlay) {
            // 清除所有可能残留的名字星星
            const existingStars = overlay.querySelectorAll('.name-star');
            existingStars.forEach(star => star.remove());
            
            // 清除背景粒子
            const existingParticles = overlay.querySelectorAll('.background-particle');
            existingParticles.forEach(particle => particle.remove());
        }
        
        console.log('动画状态已重置');
    }

    /**
     * 开始抽选动画
     */
    async startDrawAnimation(drawPool) {
        if (this.isAnimating) {
            return;
        }

        this.isAnimating = true;
        
        try {
            console.log('开始星空抽选动画...');
            
            // 重置并清理之前的动画状态
            this.resetAnimationState();
            
            // 显示动画遮罩层
            const overlay = document.getElementById('drawOverlay');
            if (!overlay) {
                throw new Error('动画遮罩层元素未找到');
            }
            
            overlay.style.display = 'flex';
            setTimeout(() => {
                overlay.classList.add('show');
            }, 10);

            // 获取所有参与抽选的员工
            const allParticipants = this.getAllParticipants(drawPool);
            
            if (allParticipants.length === 0) {
                throw new Error('没有参与抽选的员工');
            }

            // 执行实际抽选逻辑
            const drawResults = await dataProcessor.performDraw();
            
            if (drawResults.length === 0) {
                throw new Error('抽选结果为空');
            }

            // 开始星空动画
            await this.startStarfieldAnimation(allParticipants, drawResults);
            
            // 延迟后隐藏遮罩层并显示结果 (7秒总时间：5秒动画 + 2秒结果展示)
            setTimeout(() => {
                overlay.classList.remove('show');
                setTimeout(() => {
                    overlay.style.display = 'none';
                    this.isAnimating = false;
                    this.showResults(drawResults);
                }, 500);
            }, 7000);

        } catch (error) {
            this.isAnimating = false;
            const overlay = document.getElementById('drawOverlay');
            overlay.classList.remove('show');
            overlay.style.display = 'none';
            Utils.showToast('抽选过程出错: ' + error.message, 'error');
            throw error;
        }
    }

    /**
     * 获取所有参与抽选的员工
     */
    getAllParticipants(drawPool) {
        const participants = [];
        
        Object.keys(drawPool).forEach(dept => {
            const employees = drawPool[dept].employees;
            employees.forEach(emp => {
                participants.push({
                    name: emp['姓名'],
                    gender: emp['性别'],
                    department: emp['部门'],
                    subDepartment: emp['分部门']
                });
            });
        });

        return participants;
    }

    /**
     * 开始星空动画
     */
    async startStarfieldAnimation(allParticipants, drawResults) {
        const starfield = document.getElementById('starfield');
        const resultWindow = document.getElementById('resultWindow');
        
        // 清空星空容器
        starfield.innerHTML = '';
        
        // 创建背景粒子
        this.createBackgroundParticles(starfield);
        
        // 获取所有被选中的员工
        const selectedEmployees = [];
        drawResults.forEach(dept => {
            selectedEmployees.push(...dept.employees);
        });
        
        // 开始名字星星动画
        let nameIndex = 0;
        const createStarInterval = setInterval(() => {
            if (nameIndex < allParticipants.length) {
                this.createNameStar(starfield, allParticipants[nameIndex].name);
                nameIndex++;
            } else {
                clearInterval(createStarInterval);
            }
        }, 100); // 每100ms创建一个名字星星
        
        // 5秒后显示结果
        setTimeout(() => {
            this.showStarfieldResult(selectedEmployees, resultWindow);
        }, 5000);
    }

    /**
     * 创建背景粒子
     */
    createBackgroundParticles(container) {
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'background-particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 3 + 's';
            container.appendChild(particle);
        }
    }

    /**
     * 创建名字星星
     */
    createNameStar(container, name) {
        const star = document.createElement('div');
        star.className = 'name-star';
        star.textContent = name;
        
        // 随机起始位置（屏幕底部）
        star.style.left = Math.random() * 80 + 10 + '%';
        star.style.top = '100vh';
        
        // 随机化动画时间
        const duration = 4.5 + Math.random() * 1; // 4.5-5.5秒
        star.style.animationDuration = duration + 's';
        
        container.appendChild(star);
        
        // 动画结束后移除元素
        setTimeout(() => {
            if (star.parentNode) {
                star.parentNode.removeChild(star);
            }
        }, duration * 1000);
    }

    /**
     * 显示星空动画结果
     */
    showStarfieldResult(selectedEmployees, resultWindow) {
        const selectedNameEl = document.getElementById('starfieldSelectedName');
        const resultInfoEl = document.getElementById('starfieldResultInfo');
        
        if (selectedEmployees.length > 0) {
            // 随机选择一个员工作为展示（或显示总数）
            if (selectedEmployees.length === 1) {
                selectedNameEl.textContent = selectedEmployees[0].name;
                resultInfoEl.textContent = `恭喜 ${selectedEmployees[0].name} 被选中！`;
            } else {
                selectedNameEl.textContent = `${selectedEmployees.length}名员工`;
                resultInfoEl.textContent = `恭喜${selectedEmployees.length}名员工被选中参与满意度调查！`;
            }
        } else {
            selectedNameEl.textContent = '抽选完成';
            resultInfoEl.textContent = '本次抽选已完成';
        }
        
        // 显示结果窗口
        resultWindow.style.display = 'block';
        setTimeout(() => {
            resultWindow.classList.add('fade-in');
        }, 100);
    }


    /**
     * 显示抽选结果
     */
    showResults(results) {
        this.currentResults = results;
        
        // 更新结果统计
        const totalSelected = results.reduce((sum, dept) => sum + dept.employees.length, 0);
        const departmentCount = results.length;
        
        document.getElementById('totalSelected').textContent = totalSelected;
        document.getElementById('departmentCount').textContent = departmentCount;
        
        // 渲染结果列表
        this.renderResultList(results);

        // 初始隐藏“离线保存/导出/复制”按钮，待保存人员名单后再显示
        const offlineBtn = document.getElementById('offlineSaveBtn');
        if (offlineBtn) {
            offlineBtn.style.display = 'none';
        }
        // 初始隐藏“复制人员名单”按钮
        const copyBtn = document.getElementById('copyNamesBtn');
        if (copyBtn) {
            copyBtn.style.display = 'none';
        }
        const exportBtnInit = document.getElementById('exportBtn');
        if (exportBtnInit) {
            exportBtnInit.style.display = 'none';
        }
        const saveBtnInit = document.getElementById('saveBtn');
        if (saveBtnInit) {
            saveBtnInit.style.display = 'inline-flex';
        }
        
        // 显示结果页面
        this.showPage('resultPage');

        // 根据与最近历史是否相同（姓名+部门）更新按钮显示
        this.evaluateDuplicateAndToggleButtons();
    }

    /**
     * 渲染结果列表
     */
    renderResultList(results) {
        const resultContent = document.getElementById('resultContent');
        resultContent.innerHTML = '';
        
        results.forEach(deptResult => {
            const deptElement = this.createDepartmentResultElement(deptResult);
            resultContent.appendChild(deptElement);
        });
        
        // 重新渲染Feather图标
        feather.replace();
    }

    /**
     * 创建部门结果元素
     */
    createDepartmentResultElement(deptResult) {
        const deptDiv = document.createElement('div');
        deptDiv.className = 'result-department';
        
        deptDiv.innerHTML = `
            <div class="department-title">
                <span>${deptResult.department}</span>
                <span class="person-count">${deptResult.employees.length}人</span>
            </div>
            <div class="person-list">
                ${deptResult.employees.map(emp => `
                    <div class="person-item" data-name="${emp.name}" data-department="${emp.department}">
                        <div class="person-info">
                            <span class="person-name">${emp.name}</span>
                            <span class="person-gender ${emp.gender === '女' ? 'female' : ''}">${emp.gender}</span>
                            <span class="person-subdept">${emp.subDepartment}</span>
                        </div>
                        <button class="delete-btn" onclick="deleteEmployee('${emp.name}', '${emp.department}')">
                            <i data-feather="x"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
        
        return deptDiv;
    }

    /**
     * 页面切换
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
            targetPage.classList.add('page-transition-enter');
            
            setTimeout(() => {
                targetPage.classList.remove('page-transition-enter');
            }, 300);
        }
    }

    /**
     * 删除员工
     */
    deleteEmployee(employeeName, departmentName) {
        if (!this.currentResults) return;
        
        // 添加删除动画
        const personItem = document.querySelector(`[data-name="${employeeName}"][data-department="${departmentName}"]`);
        if (personItem) {
            personItem.classList.add('delete-animation');
            
            setTimeout(() => {
                // 从结果中删除员工
                this.currentResults.forEach(dept => {
                    if (dept.department === departmentName) {
                        dept.employees = dept.employees.filter(emp => emp.name !== employeeName);
                    }
                });
                
                // 重新渲染结果
                this.renderResultList(this.currentResults);
                
                // 更新统计
                const totalSelected = this.currentResults.reduce((sum, dept) => sum + dept.employees.length, 0);
                document.getElementById('totalSelected').textContent = totalSelected;
                
                // 显示补充按钮
                this.checkShowSupplementButton();
                
                Utils.showToast(`已删除员工: ${employeeName}`, 'success');
            }, 300);
        }
    }

    /**
     * 检查是否显示补充按钮
     */
    checkShowSupplementButton() {
        const supplementBtn = document.getElementById('supplementBtn');
        const drawPool = dataProcessor.getDrawPool();
        
        let needSupplement = false;
        
        Object.keys(drawPool).forEach(dept => {
            const targetCount = drawPool[dept].drawCount;
            const currentResult = this.currentResults.find(r => r.department === dept);
            const currentCount = currentResult ? currentResult.employees.length : 0;
            
            if (currentCount < targetCount) {
                needSupplement = true;
            }
        });
        
        supplementBtn.style.display = needSupplement ? 'inline-flex' : 'none';

        // 当需要补充时，隐藏保存/导出/离线按钮
        const toggle = (el, show) => { if (el) el.style.display = show ? 'inline-flex' : 'none'; };
        const saveBtn = document.getElementById('saveBtn');
        const exportBtn = document.getElementById('exportBtn');
        const offlineBtn = document.getElementById('offlineSaveBtn');
        const copyBtn = document.getElementById('copyNamesBtn');

        if (needSupplement) {
            toggle(saveBtn, false);
            toggle(exportBtn, false);
            toggle(offlineBtn, false);
            toggle(copyBtn, false);
        } else {
            // 无需补充：保存按钮显示；其他按钮在保存后显示
            toggle(saveBtn, true);
            const saved = this._isResultsSaved();
            toggle(exportBtn, saved);
            toggle(offlineBtn, saved);
            toggle(copyBtn, saved);
        }
    }

    /**
     * 计算当前结果是否需要补充
     */
    computeNeedSupplement() {
        const drawPool = dataProcessor.getDrawPool();
        let need = false;
        Object.keys(drawPool).forEach(dept => {
            const targetCount = drawPool[dept].drawCount;
            const currentResult = this.currentResults.find(r => r.department === dept);
            const currentCount = currentResult ? currentResult.employees.length : 0;
            if (currentCount < targetCount) {
                need = true;
            }
        });
        return need;
    }

    /**
     * 判断与最近历史（姓名+部门）是否相同，若相同则隐藏保存、显示导出/复制/离线
     */
    async evaluateDuplicateAndToggleButtons() {
        try {
            if (!this.currentResults || this.currentResults.length === 0) return;
            // 若需要补充，交由 checkShowSupplementButton 隐藏即可
            if (this.computeNeedSupplement()) return;

            const historyList = await Utils.Storage.getHistory();
            if (!Array.isArray(historyList) || historyList.length === 0) return;

            const last = historyList[0];
            const lastKeys = (last && Array.isArray(last.selectedEmployees))
                ? last.selectedEmployees.map(e => e && `${e.name}|${e.department}`).filter(Boolean)
                : [];

            const currentKeys = [];
            this.currentResults.forEach(dept => {
                dept.employees.forEach(emp => {
                    currentKeys.push(`${emp.name}|${emp.department}`);
                });
            });

            const norm = arr => arr.slice().sort().join('|');
            if (currentKeys.length > 0 && norm(lastKeys) === norm(currentKeys)) {
                const saveBtn = document.getElementById('saveBtn');
                const exportBtn = document.getElementById('exportBtn');
                const copyBtn = document.getElementById('copyNamesBtn');
                const offlineBtn = document.getElementById('offlineSaveBtn');
                if (saveBtn) saveBtn.style.display = 'none';
                if (exportBtn) exportBtn.style.display = 'inline-flex';
                if (copyBtn) copyBtn.style.display = 'inline-flex';
                if (offlineBtn) offlineBtn.style.display = 'inline-flex';
                Utils.showToast('本次结果与上次一致，无需保存', 'success');
            }
        } catch (e) {
            console.warn('评估重复结果失败:', e);
        }
    }

    /**
     * 补充抽选
     */
    async supplementDraw() {
        if (this.isAnimating || !this.currentResults) {
            return;
        }

        try {
            // 计算需要补充的员工信息
            const deletedEmployees = this.calculateDeletedEmployees();
            
            if (deletedEmployees.length === 0) {
                Utils.showToast('没有需要补充的员工', 'info');
                return;
            }

            // 执行补充抽选
            const supplementResults = await dataProcessor.supplementDraw(this.currentResults, deletedEmployees);
            
            if (supplementResults.length === 0) {
                Utils.showToast('没有可补充的员工', 'warning');
                return;
            }

            // 将补充结果合并到当前结果
            this.mergeSupplementResults(supplementResults);
            
            // 重新渲染结果
            this.renderResultList(this.currentResults);
            
            // 更新统计
            const totalSelected = this.currentResults.reduce((sum, dept) => sum + dept.employees.length, 0);
            document.getElementById('totalSelected').textContent = totalSelected;
            
            // 检查是否还需要补充
            this.checkShowSupplementButton();
            
            Utils.showToast('补充抽选完成', 'success');

        } catch (error) {
            Utils.showToast('补充抽选失败: ' + error.message, 'error');
        }
    }

    /**
     * 计算被删除的员工信息
     */
    calculateDeletedEmployees() {
        const deletedEmployees = [];
        const drawPool = dataProcessor.getDrawPool();
        
        Object.keys(drawPool).forEach(dept => {
            const targetCount = drawPool[dept].drawCount;
            const currentResult = this.currentResults.find(r => r.department === dept);
            const currentCount = currentResult ? currentResult.employees.length : 0;
            const shortage = targetCount - currentCount;
            
            if (shortage > 0) {
                // 为每个缺额创建一个删除记录
                for (let i = 0; i < shortage; i++) {
                    deletedEmployees.push({
                        name: `deleted_${dept}_${i}`,
                        department: dept
                    });
                }
            }
        });
        
        return deletedEmployees;
    }

    /**
     * 合并补充结果
     */
    mergeSupplementResults(supplementResults) {
        supplementResults.forEach(supplement => {
            const existingResult = this.currentResults.find(r => r.department === supplement.department);
            
            if (existingResult) {
                // 添加到现有部门
                existingResult.employees.push(...supplement.employees);
            } else {
                // 创建新的部门结果
                this.currentResults.push({
                    department: supplement.department,
                    employees: supplement.employees,
                    totalAvailable: supplement.employees.length,
                    targetCount: supplement.employees.length
                });
            }
        });
    }

    /** 标记当前结果已保存，用于按钮显隐控制 */
    _markResultsSaved() {
        this._savedFlag = true;
    }

    /** 当前结果是否已保存 */
    _isResultsSaved() {
        return this._savedFlag === true;
    }

    /**
     * 保存抽选结果
     */
    async saveResults() {
        if (!this.currentResults || this.currentResults.length === 0) {
            Utils.showToast('没有可保存的结果', 'warning');
            return;
        }
        try {
            // 弹出保存信息选择（年份、季度）
            const now = new Date();
            const currentYear = now.getFullYear();
            const years = [];
            for (let y = currentYear - 5; y <= currentYear + 1; y++) years.push(y);
            const quarterOptions = ['第一季度', '第二季度', '第三季度', '第四季度'];

            const content = `
                <div class="save-meta-form">
                    <div class="form-row" style="display:flex; gap:12px; align-items:center;">
                        <label for="saveYearSelect">年份</label>
                        <select id="saveYearSelect" class="btn-secondary" style="height:40px; padding:0 12px;">
                            ${years.map(y => `<option value="${y}" ${y===currentYear?'selected':''}>${y}年</option>`).join('')}
                        </select>
                        <label for="saveQuarterSelect">季度</label>
                        <select id="saveQuarterSelect" class="btn-secondary" style="height:40px; padding:0 12px;">
                            ${quarterOptions.map((q, idx) => `<option value="${q}" ${Math.floor(now.getMonth()/3)===idx?'selected':''}>${q}</option>`).join('')}
                        </select>
                    </div>
                    <p class="edit-note" style="margin-top:16px;">
                        <span class="edit-note-text">选择的年份与季度将作为此次记录的命名信息。</span>
                    </p>
                </div>
            `;
            Utils.showModal('保存设置', content);
            const footer = document.querySelector('.modal-footer');
            if (footer) {
                footer.innerHTML = `
                    <button class="btn-secondary" data-action="confirm-save-meta">确定保存</button>
                    <button class="btn-secondary" data-action="modal-close">取消</button>
                `;
            }
        } catch (error) {
            console.error('打开保存设置失败:', error);
            Utils.showToast('无法打开保存设置: ' + error.message, 'error');
        }
    }

    /**
     * 确认保存：带年份与季度信息
     */
    async finalizeSaveWithMeta(year, quarter) {
        if (!this.currentResults || this.currentResults.length === 0) {
            Utils.showToast('没有可保存的结果', 'warning');
            return;
        }
        try {
            const timestamp = new Date();
            const totalCount = this.currentResults.reduce((sum, dept) => sum + dept.employees.length, 0);
            const totalEmployeesInRoster = dataProcessor.rawData ? dataProcessor.rawData.length : 0;
            const eligibleEmployeesCount = dataProcessor.processedData ? dataProcessor.processedData.length : 0;

            const periodLabel = `${year}年${quarter}满意度调查人员名单`;
            this.currentPeriodLabel = periodLabel;

            const historyRecord = {
                id: Utils.generateId(),
                date: timestamp.toISOString(),
                totalSelected: totalCount,
                departmentCount: this.currentResults.length,
                rosterTotalCount: totalEmployeesInRoster,
                eligibleCount: eligibleEmployeesCount,
                finalSelectedCount: totalCount,
                selectedEmployees: [],
                departmentBreakdown: {},
                periodYear: year,
                periodQuarter: quarter,
                periodLabel: periodLabel
            };
            this.currentResults.forEach(dept => {
                historyRecord.departmentBreakdown[dept.department] = dept.employees.length;
                dept.employees.forEach(emp => {
                    historyRecord.selectedEmployees.push({
                        name: emp.name,
                        gender: emp.gender,
                        department: emp.department,
                        subDepartment: emp.subDepartment
                    });
                });
            });

            // 去重判断（按姓名集合）
            const historyList = await Utils.Storage.getHistory();
            let justUpdatedLast = false;
            if (Array.isArray(historyList) && historyList.length > 0) {
                const last = historyList[0];
                const lastNames = (last && Array.isArray(last.selectedEmployees))
                    ? last.selectedEmployees.map(e => e && e.name).filter(Boolean)
                    : [];
                const currentNames = historyRecord.selectedEmployees.map(e => e.name);
                const normalize = arr => arr.slice().sort().join('|');
                if (normalize(lastNames) === normalize(currentNames) && currentNames.length > 0) {
                    if (last && last.id) {
                        await Utils.Storage.updateHistoryItem(last.id, { date: timestamp.toISOString(), periodYear: year, periodQuarter: quarter, periodLabel });
                    } else {
                        historyList[0] = { ...last, date: timestamp.toISOString(), periodYear: year, periodQuarter: quarter, periodLabel };
                        await Utils.Storage.writeHistoryFile(historyList);
                    }
                    justUpdatedLast = true;
                }
            }

            if (!justUpdatedLast) {
                await Utils.Storage.saveHistory(historyRecord);
            }

            // 使用AutoSaveManager自动保存到文件系统
            try {
                const autoSaveResult = await this.autoSaveManager.saveDrawResults({
                    historyRecord: historyRecord,
                    results: this.currentResults,
                    employees: this.currentResults.flatMap(dept => dept.employees.map(emp => ({
                        name: emp.name,
                        gender: emp.gender,
                        department: emp.department,
                        subDepartment: emp.subDepartment
                    }))),
                    periodInfo: {
                        year: year,
                        quarter: quarter,
                        periodLabel: periodLabel
                    },
                    drawMode: this.drawMode || '普通模式'
                }, {
                    filename: justUpdatedLast ? null : `${periodLabel}.json`,
                    autoNaming: justUpdatedLast ? false : true,
                    showNotification: true
                });

                if (autoSaveResult.success) {
                    console.log('Auto-save completed:', autoSaveResult);
                }
            } catch (saveError) {
                console.warn('Auto-save to file system failed:', saveError);
                // 不阻止主保存流程，只记录警告
            }

            Utils.closeModal();
            Utils.showToast(justUpdatedLast ? '与上次名单相同，已更新最近记录时间' : `已保存：${periodLabel}`, 'success');

            // 显示导出/复制/离线
            const offlineBtn = document.getElementById('offlineSaveBtn');
            if (offlineBtn) offlineBtn.style.display = 'inline-flex';
            const exportBtn = document.getElementById('exportBtn');
            if (exportBtn) exportBtn.style.display = 'inline-flex';
            const copyBtn = document.getElementById('copyNamesBtn');
            if (copyBtn) copyBtn.style.display = 'inline-flex';
            this._markResultsSaved();

        } catch (e) {
            console.error('保存失败:', e);
            Utils.showToast('保存失败: ' + e.message, 'error');
        }
    }

    /**
     * 离线保存（导出包含所有历史的JSON文件，并提示手动保存位置与复制路径）
     */
    async offlineSave() {
        try {
            const history = await Utils.Storage.getHistory();
            const jsonContent = JSON.stringify(history, null, 2);
            const filename = 'draw_history.json';

            // 1) 直接下载离线JSON
            Utils.downloadFile(jsonContent, filename, 'application/json');

            // 2) 检测环境并提供相应的保存说明
            let folderPath = '';
            let saveDescription = '';

            if (window.__TAURI__) {
                // Tauri环境：获取实际的数据目录路径
                try {
                    const { invoke } = window.__TAURI__.core;
                    const actualDataPath = await invoke('get_data_directory');
                    folderPath = actualDataPath;
                    saveDescription = '数据已自动保存到应用的数据目录中。手动备份时，可将此文件保存到相同目录。';
                } catch (pathError) {
                    console.warn('获取数据目录路径失败，使用默认提示:', pathError);
                    folderPath = '应用数据目录';
                    saveDescription = '数据已自动保存到应用的数据目录中。';
                }
            } else {
                // 浏览器环境
                folderPath = '浏览器下载目录';
                saveDescription = '在浏览器环境中，文件已下载到浏览器的下载目录。如需数据备份，请妥善保存下载的文件。';
            }

            const modalHtml = `
                <div style="line-height:1.8;">
                    <p>已生成包含所有历史记录的 JSON 文件：<strong>${filename}</strong></p>
                    <p>${saveDescription}</p>
                    <div style="display:flex; gap:8px; align-items:center; background:#f7f8fa; padding:8px 12px; border-radius:8px;">
                        <span style="flex:1; color:#3370ff; font-weight:500;">📁 ${folderPath}</span>
                    </div>
                    <div style="margin-top:12px; padding:10px; background:#e8f4ff; border-radius:6px; font-size:13px; color:#0066cc;">
                        <strong>💡 新功能提示：</strong>现在数据会自动保存到本地文件系统，无需手动操作！此离线保存功能主要用于数据备份和迁移。
                    </div>
                </div>
            `;
            Utils.showModal('数据保存说明', modalHtml);
        } catch (e) {
            console.error('离线保存失败:', e);
            Utils.showToast('离线保存失败: ' + e.message, 'error');
        }
    }

    /**
     * 重置抽选状态
     */
    reset() {
        this.isAnimating = false;
        this.currentResults = null;
        
        // 重置动画状态
        this.resetAnimationState();
        
        // 清空结果显示
        const resultContent = document.getElementById('resultContent');
        if (resultContent) {
            resultContent.innerHTML = '';
        }
        
        // 隐藏补充按钮
        const supplementBtn = document.getElementById('supplementBtn');
        if (supplementBtn) {
            supplementBtn.style.display = 'none';
        }

        // 隐藏"离线保存"按钮
        const offlineBtn = document.getElementById('offlineSaveBtn');
        if (offlineBtn) {
            offlineBtn.style.display = 'none';
        }
        
        // 重置统计显示
        document.getElementById('totalSelected').textContent = '0';
        document.getElementById('departmentCount').textContent = '0';
        
        // 确保动画遮罩层完全隐藏
        const overlay = document.getElementById('drawOverlay');
        if (overlay) {
            overlay.classList.remove('show');
            overlay.style.display = 'none';
        }
    }
}

// 创建全局抽选动画实例
window.drawAnimation = new DrawAnimation();