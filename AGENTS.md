## 工程说明
工程服务端口3100,调整功能测试请直接在3100上处理,不要启动如3000等其它服务端口;

## git版本与分支管理策略

每次修改代码前都需要commit上次修改，创建新分支后再开始做代码修改

1. 每个任务在修改代码前必须创建 Git 分支。
2. 开发任务完成后**更新**工程中docs中的 产品说明书.md 、README.md（系统介绍）
3. 分支命名：`YYYYMMDDNNN`（年月日 + 3位流水号），每次新分支在当前所在分支上创建并比前一个分支流水号上 +1，若今天是新的一天且无当日DD分支，则创建当日YYYYMMDD001，如果不知道当前分支的流水号应该给多少，可以直接查看git branch的历史。
4. (不自动，需询问）Commit 格式：`[ADD/IMP/FIX]本次变更代码功能说明#task:YYYYMMDD00`，询问用户是否需要Commit。
   - ADD：新增
   - IMP：功能优化
   - FIX：BUG修复
5. (不自动，需询问）功能开发完成后默认将当前分支PR到origin，PR最好是带上title、desc，可以直接上去PR不需要编辑维护标题和内容信息，直接带出。询问用户是否需要Push与PR。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
