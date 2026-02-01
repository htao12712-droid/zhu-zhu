# 猪猪养基 H5 应用

为进阶基金投资者提供数据决策工具的H5应用。

## 项目简介

**产品定位**: 为进阶基金投资者提供"数据决策工具",而非单纯的交易通道。

**目标用户**: 有一定知识储备、注重数据分析和长期资产配置的投资者。

**核心价值**: 通过多维度的数据分析工具,帮助投资者做出更理性的基金投资决策。

## 项目结构

```
pig-fund-h5/
├── frontend/              # 前端项目 (Vue 3 + Vite + TypeScript)
│   ├── src/
│   │   ├── views/        # 页面组件(9个主要页面)
│   │   ├── components/    # 公共组件
│   │   ├── stores/       # Pinia 状态管理
│   │   ├── services/     # API服务(认证/基金/估值/组合/分析)
│   │   ├── router/       # 路由配置
│   │   ├── utils/        # 工具函数
│   │   └── types/        # TypeScript 类型定义
│   ├── Dockerfile
│   └── nginx.conf
├── backend/              # 后端项目 (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── controllers/  # 控制器(认证/基金/估值/组合/分析)
│   │   ├── services/     # 业务逻辑(10个核心服务)
│   │   ├── models/       # 数据模型(用户/基金/估值/组合)
│   │   ├── routes/       # 路由定义(6个API模块)
│   │   ├── middleware/   # 中间件(认证/错误处理/限流)
│   │   ├── utils/        # 工具函数(日志)
│   │   ├── config/       # 配置文件(数据库/Redis/InfluxDB)
│   │   └── types/        # TypeScript 类型定义
│   ├── database/         # 数据库脚本
│   │   ├── schema.sql    # 建表脚本(13个核心表)
│   │   └── seeds.sql     # 种子数据
│   ├── tests/           # 测试用例
│   ├── scripts/          # 辅助脚本
│   └── Dockerfile
├── .monkeycode/          # 项目文档
│   └── specs/2026-01-31-pig-fund-h5/
│       ├── requirements.md # 需求规格说明书
│       ├── design.md      # 技术设计文档
│       └── tasklist.md    # 实施任务清单
├── .github/              # GitHub Actions CI/CD
└── docker-compose.yml    # Docker 编排配置
```

## 技术栈

### 前端
- **框架**: Vue 3 (Composition API)
- **构建工具**: Vite
- **语言**: TypeScript
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **UI组件**: Vant 4 (移动端组件库)
- **图表库**: ECharts 5
- **HTTP客户端**: Axios

### 后端
- **运行时**: Node.js 18+
- **框架**: Express
- **语言**: TypeScript
- **ORM**: pg (PostgreSQL原生驱动)
- **数据库**: PostgreSQL 15
- **缓存**: Redis 7
- **时序数据库**: InfluxDB 2 (基金净值数据)
- **认证**: JWT + bcrypt
- **日志**: Winston
- **定时任务**: node-cron
- **限流**: rate-limiter-flexible

## 核心功能

### 1. 智能选基系统
- 多维筛选器(类型/行业/规模/基金经理/量化指标)
- 动态排行榜单(日/周/月收益榜、稳定性榜、创新高榜)
- 主题基金发现(科创50/碳中和/新能源等热门主题)

### 2. 深度分析系统
- **业绩分析**: 收益走势对比、阶段收益分析、年化收益率
- **风险扫描**: 波动率、最大回撤、下行风险、收益稳定性评分
- **持仓穿透**: 重仓股/债分析、行业集中度、换手率推算
- **经理评价**: 生涯年化回报、管理规模变迁、风格箱分析

### 3. 估值系统(核心特色)
- **估值仪表盘**: 实时展示宽基/行业/主题指数估值状态
- **估值榜单**: 按估值分位点排序的指数排名
- **估值回测**: 估值定投策略历史表现回测
- **估值信号**: 低估/正常/高估状态判定和定投建议

### 4. 组合管理系统
- **持仓跟踪**: 手动/导入持仓,计算整体收益、日盈亏、资产分布
- **风险诊断**: 组合波动率、相关性矩阵、行业/风格暴露度分析
- **模拟组合**: 虚拟建仓,测试策略可行性
- **调仓提醒**: 基于市场变化或自定义规则的智能调仓建议

### 5. 工具与资讯系统
- **定投计算器**: 普能定投、估值定投、均线定投收益模拟
- **止盈止损提醒**: 自定义触发条件和智能监控
- **资讯聚合**: 市场解读、基金公告、研报摘要
- **账户同步**: 支持第三方平台导入(天天基金/蛋卷)

### 6. 高级功能
- **相关性分析**: 基金间相关性矩阵计算
- **智能通知**: 模板化通知系统,支持估值信号、止盈止损等提醒
- **定时任务**: 自动数据采集、估值计算、风险诊断

## 快速开始

### 前置要求

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### 安装依赖

```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

### 配置环境变量

复制 `.env.example` 到 `.env` 并修改配置:

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pigfund
REDIS_URL=redis://localhost:6379
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=admin-token
INFLUX_ORG=pigfund
INFLUX_BUCKET=fund-nav
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug

# 实时基金数据配置
FUND_SEARCH_ENDPOINT=https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx
FUND_SEARCH_MODE=10
FUND_SEARCH_TIMEOUT=4000
FUND_SEARCH_MIN_LENGTH=2
FUND_SEARCH_CACHE_TTL=30
FUND_ESTIMATE_ENDPOINT=https://fundgz.1234567.com.cn/js
FUND_ESTIMATE_TIMEOUT=4000
FUND_ESTIMATE_CACHE_TTL=10
FUND_PROVIDER_NAME=Eastmoney
FUND_PROVIDER_USER_AGENT=Mozilla/5.0 (PigFundH5)
```

### 初始化数据库

```bash
cd backend
npm run db:init
npm run db:seed
```

### 启动开发环境

**后端开发服务器**:

```bash
cd backend
npm run dev
```

**前端开发服务器**:

```bash
cd frontend
npm run dev
```

### 使用Docker启动

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

访问 http://localhost 查看应用。

### 常用命令

```bash
# 后端
cd backend
npm run dev          # 开发模式
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run test         # 运行测试
npm run lint         # 代码检查
npm run typecheck    # TypeScript类型检查

# 前端
cd frontend
npm run dev          # 开发模式
npm run build        # 构建生产版本
npm run preview      # 预览生产构建
```

## API文档

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/profile` - 获取用户信息
- `PUT /api/auth/profile` - 更新用户信息
- `POST /api/auth/change-password` - 修改密码

### 基金相关

- `GET /api/funds` - 获取基金列表
- `GET /api/funds/:id` - 获取基金详情
- `GET /api/funds/:id/nav` - 获取净值历史
- `GET /api/funds/:id/holdings` - 获取基金持仓
- `GET /api/funds/search` - 搜索基金
- `GET /api/funds/top` - 获取热门基金

### 估值相关

- `GET /api/valuation/dashboard` - 估值仪表盘
- `GET /api/valuation/ranking` - 估值榜单
- `GET /api/valuation/index/:code/detail` - 指数估值详情
- `POST /api/valuation/backtest` - 估值回测

### 组合相关

- `GET /api/portfolio` - 获取用户持仓
- `POST /api/portfolio` - 添加持仓
- `PUT /api/portfolio/:id` - 更新持仓
- `DELETE /api/portfolio/:id` - 删除持仓
- `GET /api/portfolio/risk-diagnosis` - 风险诊断
- `GET /api/portfolio/simulated` - 模拟组合列表
- `POST /api/portfolio/simulated` - 创建模拟组合
- `POST /api/portfolio/stop-loss-profit` - 添加止盈止损设置

### 分析相关

- `GET /api/analysis/:fundId/performance` - 业绩分析
- `GET /api/analysis/:fundId/risk` - 风险分析
- `GET /api/analysis/:fundId/holdings` - 持仓分析
- `GET /api/analysis/:fundId/manager` - 基金经理分析
- `POST /api/analysis/correlation` - 相关性计算

### 通知相关

- `GET /api/notifications` - 获取通知列表
- `GET /api/notifications/unread-count` - 获取未读数量
- `PUT /api/notifications/:id/read` - 标记已读
- `PUT /api/notifications/read-all` - 全部标记已读
- `DELETE /api/notifications` - 删除通知

### 管理相关

- `GET /api/admin/collectors/status` - 获取采集器状态
- `POST /api/admin/collectors/run` - 运行数据采集

## 项目文档

详细的需求文档、设计文档和任务清单位于 `.monkeycode/specs/2026-01-31-pig-fund-h5/` 目录。

- **requirements.md** - 需求规格说明书(35个需求,符合EARS规范)
- **design.md** - 技术设计文档(架构、组件、数据模型)
- **tasklist.md** - 实施任务清单(8个阶段,48个任务)

## 开发进度

| 阶段 | 状态 | 完成度 |
|------|------|--------|
| 第一阶段: 项目初始化 | ✅ 完成 | 100% |
| 第二阶段: 数据层实现 | ✅ 完成 | 100% |
| 第三阶段: 后端核心服务 | ✅ 完成 | 100% |
| 第四阶段: 前端页面开发 | 🚧 进行中 | 80% |
| 第五阶段: 数据采集与处理 | 🚧 进行中 | 60% |
| 第六阶段: 高级功能实现 | 🚧 进行中 | 70% |
| 第七阶段: 测试与优化 | 🚧 进行中 | 40% |
| 第八阶段: 上线部署 | ⏳ 待开始 | 0% |

**总体进度**: 约65%

## 贡献

欢迎提交 Issue 和 Pull Request。

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT

## 联系方式

- 项目地址: https://github.com/htao12712-droid/zhu-zhu
- 问题反馈: https://github.com/htao12712-droid/zhu-zhu/issues

## 免责声明

**重要提示**:

1. 本应用提供的所有数据仅供参考,不构成任何投资建议。
2. 基金投资有风险,入市需谨慎。
3. 历史业绩不代表未来表现。
4. 用户应根据自身风险承受能力独立做出投资决策。
5. 本应用不对投资结果承担任何责任。

## 致谢

感谢所有为开源社区做出贡献的开发者。


## 截图识别自动填持仓（小倍养基式）

在【我的组合】->【添加持仓】里，点击“上传截图自动填”。

- 会自动识别截图中的 **基金代码（6位）** 和 **买入金额**，并自动选中基金、填写金额。
- OCR 使用浏览器端 tesseract.js，首次识别需要下载语言模型/wasm（会被浏览器缓存）。如果服务器/网络无法访问 unpkg，可自行改成自建静态资源。
