# SEO 修复与验证（2026-09-22）

## 已完成

- `/en`、`/zh` 输出对应语言的服务端正文、html lang、title、description、self-canonical 和双向 hreflang；`/` 保留英文入口，旧 `/?lang=en|zh` 返回 307 到对应语言页。
- `/bridge` 使用独立 metadata 与 self-canonical；`/history` 使用独立 metadata、noindex，从 sitemap 移除。
- 五个 FAQ 回答始终出现在初始 HTML/DOM，继续保留单项展开与收起，增加 aria-expanded/aria-controls。
- 页脚直接提供作者、PromptVault、优卡及语言链接。
- 首页链数量和展示字段在服务端从同一 CHAINS 数据源传入，避免公开展示组件直接耦合 RPC 配置模块。

## 保留的钱包生命周期

所有页面仍使用单一根布局及原来的 AppProviders、EVM/Solana adapter、AppKit 初始化顺序和 Header 钱包控件。首页与功能页之间继续软导航。

本轮不拆钱包 Provider。现有 `useBridge` 在 SDK 完成或抛错后才保存历史，期间观察到的交易哈希保留在内存中；多个根布局触发整页导航，会中断在途 SDK 流程，因此该方案已撤回。没有更改交易执行、持久化或签名逻辑。

语言 middleware 覆盖请求头，根布局按该头输出 html lang；因此公开页为动态 SSR，而非静态导出。OpenNext 本地 Worker 已验证对应正文与 metadata。

## 构建配置

初始本地仅有 `.env.example`，未配置 NEXT_PUBLIC_REOWN_PROJECT_ID。已从当前生产 `/bridge` 公开客户端代码中精确定位 AppKit 使用的公开 Project ID，并仅恢复到 ignored `.env.local`（0600）。最终构建已使用该值，报告与 Git 变更均不包含值。

NEXT_PUBLIC_ALCHEMY_API_KEY 和各 NEXT_PUBLIC_*_RPC_URL 本地未另设；代码提供公共 RPC fallback。生产公开客户端包含全部 23 个 EVM defaultUrl 和同一 Solana 默认节点，未检出已配置的 Alchemy `/v2/<key>` 地址。该检查不能替代部署平台私有配置审计；后续其他环境构建仍必须提供生产所需公开 Reown ID。

## 验证

- `npm run lint`、`npx tsc --noEmit`、`npm run cf:build`。
- 独立 `wrangler dev --local --port 8807 --inspector-port 9347`，未终止现有服务。
- `node scripts/check-seo.mjs http://localhost:8807`：所有入口 200、唯一 canonical、双语 hreflang/正文、FAQ 初始 HTML、history noindex/sitemap 排除、旧查询重定向、未知 `/fr` 返回 404。
- 浏览器验证中文/英文切换、FAQ 展开、首页→bridge→history→bridge；额外输入未提交的 `1.23` 表单值，bridge→首页→bridge 后值仍保留，确认软导航保留内存状态。
- 恢复公开 Reown ID 后不再出现缺少 Project ID 错误；观察到一次第三方 Analytics SDK 网络请求失败。没有连接钱包、签名或真实转账，不能把页面验证视为钱包资金流验证。
- 本地首页初始脚本 32 个、3,203,176 字节，gzip 919,221 字节。钱包仍在根布局，**本轮不宣称大幅减包或 Core Web Vitals 改善**。结果见 `seo-http-2026-09-22.json`。

未部署、未 commit、未 push。Cloudflare 构建保留第三方依赖的重复属性/负零比较警告及 Next middleware 弃用提示，构建和本地 Worker 运行通过。
