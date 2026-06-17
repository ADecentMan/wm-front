// Vue 应用入口
const { createApp, ref, onMounted, onUnmounted, computed, nextTick, h } = Vue;

// 创建应用实例
const app = createApp({
    setup() {
        // 数据状态
        const categories = ref([]);
        const dialogVisible = ref(false);
        const dialogType = ref('category'); // 'category' or 'item'
        const dialogTitle = ref('添加分类');
        const currentCategory = ref(null);
        const currentCategoryForm = ref({ name: '' });
        const currentItemForm = ref({ name: '', url: '', icon: '' });
        const editingCategory = ref(null);
        const editingItem = ref(null);
        const sortableInstances = ref([]);

        // 初始化数据
        onMounted(() => {
            loadCategories();
            nextTick(() => {
                initDragAndDrop();
            });
            
            // 添加键盘快捷键支持
            document.addEventListener('keydown', handleKeyPress);
        });
        
        // 组件卸载时清理
        onUnmounted(() => {
            document.removeEventListener('keydown', handleKeyPress);
            // 清理拖拽实例
            sortableInstances.value.forEach(instance => {
                if (instance && typeof instance.destroy === 'function') {
                    instance.destroy();
                }
            });
        });
        
        // 处理键盘快捷键
        const handleKeyPress = (event) => {
            // Ctrl/Cmd + S: 保存所有
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                saveAll();
            }
            
            // Escape: 取消编辑
            if (event.key === 'Escape') {
                if (editingCategory.value || editingItem.value) {
                    cancelEdit();
                } else if (dialogVisible.value) {
                    dialogVisible.value = false;
                }
            }
        };

        // 从 localStorage 加载数据
        const loadCategories = () => {
            try {
                const saved = localStorage.getItem('navigateData');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    // 验证数据结构
                    if (Array.isArray(parsed)) {
                        categories.value = parsed.map(category => ({
                            ...category,
                            id: category.id || generateId(),
                            name: category.name || '未命名分类',
                            items: Array.isArray(category.items) ? category.items.map(item => ({
                                ...item,
                                id: item.id || generateId(),
                                name: item.name || '未命名项目',
                                url: item.url || '',
                                icon: item.icon || '📌'
                            })) : [],
                            expanded: category.expanded !== undefined ? category.expanded : true
                        }));
                    }
                }
            } catch (error) {
                console.error('加载数据失败:', error);
                categories.value = [];
            }
        };

        // 保存数据到 localStorage
        const saveCategories = () => {
            try {
                // 验证数据完整性
                const validData = categories.value.map(category => ({
                    id: category.id,
                    name: category.name || '未命名分类',
                    items: category.items.map(item => ({
                        id: item.id,
                        name: item.name || '未命名项目',
                        url: item.url || '',
                        icon: item.icon || '📌'
                    })),
                    expanded: category.expanded !== undefined ? category.expanded : true
                }));
                
                localStorage.setItem('navigateData', JSON.stringify(validData));
            } catch (error) {
                console.error('保存数据失败:', error);
                throw new Error('保存数据失败');
            }
        };
        
        // 防抖保存函数
        let debounceTimer = null;
        const debouncedSave = () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(() => {
                saveCategories();
                debounceTimer = null;
            }, 1000);
        };

        // 生成唯一ID
        const generateId = () => {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        };

        // 显示添加分类对话框
        const showAddCategoryDialog = () => {
            dialogType.value = 'category';
            dialogTitle.value = '添加分类';
            currentCategoryForm.value = { name: '' };
            dialogVisible.value = true;
        };

        // 显示添加导航项对话框
        const showAddItemDialog = (category) => {
            dialogType.value = 'item';
            dialogTitle.value = '添加导航';
            currentCategory.value = category;
            currentItemForm.value = { name: '', url: '', icon: '' };
            dialogVisible.value = true;
        };

        // 确认对话框
        const confirmDialog = () => {
            try {
                if (dialogType.value === 'category') {
                    const name = currentCategoryForm.value.name.trim();
                    if (!name) {
                        alert('请输入分类名称');
                        return;
                    }
                    
                    // 检查是否已存在同名分类
                    if (categories.value.some(cat => cat.name === name)) {
                        alert('分类名称已存在');
                        return;
                    }
                    
                    categories.value.push({
                        id: generateId(),
                        name: name,
                        items: [],
                        expanded: true
                    });
                    saveCategories();
                    dialogVisible.value = false;
                } else if (dialogType.value === 'item') {
                    const name = currentItemForm.value.name.trim();
                    const url = currentItemForm.value.url.trim();
                    const icon = currentItemForm.value.icon.trim() || '📌';
                    
                    if (!name) {
                        alert('请输入项目名称');
                        return;
                    }
                    
                    if (!url) {
                        alert('请输入项目URL');
                        return;
                    }
                    
                    // 验证URL格式
                    try {
                        new URL(url);
                    } catch {
                        alert('请输入有效的URL');
                        return;
                    }
                    
                    // 检查是否已存在同名项目
                    if (currentCategory.value.items.some(item => item.name === name)) {
                        alert('项目名称已存在');
                        return;
                    }
                    
                    currentCategory.value.items.push({
                        id: generateId(),
                        name: name,
                        url: url,
                        icon: icon
                    });
                    saveCategories();
                    dialogVisible.value = false;
                    // 重新初始化拖拽
                    nextTick(() => {
                        initDragAndDrop();
                    });
                }
            } catch (error) {
                console.error('确认对话框错误:', error);
                alert('操作失败，请重试');
            }
        };

        // 删除分类
        const deleteCategory = (category) => {
            if (confirm(`确定要删除分类"${category.name}"吗？此操作不可恢复。`)) {
                const index = categories.value.indexOf(category);
                if (index > -1) {
                    categories.value.splice(index, 1);
                    saveCategories();
                }
            }
        };

        // 删除导航项
        const deleteItem = (category, item) => {
            if (confirm(`确定要删除项目"${item.name}"吗？此操作不可恢复。`)) {
                const index = category.items.indexOf(item);
                if (index > -1) {
                    category.items.splice(index, 1);
                    saveCategories();
                }
            }
        };

        // 导航到指定URL
        const navigateTo = (url) => {
            window.open(url, '_blank');
        };

        // 切换分类展开状态
        const toggleCategory = (categoryId) => {
            const category = categories.value.find(cat => cat.id === categoryId);
            if (category) {
                category.expanded = !category.expanded;
            }
        };

        // 开始编辑分类
        const startEditCategory = (categoryId) => {
            editingCategory.value = categoryId;
        };

        // 保存分类编辑
        const saveCategory = (categoryId) => {
            const category = categories.value.find(cat => cat.id === categoryId);
            if (category) {
                const name = category.name.trim();
                if (!name) {
                    alert('分类名称不能为空');
                    return;
                }
                
                // 检查是否已存在同名分类
                if (categories.value.some(cat => cat.id !== categoryId && cat.name === name)) {
                    alert('分类名称已存在');
                    return;
                }
                
                editingCategory.value = null;
                saveCategories();
            }
        };

        // 开始编辑项目
        const startEditItem = (categoryId, itemId) => {
            currentCategory.value = categories.value.find(cat => cat.id === categoryId);
            editingItem.value = itemId;
        };

        // 保存项目编辑
        const saveItem = (categoryId, itemId) => {
            const category = categories.value.find(cat => cat.id === categoryId);
            if (category) {
                const item = category.items.find(i => i.id === itemId);
                if (item) {
                    const name = item.name.trim();
                    const url = item.url.trim();
                    const icon = item.icon.trim() || '📌';
                    
                    if (!name) {
                        alert('项目名称不能为空');
                        return;
                    }
                    
                    if (!url) {
                        alert('项目URL不能为空');
                        return;
                    }
                    
                    // 验证URL格式
                    try {
                        new URL(url);
                    } catch {
                        alert('请输入有效的URL');
                        return;
                    }
                    
                    // 检查是否已存在同名项目
                    if (category.items.some(i => i.id !== itemId && i.name === name)) {
                        alert('项目名称已存在');
                        return;
                    }
                    
                    item.name = name;
                    item.url = url;
                    item.icon = icon;
                    
                    editingItem.value = null;
                    saveCategories();
                }
            }
        };

        // 取消编辑
        const cancelEdit = () => {
            editingCategory.value = null;
            editingItem.value = null;
        };

        // 添加项目到指定分类
        const addItem = (categoryId) => {
            const category = categories.value.find(cat => cat.id === categoryId);
            if (category) {
                showAddItemDialog(category);
            }
        };

        // 初始化拖拽功能
        const initDragAndDrop = () => {
            // 销毁之前的实例
            sortableInstances.value.forEach(instance => {
                if (instance && typeof instance.destroy === 'function') {
                    instance.destroy();
                }
            });
            sortableInstances.value = [];

            // 为每个分类初始化拖拽
            categories.value.forEach((category, categoryIndex) => {
                const element = document.getElementById(`items-${category.id}`);
                if (element && category.items.length > 0) {
                    const sortable = new Sortable(element, {
                        group: 'navigation',
                        animation: 150,
                        ghostClass: 'sortable-ghost',
                        chosenClass: 'sortable-chosen',
                        dragClass: 'sortable-drag',
                        handle: '.item-content',
                        dragoverBubble: true,
                        onEnd: function(evt) {
                            // 防止重复处理
                            if (evt.oldIndex === evt.newIndex && evt.from === evt.to) {
                                return;
                            }
                            handleDrop(evt, categoryIndex, evt.newIndex);
                        }
                    });
                    sortableInstances.value.push(sortable);
                }
            });
        };

        // 处理拖拽开始
        const handleDragStart = (event, categoryIndex, itemIndex) => {
            try {
                event.dataTransfer.setData('text/plain', JSON.stringify({
                    fromCategory: categoryIndex,
                    fromItem: itemIndex
                }));
                event.dataTransfer.effectAllowed = 'move';
            } catch (error) {
                console.error('拖拽开始错误:', error);
            }
        };

        // 处理拖拽悬停
        const handleDragOver = (event, categoryIndex, itemIndex) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        };

        // 处理拖拽放下
        const handleDrop = (event, categoryIndex, itemIndex) => {
            event.preventDefault();
            try {
                const data = JSON.parse(event.dataTransfer.getData('text/plain'));
                const fromCategory = data.fromCategory;
                const fromItem = data.fromItem;
                
                // 验证数据有效性
                if (fromCategory === undefined || fromItem === undefined || 
                    categoryIndex === undefined || itemIndex === undefined) {
                    console.error('拖拽数据无效');
                    return;
                }
                
                // 如果是同一个分类内的移动
                if (fromCategory === categoryIndex) {
                    const category = categories.value[categoryIndex];
                    if (fromItem >= 0 && fromItem < category.items.length && 
                        itemIndex >= 0 && itemIndex <= category.items.length) {
                        const item = category.items.splice(fromItem, 1)[0];
                        category.items.splice(itemIndex, 0, item);
                        debouncedSave();
                    }
                } else {
                    // 跨分类移动
                    const fromCat = categories.value[fromCategory];
                    const toCat = categories.value[categoryIndex];
                    if (fromCat && toCat && 
                        fromItem >= 0 && fromItem < fromCat.items.length && 
                        itemIndex >= 0 && itemIndex <= toCat.items.length) {
                        const item = fromCat.items.splice(fromItem, 1)[0];
                        toCat.items.splice(itemIndex, 0, item);
                        debouncedSave();
                    }
                }
            } catch (error) {
                console.error('拖拽处理错误:', error);
            }
        };

        // 保存所有数据
        const saveAll = () => {
            try {
                saveCategories();
                // 显示保存成功提示
                const originalTitle = document.title;
                document.title = '✓ 保存成功';
                setTimeout(() => {
                    document.title = originalTitle;
                }, 2000);
                
                // 添加视觉反馈
                const saveButton = event.target;
                if (saveButton) {
                    const originalText = saveButton.textContent;
                    saveButton.textContent = '已保存';
                    saveButton.disabled = true;
                    setTimeout(() => {
                        saveButton.textContent = originalText;
                        saveButton.disabled = false;
                    }, 1500);
                }
            } catch (error) {
                console.error('保存失败:', error);
                alert('保存失败，请重试');
            }
        };
        
        // 导出数据
        const exportData = () => {
            try {
                const dataStr = JSON.stringify(categories.value, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `navigate-data-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('导出失败:', error);
                alert('导出失败，请重试');
            }
        };
        
        // 显示导入对话框
        const showImportDialog = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (event) => {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const importedData = JSON.parse(e.target.result);
                            if (Array.isArray(importedData)) {
                                if (confirm('导入数据将覆盖现有数据，是否继续？')) {
                                    categories.value = importedData;
                                    saveCategories();
                                    nextTick(() => {
                                        initDragAndDrop();
                                    });
                                }
                            } else {
                                alert('无效的数据格式');
                            }
                        } catch (error) {
                            console.error('导入失败:', error);
                            alert('导入失败，请检查文件格式');
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        };

        // 返回响应式数据
        return {
            categories,
            dialogVisible,
            dialogType,
            dialogTitle,
            currentCategoryForm,
            currentItemForm,
            editingCategory,
            editingItem,
            showAddCategoryDialog,
            showAddItemDialog,
            confirmDialog,
            deleteCategory,
            deleteItem,
            navigateTo,
            toggleCategory,
            startEditCategory,
            saveCategory,
            startEditItem,
            saveItem,
            cancelEdit,
            addItem,
            handleDragStart,
            handleDragOver,
            handleDrop,
            saveAll,
            exportData,
            showImportDialog
        };
    }
});

// 全局注册 Element Plus 图标
const ElementPlusIconsVue = {
    'ArrowDown': {
        render() {
            return h('svg', {
                'xmlns': 'http://www.w3.org/2000/svg',
                'viewBox': '0 0 1024 1024',
                'fill': 'currentColor'
            }, [
                h('path', {
                    'd': 'M504 664a8 8 0 0 0 8-8V200a8 8 0 0 0-16 0v456a8 8 0 0 0 8 8zm0 168a8 8 0 0 0 8-8V672a8 8 0 0 0-16 0v152a8 8 0 0 0 8 8z'
                })
            ]);
        }
    },
    'ArrowRight': {
        render() {
            return h('svg', {
                'xmlns': 'http://www.w3.org/2000/svg',
                'viewBox': '0 0 1024 1024',
                'fill': 'currentColor'
            }, [
                h('path', {
                    'd': 'M488 360a8 8 0 0 0-8 8v456a8 8 0 0 0 16 0V368a8 8 0 0 0-8-8zm168 0a8 8 0 0 0-8 8v152a8 8 0 0 0 16 0V368a8 8 0 0 0-8-8z'
                })
            ]);
        }
    }
};

// 注册所有图标
app.config.globalProperties.$icons = ElementPlusIconsVue;

// 挂载应用
app.mount('#app');