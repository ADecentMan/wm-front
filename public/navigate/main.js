const { createApp, ref, reactive, nextTick, onMounted } = Vue;

const app = createApp({
    setup() {
        // 状态管理
        const categories = ref([
            {
                id: 1,
                name: '常用网站',
                expanded: true,
                items: [
                    { id: 1, name: '百度', url: 'https://www.baidu.com', icon: '🔍' },
                    { id: 2, name: '谷歌', url: 'https://www.google.com', icon: '🌐' }
                ]
            },
            {
                id: 2,
                name: '娱乐',
                expanded: false,
                items: [
                    { id: 3, name: 'B站', url: 'https://www.bilibili.com', icon: '📺' },
                    { id: 4, name: '优酷', url: 'https://www.youku.com', icon: '🎬' }
                ]
            }
        ]);
        
        const editingCategory = ref(null);
        const editingItem = ref(null);
        const draggedItem = ref(null);
        const draggedFromCategory = ref(null);
        const draggedFromIndex = ref(null);

        // 分类操作
        const toggleCategory = (categoryId) => {
            const category = categories.value.find(c => c.id === categoryId);
            if (category && editingCategory.value !== categoryId) {
                category.expanded = !category.expanded;
            }
        };

        const addCategory = () => {
            const newId = Math.max(...categories.value.map(c => c.id), 0) + 1;
            categories.value.push({
                id: newId,
                name: `新分类${newId}`,
                expanded: true,
                items: []
            });
        };

        const startEditCategory = (categoryId) => {
            editingCategory.value = categoryId;
        };

        const saveCategory = (categoryId) => {
            editingCategory.value = null;
        };

        const deleteCategory = (categoryId) => {
            const index = categories.value.findIndex(c => c.id === categoryId);
            if (index > -1) {
                categories.value.splice(index, 1);
            }
        };

        // 项目操作
        const addItem = (categoryId) => {
            const category = categories.value.find(c => c.id === categoryId);
            if (category) {
                const newId = Math.max(...category.items.map(i => i.id), 0) + 1;
                category.items.push({
                    id: newId,
                    name: `新项目${newId}`,
                    url: '#',
                    icon: '📌'
                });
            }
        };

        const startEditItem = (categoryId, itemId) => {
            editingItem.value = itemId;
        };

        const saveItem = (categoryId, itemId) => {
            editingItem.value = null;
        };

        const cancelEdit = () => {
            editingItem.value = null;
        };

        const deleteItem = (categoryId, itemId) => {
            const category = categories.value.find(c => c.id === categoryId);
            if (category) {
                const index = category.items.findIndex(i => i.id === itemId);
                if (index > -1) {
                    category.items.splice(index, 1);
                }
            }
        };

        // 拖拽功能
        const handleDragStart = (event, categoryIndex, itemIndex) => {
            draggedItem.value = categories.value[categoryIndex].items[itemIndex];
            draggedFromCategory.value = categoryIndex;
            draggedFromIndex.value = itemIndex;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/html', ''); // Firefox需要这个
        };

        const handleDragOver = (event, categoryIndex, itemIndex) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        };

        const handleDrop = (event, categoryIndex, itemIndex) => {
            event.preventDefault();
            
            if (draggedFromCategory.value !== categoryIndex || draggedFromIndex.value !== itemIndex) {
                const targetCategory = categories.value[categoryIndex];
                const sourceCategory = categories.value[draggedFromCategory.value];
                
                // 从源位置删除
                const [movedItem] = sourceCategory.items.splice(draggedFromIndex.value, 1);
                
                // 插入到目标位置
                targetCategory.items.splice(itemIndex, 0, movedItem);
            }
            
            // 重置拖拽状态
            draggedItem.value = null;
            draggedFromCategory.value = null;
            draggedFromIndex.value = null;
        };

        // 初始化拖拽排序
        const initSortable = () => {
            nextTick(() => {
                categories.value.forEach((category, categoryIndex) => {
                    const itemsList = document.getElementById(`items-${category.id}`);
                    if (itemsList) {
                        new Sortable(itemsList, {
                            group: 'navigation',
                            animation: 150,
                            ghostClass: 'sortable-ghost',
                            chosenClass: 'sortable-chosen',
                            dragClass: 'sortable-drag',
                            onEnd: function(evt) {
                                // 处理排序后的逻辑
                                console.log('排序完成:', evt);
                            }
                        });
                    }
                });
            });
        };

        // 保存所有数据
        const saveAll = () => {
            // 这里可以添加保存到后端的逻辑
            console.log('保存所有数据:', JSON.stringify(categories.value, null, 2));
            alert('数据已保存到控制台');
        };

        // 组件挂载后初始化
        onMounted(() => {
            initSortable();
        });

        return {
            categories,
            editingCategory,
            editingItem,
            toggleCategory,
            addCategory,
            startEditCategory,
            saveCategory,
            deleteCategory,
            addItem,
            startEditItem,
            saveItem,
            cancelEdit,
            deleteItem,
            handleDragStart,
            handleDragOver,
            handleDrop,
            saveAll
        };
    }
});

// 注册Element Plus
app.use(ElementPlus);

// 挂载应用
app.mount('#app');

// 添加页面加载动画
document.addEventListener('DOMContentLoaded', function() {
    const container = document.querySelector('.container');
    if (container) {
        container.style.opacity = '0';
        container.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            container.style.transition = 'all 0.6s ease';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 100);
    }
});