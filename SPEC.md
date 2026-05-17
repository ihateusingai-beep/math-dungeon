# 乘法小鎮 - 小学生乘法学习工具

## 1. Project Overview
- **Name**: 乘法小鎮 (Multiplication Town)
- **Type**: Educational Interactive Web App
- **Core**: 用可视化的点阵 + 实物图，教小学生理解 2-9 乘法的原理
- **Target**: 特殊教育学生 / 普通小学生

## 2. Visual Specification

### Layout
- 单页应用，中间大块点阵展示区
- 左右数字选择按钮（2-9）
- 底部结果显示 + Cantonese解释

### Icons per Number
| 数字 | 主图示 | 颜色主题 |
|-----|-------|---------|
| 2 | 🦆 鸭子 | #FFD93D 黄 |
| 3 | 🌸 花 | #FF6B6B 红 |
| 4 | 🍀 四叶草 | #6BCB77 绿 |
| 5 | ⭐ 星星 | #4D96FF 蓝 |
| 6 | 🐞 瓢虫 | #FF6B6B 红 |
| 7 | 🌈 彩虹 | #C9B1FF 紫 |
| 8 | 🐙 章鱼 | #FF8C42 橙 |
| 9 | 🍇 葡萄 | #9B59B6 紫 |

### 点阵设计
- 每个 item 是圆形点，直径 24px，间距 4px
- 两行之间有明显分隔线（虚线，#ccc）
- 进入动画：从左上到右下逐个显示（0.1s间隔）

### Typography
- 标题：ZCOOL KuaiLe（可爱中文）
- 数字：大号圆形按钮，圆角 16px
- 说明文字：偏口语 Cantonese

## 3. Interaction Spec

### 控制区
- 两个数字选择器：左边「被乘数」× 右边「乘数」
- 点击按钮直接切换，无需键盘

### 展示区
- 上排：文字算式 「3 × 4 = 12」
- 中间：视觉化点阵（3行4列 = 12点点阵）
- 下排：Cantonese 说明 「3×4即係3行4列，一共12点」

### 动画效果
- 切换数字时：点阵从左上开始逐个出现
- hover按钮：轻微放大 1.05

## 4. Cantonese UI Text
- 「揾下」= 点击
- 「即係」= 也就是说
- 「一共」= 总共
- 「行」= row
- 「列」= column
- 「呢個係」= 这个是
- 「乘法小鎮」= Multiplication Town