// Vue 应用入口
const { createApp, ref, onMounted, nextTick, watch } = Vue;

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

        // 初始化数据
        onMounted(() => {
            loadCategories();
            initSortable();
        });

        // 从 localStorage 加载数据
        const loadCategories = () => {
            try {
                const saved = localStorage.getItem('navigateData');
                if (saved) {
                    categories.value = JSON.parse(saved);
                }
            } catch (error) {
                console.error('加载数据失败:', error);
                categories.value = [];
            }
        };

        // 保存数据到 localStorage
        const saveCategories = () => {
            try {
                localStorage.setItem('navigateData', JSON.stringify(categories.value));
            } catch (error) {
                console.error('保存数据失败:', error);
            }
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

        // 开始编辑分类
        const startEditCategory = (category) => {
            editingCategory.value = category;
            category.tempName = category.name;
        };

        // 保存分类编辑
        const saveCategory = (category) => {
            if (category.tempName && category.tempName.trim()) {
                category.name = category.tempName.trim();
                delete category.tempName;
                editingCategory.value = null;
                saveCategories();
            }
        };

        // 开始编辑导航项
        const startEditItem = (category, item) => {
            editingItem.value = item;
            currentItemForm.value = { ...item };
            dialogType.value = 'item';
            dialogTitle.value = '编辑导航';
            dialogVisible.value = true;
        };

        // 确认对话框
        const confirmDialog = () => {
            try {
                if (dialogType.value === 'category') {
                    if (currentCategoryForm.value.name.trim()) {
                        categories.value.push({
                            id: generateId(),
                            name: currentCategoryForm.value.name.trim(),
                            items: []
                        });
                        saveCategories();
                        dialogVisible.value = false;
                    }
                } else if (dialogType.value === 'item') {
                    if (currentItemForm.value.name.trim() && currentItemForm.value.url.trim()) {
                        if (editingItem.value) {
                            // 编辑现有项目
                            Object.assign(editingItem.value, {
                                name: currentItemForm.value.name.trim(),
                                url: currentItemForm.value.url.trim(),
                                icon: currentItemForm.value.icon.trim() || 'el-icon-link'
                            });
                            editingItem.value = null;
                        } else if (currentCategory.value) {
                            // 添加新项目
                            currentCategory.value.items.push({
                                id: generateId(),
                                name: currentItemForm.value.name.trim(),
                                url: currentItemForm.value.url.trim(),
                                icon: currentItemForm.value.icon.trim() || 'el-icon-link'
                            });
                        }
                        saveCategories();
                        dialogVisible.value = false;
                    }
                }
            } catch (error) {
                console.error('确认对话框错误:', error);
            }
        };

        // 删除分类
        const deleteCategory = (category) => {
            ElMessageBox.confirm('确定要删除这个分类吗？分类下的所有导航项也会被删除。', '确认删除', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                const index = categories.value.indexOf(category);
                if (index > -1) {
                    categories.value.splice(index, 1);
                    saveCategories();
                }
            }).catch(() => {});
        };

        // 删除导航项
        const deleteItem = (category, item) => {
            ElMessageBox.confirm('确定要删除这个导航项吗？', '确认删除', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                const index = category.items.indexOf(item);
                if (index > -1) {
                    category.items.splice(index, 1);
                    saveCategories();
                }
            }).catch(() => {});
        };

        // 导航到指定URL
        const navigateTo = (url) => {
            window.open(url, '_blank');
        };

        // 初始化拖拽功能
        const initSortable = () => {
            nextTick(() => {
                // 导航项拖拽
                categories.value.forEach(category => {
                    const container = document.getElementById('category-' + category.id);
                    if (container) {
                        new Sortable(container, {
                            group: 'items',
                            animation: 150,
                            ghostClass: 'sortable-ghost',
                            onEnd: function(evt) {
                                const oldIndex = evt.oldIndex;
                                const newIndex = evt.newIndex;
                                
                                if (oldIndex !== newIndex) {
                                    const movedItem = category.items.splice(oldIndex, 1)[0];
                                    category.items.splice(newIndex, 0, movedItem);
                                    saveCategories();
                                }
                            }
                        });
                    }
                });
            });
        };

        // 监听数据变化，重新初始化拖拽
        watch(categories, () => {
            initSortable();
        }, { deep: true });

        // 返回响应式数据
        return {
            categories,
            dialogVisible,
            dialogType,
            dialogTitle,
            currentCategoryForm,
            currentItemForm,
            editingCategory,
            showAddCategoryDialog,
            showAddItemDialog,
            startEditCategory,
            saveCategory,
            startEditItem,
            confirmDialog,
            deleteCategory,
            deleteItem,
            navigateTo
        };
    }
});

// 挂载应用
app.use(ElementPlus);
app.mount('#app');