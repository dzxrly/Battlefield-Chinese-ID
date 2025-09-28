# 战地中文ID查询工具

## Cloudflare Pages 部署

1. Fork 仓库至自己的 Github 仓库，并将其推送至自己的 Github 账户。
2. 登录 Cloudflare 控制台，在左侧菜单中选择 计算(Workers) -> Workers和Pages。
3. 点击 “创建应用程序” -> “Pages”（注意一定要选Pages） → “导入现有 Git 存储库”。授权 Cloudflare 访问你的 Github 账户后，选择刚才
   Fork 的仓库。
4. 在 “设置您的应用程序” 页面中配置：
    - **项目名称**: battlefield-chinese-id
    - **生产分支**：`main`（Github 仓库默认分支，如果你自行修改了请注意这里按照你自己的设置填）。
    - **框架预设**: 无。
    - **构建命令**: `npm i -g @quasar/cli; npm install; quasar build;`。
    - **构建输出目录**: `dist/spa`。
5. 点击 “创建和部署”。首次部署会自动触发构建，完成后即可获得生产环境访问地址。
6. 若需要自定义域名，可在 Pages 项目设置中绑定自定义域并完成 DNS 解析。
7. 后续每次向 `main`（或指定分支）推送代码，Cloudflare Pages 会自动重新构建并部署最新版本。

---

## Development

### Install the dependencies

```bash
yarn
# or
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

```bash
quasar dev
```

### Lint the files

```bash
yarn lint
# or
npm run lint
```

### Format the files

```bash
yarn format
# or
npm run format
```

### Build the app for production

```bash
quasar build
```

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).
