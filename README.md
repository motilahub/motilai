# MOTILAI Chat

基于 Next.js、assistant-ui 和 Vercel AI SDK 的多模态 AI 对话界面。

## 功能

- 流式文字对话
- 图片与文件附件
- 中文语音听写
- `@` 助手、知识库和工具
- 消息中的 `@agent`、`@knowledge` 和 `@tool` 提及以名称标签显示，不展示原始指令参数
- OpenAI 兼容接口
- 无密钥演示模式
- 用户注册、登录与管理员用户管理
- 聊天侧边栏桌面端折叠
- 用户基础资料、头像、密码重置与账号复制
- 多厂家 OpenAI 兼容模型供应商配置、生成参数、流式模式和模型列表获取
- 独立视觉层次的登录与注册页面

## 本地运行

本项目使用根目录下隔离的 Node.js 22 运行时：

```bash
export PATH=/home/ubuntu/softwares/motilai/.runtime/node/bin:$PATH
cd /home/ubuntu/softwares/motilai
cp .env.example .env.local
npm run dev
```

模型配置通过 `OPENAI_API_KEY`、`OPENAI_BASE_URL` 和 `OPENAI_MODEL` 提供。
用户与会话数据通过 `MOTILAI_DATA_DIR` 持久化。系统首次启动会自动创建超级管理员 `admin / admin`，该账号不可删除、禁用或调整权限。
生产服务由 systemd 管理 Docker Compose，包含 `postgres:15-alpine` 和 MOTILAI 应用，Nginx 将 80/443 请求反向代理到 `127.0.0.1:3100`。

## Docker 部署

将 `deploy/motilai-chat.env.example` 复制为 `/etc/motilai-chat.env` 并设置 `POSTGRES_PASSWORD`，然后在项目目录执行：

```bash
cd /home/ubuntu/softwares/motilai
sudo -u ubuntu docker compose --env-file /etc/motilai-chat.env up -d
```

常用运维命令：

```bash
# 启动并重新构建应用镜像（代码或 Dockerfile 修改后使用）
sudo -u ubuntu docker compose --env-file /etc/motilai-chat.env up -d --build

# 重启现有容器
sudo -u ubuntu docker compose --env-file /etc/motilai-chat.env restart

# 查看容器状态
sudo -u ubuntu docker compose --env-file /etc/motilai-chat.env ps

# 查看应用和 PostgreSQL 日志
sudo -u ubuntu docker compose --env-file /etc/motilai-chat.env logs -f app postgres

# 停止并移除容器（不会删除 PostgreSQL 命名卷）
sudo -u ubuntu docker compose --env-file /etc/motilai-chat.env down
```

生产环境也可通过 systemd 管理整个 Compose 服务：

服务单元文件为 `deploy/motilai-chat.service`，其中工作目录必须指向本项目根目录 `/home/ubuntu/softwares/motilai`。安装或更新服务单元后执行 `daemon-reload`，再使用以下命令管理服务：

```bash
sudo install -m 0644 deploy/motilai-chat.service /etc/systemd/system/motilai-chat.service
sudo systemctl daemon-reload
sudo systemctl start motilai-chat
sudo systemctl restart motilai-chat
sudo systemctl status motilai-chat
```

旧 JSON 用户数据放到 `.data/users.json` 后，首次启动会自动导入 PostgreSQL。

登录管理员账号后，可从侧边栏进入“用户管理”“模型供应商”“助手”“知识库”“工具”和“系统配置”。用户管理支持新增、编辑、复制、删除、启用/禁用、头像选择与清空、手机号、UUID、用户类型、角色和密码重置；头像只显示图片预览，不在界面中展示 data URI 文本。用户与资源列表均提供序号、单双行浅色区分、复选框、全选和批量删除，系统管理员账号不可选中或删除。模型供应商支持选择 OpenAI、DeepSeek、Ollama、通义千问、智谱、Google Gemini 等预置厂家及自定义类型，并自动带出可编辑的 Base URL；编辑抽屉可直接获取供应商 `/models` 列表，并配置温度、Top P、Top K、最大输出 Token、频率/存在惩罚、停止词、随机种子、上下文窗口、流式响应、请求超时、重试次数以及视觉和工具调用能力。配置会持久化并实际用于聊天请求，留空的生成参数由模型自行采用默认值。管理接口和页面不会返回或展示 API Key 的任何片段，只显示是否已配置。系统配置中的 Logo 和 Favicon 均通过点击图片选择文件，并支持清空，不显示图片 URL 或 data URI 文本。后台 header 使用紧凑高度，面包屑导航居左显示，页面内容采用更宽的可用区域，不显示右上角用户头像和名称。启用的供应商会优先用于聊天，未配置供应商时继续使用 `OPENAI_*` 环境变量。
聊天中的助手、知识库和工具提及会以对应名称的标签呈现，例如 `@agent[通用助手]{name=general}` 仅显示“通用助手”，不会把类型、ID 或 `{name=...}` 参数直接展示给用户。
