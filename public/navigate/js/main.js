// Vue 应用入口
const { createApp, ref, onMounted, computed } = Vue;

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

        // 初始化数据
        onMounted(() => {
            loadCategories();
        });

        // 从 localStorage 加载数据
        const loadCategories = () => {
            const saved = localStorage.getItem('navigateData');
            if (saved) {
                categories.value = JSON.parse(saved);
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
                        items: []
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
                        icon: currentItemForm.value.icon.trim() || 'el-icon-link'
                    });
                    saveCategories();
                    dialogVisible.value = false;
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

        // 返回响应式数据
        return {
            categories,
            dialogVisible,
            dialogType,
            dialogTitle,
            currentCategoryForm,
            currentItemForm,
            showAddCategoryDialog,
            showAddItemDialog,
            confirmDialog,
            deleteCategory,
            deleteItem,
            navigateTo
        };
    }
});

// 挂载应用
app.mount('#app');