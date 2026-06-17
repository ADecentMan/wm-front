# 导航页面设计方案

**项目：** wm-front  
**功能：** 导航页面  
**日期：** 2026-06-17

## 项目结构

```
public/
├── navigate/
│   ├── navigate.html          # 主页面
│   ├── css/
│   │   └── style.css         # 样式文件
│   ├── js/
│   │   └── main.js           # Vue 主文件
│   └── lib/
│       ├── vue.global.js     # Vue 3 CDN
│       ├── element-plus.min.js # Element Plus CDN
│       └── sortable.min.js  # SortableJS CDN
```

## 技术栈

- **前端框架：** Vue 3 (CDN)
- **UI 组件库：** Element Plus (CDN)
- **拖拽库：** SortableJS (CDN)
- **样式：** 自定义 CSS + Element Plus 样式
- **数据存储：** localStorage

## 数据结构设计

```json
{
  "categories": [
    {
      "id": "cat_1",
      "name": "常用工具",
      "items": [
        {
          "id": "item_1",
          "name": "GitHub",
          "url": "https://github.com",
          "icon": "el-icon-platform-eleme"
        }
      ]
    }
  ]
}
```

## 页面设计

### 整体布局
- **背景：** 白色 (#ffffff)
- **边框：** 浅绿色 (#90EE90)
- **布局：** 垂直排列，分类之间用水平分隔线
- **响应式：** 支持不同屏幕尺寸

### 组件结构
```
<div id="app">
  <!-- 分类列表 -->
  <div v-for="category in categories" :key="category.id" class="category">
    <!-- 分类头部 -->
    <div class="category-header">
      <el-button v-if="category.editing" type="text" @click="saveCategory(category)">
        <el-icon><Check /></el-icon>
      </el-button>
      <el-button v-else type="text" @click="startEditCategory(category)" class="edit-btn">
        <el-icon><Edit /></el-icon>
      </el-button>
      <el-button v-if="!category.editing" type="text" @click="deleteCategory(category)" class="delete-btn">
        <el-icon><Delete /></el-icon>
      </el-button>
      
      <el-input v-if="category.editing" v-model="category.tempName" placeholder="分类名称" />
      <h3 v-else>{{ category.name }}</h3>
    </div>

    <!-- 导航项列表 -->
    <div class="navigation-items">
      <div v-for="item in category.items" :key="item.id" class="navigation-item">
        <div class="item-content" @click="navigateTo(item.url)">
          <div class="icon-container">
            <el-icon v-if="item.icon.startsWith('el-icon-')" :class="item.icon" />
            <img v-else :src="item.icon" alt="图标" class="custom-icon" />
          </div>
          <div class="item-name">{{ item.name }}</div>
        </div>
        
        <div class="item-actions">
          <el-button type="text" @click="startEditItem(category, item)" class="edit-btn">
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button type="text" @click="deleteItem(category, item)" class="delete-btn">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
      
      <!-- 添加导航按钮 -->
      <div class="add-item-btn" @click="showAddItemDialog(category)">
        <el-icon><Plus /></el-icon>
      </div>
    </div>
  </div>

  <!-- 添加分类按钮 -->
  <div class="add-category-btn" @click="showAddCategoryDialog">
    <el-icon><Plus /></el-icon>
  </div>

  <!-- 对话框 -->
  <el-dialog v-model="dialogVisible" :title="dialogTitle" width="400px">
    <el-form v-if="dialogType === 'category'" :model="categoryForm" label-width="80px">
      <el-form-item label="分类名称">
        <el-input v-model="categoryForm.name" placeholder="请输入分类名称" />
      </el-form-item>
    </el-form>
    
    <el-form v-else-if="dialogType === 'item'" :model="itemForm" label-width="80px">
      <el-form-item label="名称">
        <el-input v-model="itemForm.name" placeholder="请输入导航名称" />
      </el-form-item>
      <el-form-item label="链接">
        <el-input v-model="itemForm.url" placeholder="请输入URL" />
      </el-form-item>
      <el-form-item label="图标">
        <el-input v-model="itemForm.icon" placeholder="Element Plus图标类名或图片链接" />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDialog">确定</el-button>
      </span>
    </template>
  </el-dialog>
</div>
```

## 样式设计

### 主要样式
```css
/* 全局样式 */
#app {
  padding: 20px;
  background-color: #ffffff;
  min-height: 100vh;
}

/* 分类样式 */
.category {
  margin-bottom: 30px;
  border: 2px solid #90EE90;
  border-radius: 8px;
  padding: 15px;
}

.category-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  gap: 10px;
}

.category-header h3 {
  margin: 0;
  flex: 1;
}

/* 导航项样式 */
.navigation-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 15px;
}

.navigation-item {
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s;
}

.navigation-item:hover {
  transform: translateY(-2px);
}

.item-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.icon-container {
  width: 60px;
  height: 60px;
  border: 2px solid #90EE90;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
}

.custom-icon {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.item-name {
  font-size: 12px;
  color: #333;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-actions {
  display: flex;
  justify-content: center;
  gap: 5px;
  margin-top: 5px;
}

/* 按钮样式 */
.edit-btn, .delete-btn {
  padding: 2px 4px;
  font-size: 14px;
}

.add-item-btn, .add-category-btn {
  width: 60px;
  height: 60px;
  border: 2px dashed #90EE90;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #90EE90;
  font-size: 24px;
  transition: all 0.2s;
}

.add-item-btn:hover, .add-category-btn:hover {
  background-color: #f0f9ff;
  border-color: #67c23a;
  color: #67c23a;
}

/* 分隔线 */
.separator {
  height: 1px;
  background-color: #e0e0e0;
  margin: 20px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .navigation-items {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
  
  .icon-container {
    width: 50px;
    height: 50px;
  }
}
```

## 功能设计

### 分类管理
1. **添加分类**
   - 点击底部加号按钮
   - 弹出对话框
   - 输入分类名称
   - 点击确定保存

2. **编辑分类**
   - 点击分类上的编辑图标
   - 分类名称变为输入框
   - 修改名称后点击保存图标

3. **删除分类**
   - 点击分类上的删除图标
   - 确认删除（包含所有导航项）

### 导航项管理
1. **添加导航**
   - 点击分类内的加号按钮
   - 弹出对话框
   - 输入名称、URL、图标
   - 点击确定保存

2. **编辑导航**
   - 点击导航项上的编辑图标
   - 弹出对话框
   - 修改信息后点击确定

3. **删除导航**
   - 点击导航项上的删除图标
   - 确认删除

### 拖拽功能
- **分类拖拽：** 使用 SortableJS 实现分类顺序调整
- **导航项拖拽：** 使用 SortableJS 实现同一分类内导航项顺序调整
- 拖拽完成后自动保存到 localStorage

### 数据持久化
- 所有数据存储在 localStorage
- 页面加载时读取，操作时自动保存
- 数据结构为 JSON 格式

### 路由配置
- 在 `server.js` 中添加路由 `/navigate`
- 映射到 `navigate.html` 文件

## 实现要点

1. **Vue 3 组件化**
   - 使用 Composition API
   - 响应式数据管理
   - 生命周期钩子

2. **Element Plus 组件**
   - Dialog 对话框
   - Form 表单
   - Input 输入框
   - Button 按钮
   - Icon 图标

3. **拖拽实现**
   - SortableJS 库
   - 事件监听和处理
   - 数据同步

4. **图标支持**
   - Element Plus 图标类名
   - 自定义图片URL
   - 统一的图标容器样式

5. **交互体验**
   - 悬停显示操作按钮
   - 编辑状态切换
   - 确认删除对话框

## 测试计划

1. **功能测试**
   - 添加、编辑、删除分类
   - 添加、编辑、删除导航项
   - 拖拽排序功能

2. **数据持久化测试**
   - 刷新页面数据是否保留
   - 新增数据是否保存

3. **响应式测试**
   - 不同屏幕尺寸显示
   - 移动端适配

4. **兼容性测试**
   - 不同浏览器兼容性
   - CDN 加载是否正常