# MOTILAI Chat

基于 Next.js、assistant-ui 和 Vercel AI SDK 的多模态 AI 对话界面。

## 功能

- 流式文字对话
- 图片与文件附件
- 中文语音听写
- `@` 助手、知识库和工具
- OpenAI 兼容接口
- 无密钥演示模式
- 用户注册、登录与管理员用户管理
- 聊天侧边栏桌面端折叠
- 用户基础资料、头像、密码重置与账号复制
- OpenAI 兼容模型供应商配置和模型列表自动获取

## 本地运行

本项目使用根目录下隔离的 Node.js 22 运行时：

```bash
export PATH=/home/ubuntu/softwares/motilai/.runtime/node/bin:$PATH
cd /home/ubuntu/softwares/motilai/chat-ui
cp .env.example .env.local
npm run dev
```

模型配置通过 `OPENAI_API_KEY`、`OPENAI_BASE_URL` 和 `OPENAI_MODEL` 提供。
用户与会话数据通过 `MOTILAI_DATA_DIR` 持久化。系统首次启动会自动创建超级管理员 `admin / admin`，该账号不可删除、禁用或调整权限。
生产服务由 systemd 管理 Docker Compose，包含 `postgres:15-alpine` 和 MOTILAI 应用，Nginx 将 80/443 请求反向代理到 `127.0.0.1:3100`。

## Docker 部署

将 `deploy/motilai-chat.env.example` 复制为 `/etc/motilai-chat.env` 并设置 `POSTGRES_PASSWORD`，然后在项目目录执行：

```bash
cd /home/ubuntu/softwares/motilai/chat-ui
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

```bash
sudo systemctl start motilai-chat
sudo systemctl restart motilai-chat
sudo systemctl status motilai-chat
```

旧 JSON 用户数据放到 `.data/users.json` 后，首次启动会自动导入 PostgreSQL。

登录管理员账号后，可从侧边栏进入“用户管理”和“模型供应商”。用户管理支持新增、编辑、复制、删除、启用/禁用、头像 URL、手机号、UUID、用户类型、角色和密码重置；模型供应商支持配置 Base URL、API Key、默认模型、启用状态，并通过供应商的 `/models` 接口自动获取模型列表。启用的供应商会优先用于聊天，未配置供应商时继续使用 `OPENAI_*` 环境变量。
