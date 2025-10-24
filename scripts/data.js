/**
 * 数据处理模块
 */

class DataProcessor {
    constructor() {
        this.rawData = null;
        this.processedData = null;
        this.departmentStats = null;
        // 默认包含运行部的两个必选分部门
        this.selectedSubDepartments = new Set(Utils.getDefaultOperationsSubDepts());
    }

    /**
     * 解析Excel文件
     */
    async parseExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    // 验证文件大小
                    if (e.target.result.byteLength === 0) {
                        reject(new Error('文件内容为空，请检查文件是否完整'));
                        return;
                    }
                    
                    const data = new Uint8Array(e.target.result);
                    let workbook;
                    
                    try {
                        workbook = XLSX.read(data, { type: 'array' });
                    } catch (xlsxError) {
                        reject(new Error('文件格式错误，请确保文件是有效的Excel格式(.xlsx)'));
                        return;
                    }
                    
                    // 检查工作表是否存在
                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        reject(new Error('Excel文件中没有找到任何工作表'));
                        return;
                    }
                    
                    // 检查是否存在"公司员工花名册"工作表
                    if (!workbook.SheetNames.includes('公司员工花名册')) {
                        const availableSheets = workbook.SheetNames.join('、');
                        reject(new Error(`文件中未找到"公司员工花名册"工作表。当前工作表：${availableSheets}`));
                        return;
                    }
                    
                    // 读取工作表数据
                    const worksheet = workbook.Sheets['公司员工花名册'];
                    if (!worksheet) {
                        reject(new Error('无法读取"公司员工花名册"工作表'));
                        return;
                    }
                    
                    let jsonData;
                    try {
                        jsonData = XLSX.utils.sheet_to_json(worksheet);
                    } catch (parseError) {
                        reject(new Error('工作表数据解析失败，请检查表格格式是否正确'));
                        return;
                    }
                    
                    if (jsonData.length === 0) {
                        reject(new Error('工作表"公司员工花名册"中没有数据，请检查表格内容'));
                        return;
                    }
                    
                    // 验证必要的列
                    const requiredColumns = ['姓名', '性别', '部门', '分部门', '岗位', '在职状态'];
                    const firstRow = jsonData[0];
                    const existingColumns = Object.keys(firstRow);
                    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
                    
                    if (missingColumns.length > 0) {
                        const message = `缺少必要的列：${missingColumns.join('、')}。当前列：${existingColumns.join('、')}`;
                        reject(new Error(message));
                        return;
                    }
                    
                    // 验证数据完整性
                    let invalidRows = [];
                    jsonData.forEach((row, index) => {
                        const missingFields = requiredColumns.filter(col => 
                            !row[col] || row[col].toString().trim() === ''
                        );
                        if (missingFields.length > 0) {
                            invalidRows.push(`第${index + 2}行缺少：${missingFields.join('、')}`);
                        }
                    });
                    
                    if (invalidRows.length > 5) {
                        reject(new Error(`发现${invalidRows.length}行数据不完整，请检查Excel文件中的数据完整性`));
                        return;
                    } else if (invalidRows.length > 0) {
                        console.warn('发现不完整的数据行：', invalidRows);
                    }
                    
                    this.rawData = jsonData;
                    console.log(`成功解析Excel文件，共${jsonData.length}行数据`);
                    resolve(jsonData);
                    
                } catch (error) {
                    if (error.message.includes('缺少必要的列') || 
                        error.message.includes('工作表') ||
                        error.message.includes('格式错误')) {
                        reject(error);
                    } else {
                        reject(new Error(`文件解析出现异常：${error.message}`));
                    }
                }
            };
            
            reader.onerror = (error) => {
                reject(new Error('文件读取失败，请检查文件是否损坏或被其他程序占用'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * 处理和过滤数据
     */
    processData() {
        if (!this.rawData) {
            throw new Error('没有原始数据可处理');
        }

        // 过滤有效员工
        this.processedData = Utils.filterValidEmployees(this.rawData);
        
        if (this.processedData.length === 0) {
            throw new Error('没有符合条件的员工数据');
        }

        // 计算部门统计
        this.calculateDepartmentStats();
        
        return this.processedData;
    }

    /**
     * 计算部门统计信息
     */
    calculateDepartmentStats() {
        const departmentGroups = Utils.groupByDepartment(this.processedData);
        this.departmentStats = {};

        Object.keys(departmentGroups).forEach(dept => {
            const employees = departmentGroups[dept];
            const totalCount = employees.length;
            const drawCount = Utils.calculateDrawCount(totalCount);
            
            this.departmentStats[dept] = {
                totalCount,
                drawCount,
                employees,
                isOperations: Utils.isOperationsDepartment(dept),
                subDepartments: this.getSubDepartmentStats(employees, dept)
            };
        });
    }

    /**
     * 获取分部门统计
     */
    getSubDepartmentStats(employees, departmentName) {
        const subDeptGroups = Utils.groupBySubDepartment(employees);
        const stats = {};

        Object.keys(subDeptGroups).forEach(subDept => {
            const subEmployees = subDeptGroups[subDept];
            stats[subDept] = {
                count: subEmployees.length,
                employees: subEmployees,
                isDefault: Utils.isOperationsDepartment(departmentName) && 
                          Utils.getDefaultOperationsSubDepts().includes(subDept),
                isOptional: Utils.isOperationsDepartment(departmentName) && 
                           Utils.getOptionalOperationsSubDepts().includes(subDept)
            };
        });

        return stats;
    }

    /**
     * 设置运行部选择的分部门
     */
    setSelectedSubDepartments(selectedList) {
        this.selectedSubDepartments.clear();
        
        // 添加默认参与的分部门
        Utils.getDefaultOperationsSubDepts().forEach(dept => {
            this.selectedSubDepartments.add(dept);
        });
        
        // 添加用户选择的分部门
        selectedList.forEach(dept => {
            this.selectedSubDepartments.add(dept);
        });
    }

    /**
     * 获取有效的抽选池
     */
    getDrawPool() {
        const drawPool = {};

        // 若尚未通过UI设置任何分部门选择，确保至少包含默认分部门
        const selectedSet = (this.selectedSubDepartments && this.selectedSubDepartments.size > 0)
            ? this.selectedSubDepartments
            : new Set(Utils.getDefaultOperationsSubDepts());

        Object.keys(this.departmentStats).forEach(dept => {
            const deptData = this.departmentStats[dept];
            let validEmployees = [];

            if (deptData.isOperations) {
                // 运行部需要根据选择的分部门过滤
                Object.keys(deptData.subDepartments).forEach(subDept => {
                    if (selectedSet.has(subDept)) {
                        validEmployees = validEmployees.concat(deptData.subDepartments[subDept].employees);
                    }
                });
            } else {
                // 其他部门直接使用所有员工
                validEmployees = deptData.employees;
            }

            if (validEmployees.length > 0) {
                // 对于运行部，抽选人数应基于部门总人数，而不是选中分部门的人数
                const baseCount = deptData.isOperations ? deptData.totalCount : validEmployees.length;
                const drawCount = Utils.calculateDrawCount(baseCount);
                
                drawPool[dept] = {
                    employees: validEmployees,
                    drawCount: Math.min(drawCount, validEmployees.length), // 不能超过可用员工数
                    totalCount: validEmployees.length,
                    baseTotalCount: baseCount // 用于显示的基数
                };
            }
        });

        return drawPool;
    }

    /**
     * 执行抽选
     */
    async performDraw(excludedEmployees = []) {
        const drawPool = this.getDrawPool();
        const results = [];
        const historyRecords = await Utils.Storage.getHistory();

        Object.keys(drawPool).forEach(dept => {
            const deptData = drawPool[dept];
            const { employees, drawCount } = deptData;
            
            // 排除已被排除的员工
            const excludedNames = excludedEmployees.map(emp => emp.name);
            const availableEmployees = employees.filter(emp => 
                !excludedNames.includes(emp['姓名'])
            );
            
            // 进一步过滤：排除部长但保留副部长
            const drawableEmployees = Utils.filterDrawableEmployees(availableEmployees);

            if (drawableEmployees.length === 0) {
                return; // 没有可抽选的员工
            }

            // 计算权重
            const weights = drawableEmployees.map(emp => 
                Utils.calculateDowngradeWeight(emp['姓名'], historyRecords)
            );

            // 执行加权随机抽选
            const selectedEmployees = [];
            const actualDrawCount = Math.min(drawCount, drawableEmployees.length);
            const tempPool = [...drawableEmployees];
            const tempWeights = [...weights];

            for (let i = 0; i < actualDrawCount; i++) {
                if (tempPool.length === 0) break;

                const selectedIndex = this.weightedRandomSelect(tempWeights);
                const selectedEmployee = tempPool[selectedIndex];
                
                selectedEmployees.push({
                    name: selectedEmployee['姓名'],
                    gender: selectedEmployee['性别'],
                    department: selectedEmployee['部门'],
                    subDepartment: selectedEmployee['分部门']
                });

                // 从临时池中移除已选择的员工
                tempPool.splice(selectedIndex, 1);
                tempWeights.splice(selectedIndex, 1);
            }

            if (selectedEmployees.length > 0) {
                results.push({
                    department: dept,
                    employees: selectedEmployees,
                    totalAvailable: availableEmployees.length,
                    targetCount: drawCount
                });
            }
        });

        return results;
    }

    /**
     * 加权随机选择（返回索引）
     */
    weightedRandomSelect(weights) {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return i;
            }
        }

        return weights.length - 1;
    }

    /**
     * 补充抽选
     */
    async supplementDraw(currentResults, deletedEmployees) {
        if (!deletedEmployees || deletedEmployees.length === 0) {
            return [];
        }

        // 按部门统计需要补充的人数
        const supplementNeeds = {};
        deletedEmployees.forEach(emp => {
            const dept = emp.department;
            if (!supplementNeeds[dept]) {
                supplementNeeds[dept] = 0;
            }
            supplementNeeds[dept]++;
        });

        // 获取当前结果中的员工名单（用于排除）
        const currentEmployees = [];
        currentResults.forEach(deptResult => {
            currentEmployees.push(...deptResult.employees);
        });

        // 添加被删除的员工到排除列表
        const excludedEmployees = [...currentEmployees, ...deletedEmployees];

        // 为需要补充的部门执行抽选
        const supplementResults = [];
        const drawPool = this.getDrawPool();
        const historyRecords = await Utils.Storage.getHistory();

        Object.keys(supplementNeeds).forEach(dept => {
            const needCount = supplementNeeds[dept];
            const deptData = drawPool[dept];

            if (!deptData) return;

            const { employees } = deptData;
            const excludedNames = excludedEmployees.map(emp => emp.name);
            const availableEmployees = employees.filter(emp => 
                !excludedNames.includes(emp['姓名'])
            );
            
            // 进一步过滤：排除部长但保留副部长
            const drawableEmployees = Utils.filterDrawableEmployees(availableEmployees);

            if (drawableEmployees.length === 0) return;

            // 计算权重
            const weights = drawableEmployees.map(emp => 
                Utils.calculateDowngradeWeight(emp['姓名'], historyRecords)
            );

            // 执行补充抽选
            const selectedEmployees = [];
            const actualDrawCount = Math.min(needCount, drawableEmployees.length);
            const tempPool = [...drawableEmployees];
            const tempWeights = [...weights];

            for (let i = 0; i < actualDrawCount; i++) {
                if (tempPool.length === 0) break;

                const selectedIndex = this.weightedRandomSelect(tempWeights);
                const selectedEmployee = tempPool[selectedIndex];
                
                selectedEmployees.push({
                    name: selectedEmployee['姓名'],
                    gender: selectedEmployee['性别'],
                    department: selectedEmployee['部门'],
                    subDepartment: selectedEmployee['分部门']
                });

                // 从临时池中移除
                tempPool.splice(selectedIndex, 1);
                tempWeights.splice(selectedIndex, 1);
                
                // 也从排除列表中添加（避免重复选择）
                excludedNames.push(selectedEmployee['姓名']);
            }

            if (selectedEmployees.length > 0) {
                supplementResults.push({
                    department: dept,
                    employees: selectedEmployees,
                    supplementCount: needCount,
                    actualCount: selectedEmployees.length
                });
            }
        });

        return supplementResults;
    }

    /**
     * 获取统计摘要
     */
    getStatsSummary() {
        if (!this.departmentStats) {
            return null;
        }

        const totalEmployees = this.processedData.length;
        const departmentCount = Object.keys(this.departmentStats).length;
        const totalDrawCount = Object.values(this.departmentStats)
            .reduce((sum, dept) => sum + dept.drawCount, 0);

        return {
            totalEmployees,
            departmentCount,
            totalDrawCount,
            departments: this.departmentStats
        };
    }

    /**
     * 重置数据
     */
    reset() {
        this.rawData = null;
        this.processedData = null;
        this.departmentStats = null;
        this.selectedSubDepartments.clear();
        // 重置时也恢复默认分部门
        Utils.getDefaultOperationsSubDepts().forEach(d => this.selectedSubDepartments.add(d));
    }
}

// 创建全局数据处理器实例
window.dataProcessor = new DataProcessor();