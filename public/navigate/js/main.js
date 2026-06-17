// Vue 应用入口
const { createApp, ref, onMounted, computed, nextTick, h } = Vue;

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
        });

        // 从 localStorage 加载数据
        const loadCategories = () => {
            const saved = localStorage.getItem('navigateData');
            if (saved) {
                categories.value = JSON.parse(saved);
                // 确保每个分类都有 expanded 属性
                categories.value.forEach(category => {
                    if (!category.expanded) {
                        category.expanded = true;
                    }
                });
            }
        };

        // 保存数据到 localStorage
        const saveCategories = () => {
            localStorage.setItem('navigateData', JSON.stringify(categories.value));
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
            if (dialogType.value === 'category') {
                if (currentCategoryForm.value.name.trim()) {
                    categories.value.push({
                        id: generateId(),
                        name: currentCategoryForm.value.name.trim(),
                        items: [],
                        expanded: true
                    });
                    saveCategories();
                    dialogVisible.value = false;
                }
            } else if (dialogType.value === 'item') {
                if (currentItemForm.value.name.trim() && currentItemForm.value.url.trim()) {
                    currentCategory.value.items.push({
                        id: generateId(),
                        name: currentItemForm.value.name.trim(),
                        url: currentItemForm.value.url.trim(),
                        icon: currentItemForm.value.icon.trim() || '📌'
                    });
                    saveCategories();
                    dialogVisible.value = false;
                    // 重新初始化拖拽
                    nextTick(() => {
                        initDragAndDrop();
                    });
                }
            }
        };

        // 删除分类
        const deleteCategory = (category) => {
            const index = categories.value.indexOf(category);
            if (index > -1) {
                categories.value.splice(index, 1);
                saveCategories();
            }
        };

        // 删除导航项
        const deleteItem = (category, item) => {
            const index = category.items.indexOf(item);
            if (index > -1) {
                category.items.splice(index, 1);
                saveCategories();
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
            if (category && category.name.trim()) {
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
                if (item && item.name.trim() && item.url.trim()) {
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
                instance.destroy();
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
                        onEnd: function(evt) {
                            handleDrop(evt, categoryIndex, evt.newIndex);
                        }
                    });
                    sortableInstances.value.push(sortable);
                }
            });
        };

        // 处理拖拽开始
        const handleDragStart = (event, categoryIndex, itemIndex) => {
            event.dataTransfer.setData('text/plain', JSON.stringify({
                fromCategory: categoryIndex,
                fromItem: itemIndex
            }));
        };

        // 处理拖拽悬停
        const handleDragOver = (event, categoryIndex, itemIndex) => {
            event.preventDefault();
        };

        // 处理拖拽放下
        const handleDrop = (event, categoryIndex, itemIndex) => {
            event.preventDefault();
            try {
                const data = JSON.parse(event.dataTransfer.getData('text/plain'));
                const fromCategory = data.fromCategory;
                const fromItem = data.fromItem;
                
                // 如果是同一个分类内的移动
                if (fromCategory === categoryIndex) {
                    const category = categories.value[categoryIndex];
                    const item = category.items.splice(fromItem, 1)[0];
                    category.items.splice(itemIndex, 0, item);
                } else {
                    // 跨分类移动
                    const fromCat = categories.value[fromCategory];
                    const toCat = categories.value[categoryIndex];
                    const item = fromCat.items.splice(fromItem, 1)[0];
                    toCat.items.splice(itemIndex, 0, item);
                }
                
                saveCategories();
            } catch (error) {
                console.error('拖拽处理错误:', error);
            }
        };

        // 保存所有数据
        const saveAll = () => {
            saveCategories();
            // 显示保存成功提示
            const originalTitle = document.title;
            document.title = '✓ 保存成功';
            setTimeout(() => {
                document.title = originalTitle;
            }, 2000);
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
            saveAll
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