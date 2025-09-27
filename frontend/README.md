# Battlefield 中文 ID 计算器

Vite + React + Tailwind 前端，支持：
- 战地1 / 战地5 / 战地2042 独立哈希表展示与搜索
- 战地1：简体输入 → 繁体检索（opencc-js）
- 顶部表单调用现有 API 计算中文 ID

## 本地开发

```bash
npm install
npm run dev
```

访问控制台输出的本地地址。

## 构建

```bash
npm run build
npm run preview
```

## 静态部署（Nginx）
构建后将 `dist/` 内容放到你的静态站点根目录即可。
