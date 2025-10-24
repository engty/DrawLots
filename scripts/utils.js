/**
 * 工具函数库
 */

// Toast 提示函数
let currentToastTimeout = null;

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast ? toast.querySelector('i') : null;
    
    if (!toast || !toastMessage) {
        console.error('Toast元素未找到');
        return;
    }
    
    // 如果有正在显示的Toast，先清除定时器
    if (currentToastTimeout) {
        clearTimeout(currentToastTimeout);
        currentToastTimeout = null;
    }
    
    // 更新内容
    toastMessage.textContent = message;
    
    // 更新图标和样式
    toast.className = 'toast ' + type;
    
    if (toastIcon) {
        switch (type) {
            case 'success':
                toastIcon.setAttribute('data-feather', 'check-circle');
                break;
            case 'error':
                toastIcon.setAttribute('data-feather', 'alert-circle');
                break;
            case 'warning':
                toastIcon.setAttribute('data-feather', 'alert-triangle');
                break;
            default:
                toastIcon.setAttribute('data-feather', 'info');
        }
        
        // 重新渲染图标
        feather.replace();
    }
    
    // 显示toast
    toast.classList.add('show');
    
    // 3秒后自动隐藏
    currentToastTimeout = setTimeout(() => {
        toast.classList.remove('show');
        currentToastTimeout = null;
    }, 3000);
}

// 显示/隐藏弹窗
function showModal(title, content) {
    const overlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!overlay || !modalTitle || !modalBody) {
        console.error('弹窗元素缺失');
        return;
    }
    
    // 设置内容
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    
    // 强制显示 - 解决CSS过渡问题
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    overlay.style.visibility = 'visible';
    overlay.style.zIndex = '9999';
    overlay.classList.add('show');
    
    // 替换feather图标
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        // 延迟隐藏，让CSS过渡动画完成
        setTimeout(() => {
            overlay.style.display = 'none';
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
        }, 300); // 与CSS过渡时间一致
    }
}

// 格式化日期
function formatDate(date) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return date.toLocaleDateString('zh-CN', options);
}

// 格式化时间
function formatDateTime(date) {
    const options = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('zh-CN', options);
}

// 生成唯一ID
function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 深拷贝对象
function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, wait) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, wait);
        }
    }
}

// 数组随机打乱
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 加权随机选择
function weightedRandomChoice(items, weights) {
    if (items.length !== weights.length) {
        throw new Error('Items and weights arrays must have the same length');
    }
    
    // 计算总权重
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    // 生成随机数
    let random = Math.random() * totalWeight;
    
    // 根据权重选择
    for (let i = 0; i < items.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return items[i];
        }
    }
    
    // 兜底返回最后一个
    return items[items.length - 1];
}

// 计算抽选人数
function calculateDrawCount(departmentSize) {
    if (departmentSize <= 10) return 1;
    if (departmentSize <= 20) return 2;
    if (departmentSize <= 50) return 3;
    if (departmentSize <= 100) return 4;
    return 8;
}

// 验证Excel文件
function validateExcelFile(file) {
    if (!file) {
        return { valid: false, message: '请选择文件' };
    }
    
    if (!file.name.endsWith('.xlsx')) {
        return { valid: false, message: '仅支持.xlsx格式文件' };
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB限制
        return { valid: false, message: '文件大小不能超过10MB' };
    }
    
    return { valid: true };
}

// 过滤有效员工
function filterValidEmployees(employees) {
    return employees.filter(emp => {
        // 必须在岗
        if (emp['在职状态'] !== '在岗') return false;
        
        // 排除实习生和长假人员
        if (emp['岗位'] === '实习生' || emp['岗位'] === '长假人员') return false;
        
        // 排除厂部和总工室部门
        if (emp['部门'] === '厂部' || emp['部门'] === '总工室') return false;
        
        // 必须有姓名和部门信息
        if (!emp['姓名'] || !emp['部门'] || !emp['分部门']) return false;
        
        return true;
    });
}

// 过滤可参与抽签的员工（在有效员工基础上进一步筛选）
function filterDrawableEmployees(employees) {
    return employees.filter(emp => {
        // 排除包含'部长'字符串的岗位，但保留'副部长'
        const position = emp['岗位'] || '';
        if (position.includes('部长') && !position.includes('副部长')) {
            return false;
        }
        
        return true;
    });
}

// 按部门分组
function groupByDepartment(employees) {
    const groups = {};
    
    employees.forEach(emp => {
        const dept = emp['部门'];
        if (!groups[dept]) {
            groups[dept] = [];
        }
        groups[dept].push(emp);
    });
    
    return groups;
}

// 按分部门分组
function groupBySubDepartment(employees) {
    const groups = {};
    
    employees.forEach(emp => {
        const subDept = emp['分部门'];
        if (!groups[subDept]) {
            groups[subDept] = [];
        }
        groups[subDept].push(emp);
    });
    
    return groups;
}

// 检查是否为运行部
function isOperationsDepartment(departmentName) {
    return departmentName === '运行部';
}

// 获取运行部默认参与的分部门
function getDefaultOperationsSubDepts() {
    return ['运行部办公室', '运管环化分部'];
}

// 获取运行部可选择的分部门
function getOptionalOperationsSubDepts() {
    return ['运行A值', '运行B值', '运行C值', '运行D值', '运行F值'];
}

// 计算降权权重
function calculateDowngradeWeight(employeeName, historyRecords) {
    // 确保historyRecords是一个数组
    if (!historyRecords || !Array.isArray(historyRecords) || historyRecords.length === 0) {
        return 1.0; // 正常权重
    }
    
    // 查找该员工在历史记录中的出现次数和时间
    const appearances = [];
    
    historyRecords.forEach(record => {
        if (record && record.selectedEmployees && Array.isArray(record.selectedEmployees) && 
            record.selectedEmployees.some(emp => emp && emp.name === employeeName)) {
            appearances.push(new Date(record.date));
        }
    });
    
    if (appearances.length === 0) {
        return 1.0; // 从未被抽中，正常权重
    }
    
    // 按时间排序，最近的在前
    appearances.sort((a, b) => b - a);
    
    // 只看前两次记录
    const recentAppearances = appearances.slice(0, 2);
    
    if (recentAppearances.length >= 2) {
        // 前两次都被抽中，降权到1%
        return 0.01;
    }
    
    // 只有一次被抽中，检查是否在前两次记录内
    if (recentAppearances.length === 1) {
        const recentRecords = historyRecords
            .filter(record => record && record.date)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 2);
        
        if (recentRecords.some(record => 
            record && record.selectedEmployees && Array.isArray(record.selectedEmployees) &&
            record.selectedEmployees.some(emp => emp && emp.name === employeeName)
        )) {
            return 0.01; // 在前两次记录中，降权
        }
    }
    
    return 1.0; // 其他情况正常权重
}

// 下载文件
function downloadFile(content, filename, contentType = 'text/plain') {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// 生成Markdown内容
function generateMarkdown(results, timestamp) {
    let markdown = `# 员工满意度调查抽选结果\n\n`;
    markdown += `**抽选时间：** ${formatDateTime(timestamp)}\n`;
    markdown += `**总抽选人数：** ${results.reduce((sum, dept) => sum + dept.employees.length, 0)}\n`;
    markdown += `**涉及部门数：** ${results.length}\n\n`;
    
    markdown += `## 抽选结果明细\n\n`;
    
    results.forEach((dept, index) => {
        markdown += `### ${index + 1}. ${dept.department}\n\n`;
        markdown += `| 序号 | 姓名 | 性别 | 分部门 |\n`;
        markdown += `|------|------|------|--------|\n`;
        
        dept.employees.forEach((emp, empIndex) => {
            markdown += `| ${empIndex + 1} | ${emp.name} | ${emp.gender} | ${emp.subDepartment} |\n`;
        });
        
        markdown += `\n**小计：** ${dept.employees.length}人\n\n`;
    });
    
    markdown += `---\n\n`;
    markdown += `*本名单由员工满意度调查抽选系统自动生成*\n`;
    
    return markdown;
}

// 文件系统存储操作
const Storage = {
    historyFilePath: 'draw_history.json',

    async readHistoryFile() {
        // 优先尝试桌面存储
        if (window.desktopStorage && window.desktopStorage.available) {
            try {
                const history = await window.desktopStorage.readHistory();
                this._writeToBrowserCache(history);
                return Array.isArray(history) ? history : [];
            } catch (error) {
                console.error('读取桌面历史记录失败:', error);
                window.desktopStorage.available = false;
                showToast('读取桌面数据失败，已回退到浏览器存储', 'warning');
            }
        }

        return this._readFromBrowserCache();
    },

    async writeHistoryFile(history) {
        if (!Array.isArray(history)) {
            throw new Error('历史记录必须是数组');
        }

        if (window.desktopStorage && window.desktopStorage.available) {
            try {
                await window.desktopStorage.writeHistory(history);
            } catch (error) {
                console.error('写入桌面历史记录失败:', error);
                window.desktopStorage.available = false;
                showToast('写入桌面数据失败，已暂存至浏览器存储', 'error');
            }
        }

        this._writeToBrowserCache(history);
    },

    async saveHistory(record) {
        const history = await this.getHistory();
        history.unshift(record);
        if (history.length > 200) {
            history.splice(200);
        }
        await this.writeHistoryFile(history);
    },

    async getHistory() {
        return await this.readHistoryFile();
    },

    async deleteHistoryItem(id) {
        const history = await this.getHistory();
        const filtered = history.filter(item => item.id !== id);
        await this.writeHistoryFile(filtered);
    },

    async updateHistoryItem(id, updatedRecord) {
        const history = await this.getHistory();
        const index = history.findIndex(item => item.id === id);
        if (index !== -1) {
            history[index] = { ...history[index], ...updatedRecord };
            await this.writeHistoryFile(history);
        }
    },

    _readFromBrowserCache() {
        try {
            const history = localStorage.getItem('drawHistory');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('读取浏览器缓存失败:', error);
            return [];
        }
    },

    _writeToBrowserCache(history) {
        try {
            localStorage.setItem('drawHistory', JSON.stringify(history));
        } catch (error) {
            console.warn('写入浏览器缓存失败:', error);
        }
    }
};

// 复制文本到剪贴板
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        // 回退：创建临时文本域
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
    } catch (e) {
        console.error('复制到剪贴板失败:', e);
        return false;
    }
}

// 姓氏笔画排序工具
function sortByStrokeOrder(employees) {
    // 常用姓氏笔画数据（简化版本，包含常用姓氏）
    const strokeOrder = {
        '王': 4, '李': 7, '张': 7, '刘': 6, '陈': 7, '杨': 7, '黄': 12, '赵': 9, '吴': 7, '周': 8,
        '徐': 10, '孙': 6, '马': 3, '朱': 6, '胡': 9, '郭': 10, '何': 7, '林': 8, '高': 10, '罗': 8,
        '郑': 8, '梁': 11, '谢': 12, '唐': 10, '韩': 12, '冯': 5, '于': 3, '董': 12, '萧': 11, '程': 12,
        '曹': 11, '袁': 10, '邓': 4, '许': 6, '傅': 12, '沈': 7, '曾': 12, '彭': 12, '吕': 6, '苏': 7,
        '卢': 5, '蒋': 12, '蔡': 14, '贾': 10, '丁': 2, '魏': 17, '薛': 16, '叶': 5, '阎': 11, '余': 7,
        '潘': 15, '杜': 7, '戴': 17, '夏': 10, '钟': 9, '汪': 7, '田': 5, '任': 6, '姜': 9, '范': 8,
        '方': 4, '石': 5, '姚': 9, '谭': 15, '廖': 14, '邹': 7, '熊': 14, '金': 8, '陆': 7, '郝': 9,
        '孔': 4, '白': 5, '崔': 11, '康': 11, '毛': 4, '邱': 7, '秦': 10, '江': 6, '史': 5, '顾': 10,
        '侯': 9, '邵': 7, '孟': 8, '龙': 5, '万': 3, '段': 9, '雷': 13, '钱': 10, '汤': 6, '尹': 4,
        '黎': 15, '易': 8, '常': 11, '武': 8, '乔': 6, '贺': 9, '赖': 13, '龚': 11, '文': 4
    };
    
    return employees.sort((a, b) => {
        const nameA = a.name || a;
        const nameB = b.name || b;
        
        const firstCharA = nameA.charAt(0);
        const firstCharB = nameB.charAt(0);
        
        const strokesA = strokeOrder[firstCharA] || 999; // 未知姓氏排在后面
        const strokesB = strokeOrder[firstCharB] || 999;
        
        if (strokesA !== strokesB) {
            return strokesA - strokesB;
        }
        
        // 笔画相同时按字符编码排序
        return nameA.localeCompare(nameB, 'zh-CN');
    });
}

// 图表绘制工具
function drawPieChart(canvas, data, colors) {
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 计算总数
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    if (total === 0) {
        // 绘制空图表
        ctx.strokeStyle = '#EBEDF0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.fillStyle = '#8F959E';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', centerX, centerY);
        return;
    }
    
    let currentAngle = -Math.PI / 2; // 从顶部开始
    
    data.forEach((item, index) => {
        const sliceAngle = (item.value / total) * 2 * Math.PI;
        
        // 绘制扇形
        ctx.fillStyle = colors[index] || '#3370FF';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();
        
        // 绘制边框
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 绘制标签文字（如果切片够大）
        if (sliceAngle > 0.2) { // 大于约11度的切片上显示文字
            const textAngle = currentAngle + sliceAngle / 2;
            const textX = centerX + Math.cos(textAngle) * radius * 0.7;
            const textY = centerY + Math.sin(textAngle) * radius * 0.7;
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const percentage = Math.round((item.value / total) * 100);
            // 未参与抽签：显示两行（百分比 + 不参加），其他：仅显示百分比
            const lines = (item.name === '未参与抽签')
                ? [`${percentage}%`, '不参加']
                : [`${percentage}%`];
            const lineHeight = 14; // px
            const startY = textY - (lines.length - 1) * lineHeight / 2;
            lines.forEach((line, idx) => {
                ctx.fillText(line, textX, startY + idx * lineHeight);
            });
        }
        
        currentAngle += sliceAngle;
    });
}

// 动画工具
const AnimationUtils = {
    // 添加CSS类并在动画结束后移除
    addTempClass: function(element, className, duration = 1000) {
        element.classList.add(className);
        setTimeout(() => {
            element.classList.remove(className);
        }, duration);
    },
    
    // 平滑滚动到元素
    scrollToElement: function(element, offset = 0) {
        const elementPosition = element.offsetTop - offset;
        window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
        });
    },
    
    // 创建粒子效果
    createParticles: function(container, count = 20) {
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 3 + 's';
            particle.style.animationDuration = (3 + Math.random() * 2) + 's';
            container.appendChild(particle);
        }
        
        // 清理粒子
        setTimeout(() => {
            const particles = container.querySelectorAll('.particle');
            particles.forEach(p => p.remove());
        }, 5000);
    }
};

// 自动保存管理器 - 支持Tauri文件系统操作
class AutoSaveManager {
    constructor() {
        this.isTauriEnvironment = typeof window.__TAURI__ !== 'undefined';
        this.dataDirectory = 'data';
        this.historyIndexFile = 'history_index.json';
        this.currentHistoryIndex = null;
    }

    /**
     * 检查Tauri环境并初始化文件系统
     */
    async initializeFileSystem() {
        if (!this.isTauriEnvironment) {
            console.log('Running in browser environment, using localStorage fallback');
            return false;
        }

        try {
            const { mkdir, exists } = window.__TAURI__.fs;

            // 确保数据目录存在
            if (!await exists(this.dataDirectory)) {
                await mkdir(this.dataDirectory, { recursive: true });
                console.log('Created data directory');
            }

            // 加载历史索引
            await this.loadHistoryIndex();
            return true;
        } catch (error) {
            console.error('Failed to initialize file system:', error);
            return false;
        }
    }

    /**
     * 加载历史索引文件
     */
    async loadHistoryIndex() {
        try {
            const { readFile, exists } = window.__TAURI__.fs;
            const indexPath = `${this.dataDirectory}/${this.historyIndexFile}`;

            if (await exists(indexPath)) {
                const content = await readFile(indexPath, { encoding: 'utf8' });
                this.currentHistoryIndex = JSON.parse(content);
            } else {
                this.currentHistoryIndex = {
                    version: '2.1.0',
                    created: new Date().toISOString(),
                    records: []
                };
                await this.saveHistoryIndex();
            }
        } catch (error) {
            console.error('Failed to load history index:', error);
            this.currentHistoryIndex = {
                version: '2.1.0',
                created: new Date().toISOString(),
                records: []
            };
        }
    }

    /**
     * 保存历史索引文件
     */
    async saveHistoryIndex() {
        try {
            const { writeFile } = window.__TAURI__.fs;
            const indexPath = `${this.dataDirectory}/${this.historyIndexFile}`;

            this.currentHistoryIndex.lastModified = new Date().toISOString();
            const content = JSON.stringify(this.currentHistoryIndex, null, 2);

            await writeFile(indexPath, content, { encoding: 'utf8' });
            return true;
        } catch (error) {
            console.error('Failed to save history index:', error);
            return false;
        }
    }

    /**
     * 主要保存方法 - 自动检测环境并选择合适的保存方式
     */
    async saveDrawResults(drawData, options = {}) {
        const {
            filename = null,
            autoNaming = true,
            showNotification = true
        } = options;

        try {
            if (this.isTauriEnvironment) {
                return await this.saveToTauriFileSystem(drawData, filename, autoNaming);
            } else {
                return await this.saveToBrowserFileSystem(drawData, filename, autoNaming, showNotification);
            }
        } catch (error) {
            console.error('Save failed:', error);
            throw error;
        }
    }

    /**
     * Tauri文件系统保存
     */
    async saveToTauriFileSystem(drawData, filename = null, autoNaming = true) {
        try {
            const { writeFile } = window.__TAURI__.fs;

            // 生成文件名
            if (!filename && autoNaming) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
                filename = `抽选结果-${dateStr}-${timestamp}.json`;
            }

            const filePath = `${this.dataDirectory}/${filename}`;

            // 准备保存数据
            const saveData = {
                metadata: {
                    filename: filename,
                    savedAt: new Date().toISOString(),
                    version: '2.1.0',
                    totalParticipants: drawData.employees?.length || 0,
                    drawMode: drawData.drawMode || '普通模式'
                },
                ...drawData
            };

            // 写入文件
            const content = JSON.stringify(saveData, null, 2);
            await writeFile(filePath, content, { encoding: 'utf8' });

            // 更新历史索引
            await this.updateHistoryIndex(filename, saveData);

            console.log('File saved successfully to:', filePath);
            return {
                success: true,
                filename: filename,
                filePath: filePath,
                size: content.length,
                method: 'tauri-filesystem'
            };

        } catch (error) {
            console.error('Tauri file system save failed:', error);
            throw new Error(`文件系统保存失败: ${error.message}`);
        }
    }

    /**
     * 浏览器环境保存（下载）
     */
    async saveToBrowserFileSystem(drawData, filename = null, autoNaming = true, showNotification = true) {
        try {
            // 生成文件名
            if (!filename && autoNaming) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
                filename = `抽选结果-${dateStr}-${timestamp}.json`;
            }

            // 准备保存数据
            const saveData = {
                metadata: {
                    filename: filename,
                    savedAt: new Date().toISOString(),
                    version: '2.1.0',
                    environment: 'browser',
                    totalParticipants: drawData.employees?.length || 0,
                    drawMode: drawData.drawMode || '普通模式'
                },
                ...drawData
            };

            // 创建并下载文件
            const content = JSON.stringify(saveData, null, 2);
            const blob = new Blob([content], { type: 'application/json;charset=utf-8' });

            // 使用现有的下载功能
            downloadFile(blob, filename);

            if (showNotification) {
                showToast('文件已下载到浏览器下载目录', 'success');
            }

            return {
                success: true,
                filename: filename,
                size: content.length,
                method: 'browser-download'
            };

        } catch (error) {
            console.error('Browser file save failed:', error);
            throw new Error(`浏览器保存失败: ${error.message}`);
        }
    }

    /**
     * 更新历史索引
     */
    async updateHistoryIndex(filename, saveData) {
        if (!this.currentHistoryIndex) {
            await this.loadHistoryIndex();
        }

        const record = {
            id: generateId(),
            filename: filename,
            savedAt: saveData.metadata.savedAt,
            employeeCount: saveData.metadata.totalParticipants,
            drawMode: saveData.metadata.drawMode,
            departments: saveData.employees ? [...new Set(saveData.employees.map(emp => emp.部门))] : [],
            selectedCount: saveData.selectedEmployees?.length || 0,
            fileSize: JSON.stringify(saveData).length
        };

        // 添加到索引数组（按时间倒序）
        this.currentHistoryIndex.records.unshift(record);

        // 限制索引记录数量（保留最近100条）
        if (this.currentHistoryIndex.records.length > 100) {
            this.currentHistoryIndex.records = this.currentHistoryIndex.records.slice(0, 100);
        }

        await this.saveHistoryIndex();
        return record;
    }

    /**
     * 获取历史记录列表
     */
    async getHistoryRecords() {
        if (this.isTauriEnvironment) {
            if (!this.currentHistoryIndex) {
                await this.loadHistoryIndex();
            }
            return this.currentHistoryIndex?.records || [];
        } else {
            // 浏览器环境从localStorage读取
            const storageKey = 'drawlots_history_index';
            const indexData = localStorage.getItem(storageKey);
            return indexData ? JSON.parse(indexData).records || [] : [];
        }
    }

    /**
     * 读取特定的历史记录文件
     */
    async readHistoryRecord(filename) {
        try {
            if (this.isTauriEnvironment) {
                const { readFile } = window.__TAURI__.fs;
                const filePath = `${this.dataDirectory}/${filename}`;
                const content = await readFile(filePath, { encoding: 'utf8' });
                return JSON.parse(content);
            } else {
                // 浏览器环境从localStorage读取
                const storageKey = `drl_${filename}`;
                const data = localStorage.getItem(storageKey);
                return data ? JSON.parse(data) : null;
            }
        } catch (error) {
            console.error('Failed to read history record:', error);
            throw new Error(`读取历史记录失败: ${error.message}`);
        }
    }

    /**
     * 删除历史记录
     */
    async deleteHistoryRecord(filename) {
        try {
            if (this.isTauriEnvironment) {
                const { remove, exists } = window.__TAURI__.fs;
                const filePath = `${this.dataDirectory}/${filename}`;

                if (await exists(filePath)) {
                    await remove(filePath);
                }

                // 从索引中移除
                if (this.currentHistoryIndex) {
                    this.currentHistoryIndex.records = this.currentHistoryIndex.records.filter(
                        record => record.filename !== filename
                    );
                    await this.saveHistoryIndex();
                }
            } else {
                // 浏览器环境从localStorage删除
                const storageKey = `drl_${filename}`;
                localStorage.removeItem(storageKey);

                // 更新索引
                const indexKey = 'drawlots_history_index';
                const indexData = localStorage.getItem(indexKey);
                if (indexData) {
                    const index = JSON.parse(indexData);
                    index.records = index.records.filter(record => record.filename !== filename);
                    localStorage.setItem(indexKey, JSON.stringify(index));
                }
            }

            return { success: true, deleted: filename };
        } catch (error) {
            console.error('Failed to delete history record:', error);
            throw new Error(`删除历史记录失败: ${error.message}`);
        }
    }

    /**
     * 获取数据目录统计信息
     */
    async getStorageStats() {
        try {
            if (this.isTauriEnvironment) {
                const { readDir } = window.__TAURI__.fs;
                const files = await readDir(this.dataDirectory);

                const jsonFiles = files.filter(file => file.name.endsWith('.json'));
                const totalSize = jsonFiles.reduce((sum, file) => sum + file.metadata.size || 0, 0);

                return {
                    recordCount: jsonFiles.length - 1, // 减去索引文件
                    totalSize: totalSize,
                    dataDirectory: this.dataDirectory,
                    environment: 'tauri'
                };
            } else {
                // 浏览器环境估算localStorage使用量
                let totalSize = 0;
                let recordCount = 0;

                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key.startsWith('drl_')) {
                        totalSize += localStorage.getItem(key).length;
                        recordCount++;
                    }
                }

                return {
                    recordCount: recordCount,
                    totalSize: totalSize,
                    environment: 'browser'
                };
            }
        } catch (error) {
            console.error('Failed to get storage stats:', error);
            return {
                recordCount: 0,
                totalSize: 0,
                error: error.message
            };
        }
    }
}

// 导出到全局作用域
window.Utils = {
    showToast,
    showModal,
    closeModal,
    formatDate,
    formatDateTime,
    generateId,
    deepCopy,
    debounce,
    throttle,
    shuffleArray,
    weightedRandomChoice,
    calculateDrawCount,
    validateExcelFile,
    filterValidEmployees,
    filterDrawableEmployees,
    groupByDepartment,
    groupBySubDepartment,
    isOperationsDepartment,
    getDefaultOperationsSubDepts,
    getOptionalOperationsSubDepts,
    calculateDowngradeWeight,
    sortByStrokeOrder,
    drawPieChart,
    downloadFile,
    generateMarkdown,
    copyToClipboard,
    Storage,
    AnimationUtils,
    AutoSaveManager
};
