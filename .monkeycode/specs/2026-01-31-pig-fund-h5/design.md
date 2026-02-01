# 猪猪养基 H5 应用技术设计文档

Feature Name: pig-fund-h5
Updated: 2026-01-31

## 描述

猪猪养基是一款面向进阶基金投资者的H5数据决策工具应用,提供智能选基、深度分析、估值分析、组合管理等核心功能。通过多维度的数据分析工具,帮助投资者做出更理性的基金投资决策。

**核心技术栈**:
- 前端: Vue 3 + Vite + TypeScript + Pinia
- 移动端UI: Vant 4
- 后端: Node.js + Express + TypeScript
- 数据库: PostgreSQL + Redis
- 图表库: ECharts
- 部署: Docker + Nginx

## 系统架构

### 整体架构图

```mermaid
graph TB
    subgraph "客户端层"
        A[H5 移动端应用]
        B[桌面浏览器]
    end

    subgraph "网关层"
        C[Nginx 反向代理]
        D[CDN 静态资源]
    end

    subgraph "应用层"
        E[用户服务]
        F[基金数据服务]
        G[分析计算服务]
        H[估值服务]
        I[组合服务]
        J[消息通知服务]
    end

    subgraph "数据层"
        K[PostgreSQL 主库]
        L[PostgreSQL 从库]
        M[Redis 缓存]
        N[时序数据库 - 净值数据]
    end

    subgraph "外部数据源"
        O[交易所接口]
        P[指数公司API]
        Q[第三方基金数据商]
        R[第三方登录平台]
        S[支付网关]
    end

    A --> C
    B --> C
    C --> E
    C --> F
    C --> G
    C --> H
    C --> I
    C --> J
    E --> K
    E --> M
    F --> K
    F --> L
    F --> N
    F --> O
    F --> Q
    G --> K
    G --> N
    G --> M
    H --> K
    H --> P
    I --> K
    I --> M
    J --> M
    J --> R
    E --> S
    D --> A
    D --> B
```

### 前端架构图

```mermaid
graph TB
    subgraph "页面层"
        A[首页]
        B[基金筛选页]
        C[基金详情页]
        D[估值仪表盘]
        E[估值榜单]
        F[估值回测]
        G[组合管理]
        H[模拟组合]
        I[工具中心]
        J[资讯中心]
        K[用户中心]
    end

    subgraph "组件层"
        L[基金卡片组件]
        M[估值卡片组件]
        N[图表组件]
        O[筛选器组件]
        P[排行榜组件]
        Q[持仓列表组件]
        R[风险诊断组件]
    end

    subgraph "状态管理层"
        S[Pinia Store]
        T[用户状态]
        U[基金数据状态]
        V[估值数据状态]
        W[组合状态]
    end

    subgraph "服务层"
        X[API 请求服务]
        Y[数据缓存服务]
        Z[工具函数库]
    end

    subgraph "基础设施层"
        AA[Vue Router]
        AB[Vite 构建工具]
        AC[TypeScript 类型系统]
    end

    A --> L
    A --> M
    B --> O
    C --> N
    C --> L
    D --> M
    E --> P
    F --> N
    G --> Q
    G --> R
    H --> Q
    I --> N
    J --> L
    K --> L
    L --> S
    M --> S
    N --> S
    O --> S
    P --> S
    Q --> S
    R --> S
    S --> X
    X --> Y
    X --> Z
    AA --> A
    AB --> A
    AC --> A
```

### 数据流架构图

```mermaid
graph LR
    A[外部数据源] --> B[数据采集服务]
    B --> C[数据清洗服务]
    C --> D[数据存储层]
    D --> E[缓存层]
    E --> F[业务计算层]
    F --> G[API层]
    G --> H[前端展示]

    B --> I[数据质量监控]
    I --> B

    D --> J[数据备份]
    J --> D

    F --> K[计算结果缓存]
    K --> F
```

## 组件与接口

### 前端核心组件

#### 1. 基金筛选器组件 (FundFilter)

**职责**: 提供多维度基金筛选功能

**Props**:
- `filterOptions`: 筛选选项配置
- `initialFilters`: 初始筛选条件

**Events**:
- `@filter-change`: 筛选条件变更事件
- `@filter-reset`: 重置筛选条件事件

**关键方法**:
- `applyFilters()`: 应用筛选条件
- `resetFilters()`: 重置筛选条件

#### 2. 估值卡片组件 (ValuationCard)

**职责**: 显示单个指数/行业的估值状态

**Props**:
- `indexData`: 指数数据对象
- `valuationMetrics`: 估值指标对象

**关键方法**:
- `getValuationStatus()`: 获取估值状态(低/中/高)
- `getStatusColor()`: 获取状态颜色

#### 3. 图表组件 (ChartComponent)

**职责**: 封装 ECharts 图表

**Props**:
- `chartType`: 图表类型(line/bar/pie等)
- `chartData`: 图表数据
- `chartOptions`: 图表配置选项

**关键方法**:
- `initChart()`: 初始化图表
- `updateChart()`: 更新图表数据

#### 4. 组合风险诊断组件 (PortfolioRiskDiagnostic)

**职责**: 展示投资组合风险分析

**Props**:
- `portfolioData`: 组合数据
- `riskMetrics`: 风险指标

**关键方法**:
- `calculateCorrelationMatrix()`: 计算相关性矩阵
- `analyzeExposure()`: 分析暴露度

### 后端核心服务

#### 1. 用户服务 (UserService)

**职责**: 用户认证、授权、账户管理

**主要接口**:
- `POST /api/auth/register`: 用户注册
- `POST /api/auth/login`: 用户登录
- `POST /api/auth/logout`: 用户登出
- `GET /api/user/profile`: 获取用户信息
- `PUT /api/user/profile`: 更新用户信息

**关键方法**:
- `registerUser()`: 注册用户
- `authenticateUser()`: 用户认证
- `getUserProfile()`: 获取用户档案

#### 2. 基金数据服务 (FundDataService)

**职责**: 基金数据管理、查询、更新

**主要接口**:
- `GET /api/funds/:id`: 获取基金详情
- `GET /api/funds`: 获取基金列表
- `POST /api/funds/filter`: 基金筛选
- `GET /api/funds/:id/nav`: 获取基金净值历史
- `GET /api/funds/:id/holdings`: 获取基金持仓

**关键方法**:
- `getFundById()`: 根据ID获取基金
- `filterFunds()`: 基金筛选
- `getFundNavHistory()`: 获取净值历史
- `getFundHoldings()`: 获取持仓数据

#### 3. 分析计算服务 (AnalysisService)

**职责**: 基金业绩、风险、持仓分析计算

**主要接口**:
- `GET /api/analysis/:fundId/performance`: 获取业绩分析
- `GET /api/analysis/:fundId/risk`: 获取风险分析
- `GET /api/analysis/:fundId/holdings`: 获取持仓分析
- `GET /api/analysis/:fundId/manager`: 获取基金经理分析

**关键方法**:
- `calculatePerformance()`: 计算业绩指标
- `calculateRiskMetrics()`: 计算风险指标
- `analyzeHoldings()`: 分析持仓结构
- `evaluateManager()`: 评价基金经理

#### 4. 估值服务 (ValuationService)

**职责**: 估值数据采集、计算、分位点计算

**主要接口**:
- `GET /api/valuation/dashboard`: 获取估值仪表盘数据
- `GET /api/valuation/ranking`: 获取估值榜单
- `GET /api/valuation/index/:code/detail`: 获取指数估值详情
- `GET /api/valuation/backtest`: 估值定投回测

**关键方法**:
- `calculatePercentile()`: 计算分位点
- `getValuationStatus()`: 判断估值状态
- `runBacktest()`: 执行回测计算
- `getValuationHistory()`: 获取估值历史

#### 5. 组合服务 (PortfolioService)

**职责**: 持仓跟踪、组合管理、风险诊断

**主要接口**:
- `GET /api/portfolio`: 获取用户持仓
- `POST /api/portfolio`: 添加持仓
- `PUT /api/portfolio/:id`: 更新持仓
- `DELETE /api/portfolio/:id`: 删除持仓
- `GET /api/portfolio/risk-diagnosis`: 获取风险诊断
- `GET /api/portfolio/simulations`: 获取模拟组合列表

**关键方法**:
- `getUserPortfolio()`: 获取用户持仓
- `addHolding()`: 添加持仓
- `calculatePortfolioMetrics()`: 计算组合指标
- `diagnoseRisk()`: 风险诊断

#### 6. 数据采集服务 (DataCollectorService)

**职责**: 从外部数据源采集数据

**主要接口**:
- `POST /api/admin/data-collect/trigger`: 手动触发数据采集
- `GET /api/admin/data-collect/status`: 查看采集状态

**关键方法**:
- `collectFundData()`: 采集基金数据
- `collectNavData()`: 采集净值数据
- `collectValuationData()`: 采集估值数据
- `collectHoldingsData()`: 采集持仓数据

## 数据模型

### 数据库表设计

#### 用户相关表

**用户表 (users)**

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 用户ID | PRIMARY KEY |
| phone | VARCHAR(20) | 手机号 | UNIQUE, NOT NULL |
| email | VARCHAR(100) | 邮箱 | UNIQUE |
| password_hash | VARCHAR(255) | 密码哈希 | NOT NULL |
| nickname | VARCHAR(50) | 昵称 | |
| avatar_url | VARCHAR(255) | 头像URL | |
| member_level | TINYINT | 会员等级 | DEFAULT 0 |
| member_expires_at | TIMESTAMP | 会员到期时间 | |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**第三方账号绑定表 (user_third_party_accounts)**

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 绑定ID | PRIMARY KEY |
| user_id | BIGINT | 用户ID | FOREIGN KEY |
| platform | VARCHAR(50) | 平台名称 | NOT NULL |
| platform_user_id | VARCHAR(100) | 平台用户ID | NOT NULL |
| access_token | TEXT | 访问令牌 | |
| refresh_token | TEXT | 刷新令牌 | |
| token_expires_at | TIMESTAMP | 令牌过期时间 | |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**用户设置表 (user_settings)**

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 设置ID | PRIMARY KEY |
| user_id | BIGINT | 用户ID | FOREIGN KEY, UNIQUE |
| risk_level | TINYINT | 风险承受等级 | DEFAULT 5 |
| notifications_enabled | BOOLEAN | 是否启用通知 | DEFAULT TRUE |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

#### 基金相关表

**基金基础信息表 (funds)**

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 基金ID | PRIMARY KEY |
| fund_code | VARCHAR(10) | 基金代码 | UNIQUE, NOT NULL |
| fund_name | VARCHAR(100) | 基金名称 | NOT NULL |
| fund_type | VARCHAR(20) | 基金类型 | NOT NULL |
| fund_company | VARCHAR(100) | 基金公司 | |
| established_date | DATE | 成立日期 | |
| fund_size | DECIMAL(15,2) | 基金规模(元) | |
| manager_id | BIGINT | 基金经理ID | FOREIGN KEY |
| benchmark_index | VARCHAR(20) | 基准指数 | |
| status | VARCHAR(20) | 状态(正常/清盘) | DEFAULT '正常' |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**基金经理表 (fund_managers)**

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 经理ID | PRIMARY KEY |
| name | VARCHAR(50) | 姓名 | NOT NULL |
| gender | VARCHAR(10) | 性别 | |
| education | VARCHAR(50) | 学历 | |
| start_date | DATE | 从业开始日期 | |
| current_company | VARCHAR(100) | 当前公司 | |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**基金净值表 (fund_nav_history)**

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 记录ID | PRIMARY KEY |
| fund_id | BIGINT | 基金ID | FOREIGN KEY |
| nav_date | DATE | 净值日期 | NOT NULL |
| unit_nav | DECIMAL(10,6) | 单位净值 | NOT NULL |
| accumulated_nav | DECIMAL(10,6) | 累计净值 | NOT NULL |
| daily_return | DECIMAL(8,4) | 日收益率(%) | |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

**基金持仓表 (fund_holdings)**

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 记录ID | PRIMARY KEY |
| fund_id | BIGINT | 基金ID | FOREIGN KEY |
| report_period | VARCHAR(20) | 报告期(如2024Q1) | NOT NULL |
| report_type | VARCHAR(20) | 报告类型(季报/半年报/年报) | NOT NULL |
| security_code | VARCHAR(20) | 证券代码 | NOT NULL |
| security_name | VARCHAR(100) | 证券名称 | NOT NULL |
| security_type | VARCHAR(20) | 证券类型(股票/债券) | NOT NULL |
| holding_ratio | DECIMAL(8,4) | 持仓比例(%) | NOT NULL |
| holding_value | DECIMAL(15,2) | 持仓市值(元) | |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

#### 估值相关表

**指数信息表 (indices)**

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 指数ID | PRIMARY KEY |
| index_code | VARCHAR(20) | 指数代码 | UNIQUE, NOT NULL |
| index_name | VARCHAR(100) | 指数名称 | NOT NULL |
| index_type | VARCHAR(20) | 指数类型(宽基/行业/主题) | NOT NULL |
| related_sectors | VARCHAR(200) | 相关行业 | |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**指数估值表 (index_valuations)**

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 记录ID | PRIMARY KEY |
| index_id | BIGINT | 指数ID | FOREIGN KEY |
| valuation_date | DATE | 估值日期 | NOT NULL |
| pe_ratio | DECIMAL(10,2) | 市盈率(PE) | |
| pb_ratio | DECIMAL(10,2) | 市净率(PB) | |
| ps_ratio | DECIMAL(10,2) | 市销率(PS) | |
| dividend_yield | DECIMAL(8,4) | 股息率(%) | |
| pe_percentile_5y | DECIMAL(5,2) | PE 5年分位点(%) | |
| pb_percentile_5y | DECIMAL(5,2) | PB 5年分位点(%) | |
| ps_percentile_5y | DECIMAL(5,2) | PS 5年分位点(%) | |
| valuation_status | VARCHAR(10) | 估值状态(低估/正常/高估) | |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

**指数基金关联表 (index_funds)**

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 关联ID | PRIMARY KEY |
| index_id | BIGINT | 指数ID | FOREIGN KEY |
| fund_id | BIGINT | 基金ID | FOREIGN KEY |
| fund_type | VARCHAR(20) | 基金类型(ETF/联接基金) | NOT NULL |
| correlation | DECIMAL(5,4) | 相关性 | |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

#### 组合相关表

**用户持仓表 (user_holdings)**

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 持仓ID | PRIMARY KEY |
| user_id | BIGINT | 用户ID | FOREIGN KEY |
| fund_id | BIGINT | 基金ID | FOREIGN KEY |
| holding_shares | DECIMAL(12,4) | 持有份额 | NOT NULL |
| cost_price | DECIMAL(10,4) | 成本价(元) | NOT NULL |
| cost_amount | DECIMAL(15,2) | 成本金额(元) | |
| source | VARCHAR(50) | 来源(手动/同步) | DEFAULT '手动' |
| sync_platform | VARCHAR(50) | 同步平台 | |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**模拟组合表 (simulated_portfolios)**

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 模拟组合ID | PRIMARY KEY |
| user_id | BIGINT | 用户ID | FOREIGN KEY |
| portfolio_name | VARCHAR(100) | 组合名称 | NOT NULL |
| initial_capital | DECIMAL(15,2) | 初始资金(元) | NOT NULL |
| start_date | DATE | 建仓日期 | NOT NULL |
| current_value | DECIMAL(15,2) | 当前市值 | |
| total_return | DECIMAL(8,4) | 累计收益率(%) | |
| description | TEXT | 组合描述 | |
| is_public | BOOLEAN | 是否公开 | DEFAULT FALSE |
| follow_source_id | BIGINT | 跟投来源组合ID | FOREIGN KEY |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**模拟组合配置表 (simulated_portfolio_allocations)**

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 配置ID | PRIMARY KEY |
| portfolio_id | BIGINT | 模拟组合ID | FOREIGN KEY |
| fund_id | BIGINT | 基金ID | FOREIGN KEY |
| allocation_ratio | DECIMAL(8,4) | 配置比例(%) | NOT NULL |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**止盈止损设置表 (stop_loss_profit_settings)**

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 设置ID | PRIMARY KEY |
| user_id | BIGINT | 用户ID | FOREIGN KEY |
| fund_id | BIGINT | 基金ID | FOREIGN KEY |
| stop_profit_type | VARCHAR(20) | 止盈类型(收益率/目标净值) | |
| stop_profit_value | DECIMAL(10,2) | 止盈值 | |
| stop_loss_type | VARCHAR(20) | 止损类型(回撤率/目标净值) | |
| stop_loss_value | DECIMAL(10,2) | 止损值 | |
| status | VARCHAR(20) | 状态(激活/已触发/已关闭) | DEFAULT '激活' |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

#### 工具相关表

**回测任务表 (backtest_tasks)**

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 任务ID | PRIMARY KEY |
| user_id | BIGINT | 用户ID | FOREIGN KEY |
| task_type | VARCHAR(50) | 任务类型(估值定投/均线定投) | NOT NULL |
| task_config | JSON | 任务配置参数 | NOT NULL |
| status | VARCHAR(20) | 状态(进行中/已完成/失败) | DEFAULT '进行中' |
| result_summary | JSON | 结果摘要 | |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| completed_at | TIMESTAMP | 完成时间 | |

**资讯表 (news)**

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 资讯ID | PRIMARY KEY |
| title | VARCHAR(200) | 标题 | NOT NULL |
| content | TEXT | 内容 | |
| news_type | VARCHAR(50) | 资讯类型(市场解读/基金公告/研报摘要) | NOT NULL |
| source | VARCHAR(100) | 来源 | NOT NULL |
| publish_date | DATE | 发布日期 | NOT NULL |
| url | VARCHAR(500) | 原文链接 | |
| related_funds | VARCHAR(500) | 相关基金 | |
| related_indices | VARCHAR(500) | 相关指数 | |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

#### 系统相关表

**主题标签表 (theme_tags)**

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 标签ID | PRIMARY KEY |
| tag_name | VARCHAR(50) | 标签名称 | UNIQUE, NOT NULL |
| description | TEXT | 描述 | |
| is_hot | BOOLEAN | 是否热门 | DEFAULT FALSE |
| display_order | INT | 显示顺序 | |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**主题基金关联表 (theme_fund_relations)**

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT | 关联ID | PRIMARY KEY |
| theme_id | BIGINT | 主题ID | FOREIGN KEY |
| fund_id | BIGINT | 基金ID | FOREIGN KEY |
| correlation_score | DECIMAL(5,2) | 相关性评分 | |
| created_at | TIMESTAMP | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

### Redis 缓存设计

**缓存键命名规范**:

- `fund:detail:{fund_id}` - 基金详情缓存,有效期 1小时
- `fund:nav:{fund_id}:{date}` - 基金净值缓存,有效期 1天
- `valuation:dashboard` - 估值仪表盘数据,有效期 1天
- `valuation:ranking` - 估值榜单数据,有效期 1天
- `valuation:percentile:{index_code}` - 指数分位点,有效期 1天
- `portfolio:summary:{user_id}` - 用户持仓摘要,有效期 5分钟
- `analysis:performance:{fund_id}` - 基金业绩分析,有效期 6小时
- `analysis:risk:{fund_id}` - 基金风险分析,有效期 6小时
- `user:profile:{user_id}` - 用户信息,有效期 30分钟

### 时序数据库设计(净值数据)

**时序序列**:
- `fund_nav_{fund_code}` - 每个基金的净值时间序列

**Tags**:
- `fund_code` - 基金代码
- `fund_type` - 基金类型

**Fields**:
- `unit_nav` - 单位净值
- `accumulated_nav` - 累计净值
- `daily_return` - 日收益率

## 正确性属性

### 数据一致性

1. **基金净值数据一致性**: 同一基金同一天的净值数据必须唯一,不得出现多条记录
2. **持仓数据一致性**: 同一基金同一报告期的持仓数据必须唯一
3. **估值数据一致性**: 同一指数同一天的估值数据必须唯一
4. **用户持仓一致性**: 同一用户同一基金的持仓记录必须唯一

### 计算准确性

1. **分位点计算准确性**: 分位点计算必须基于完整的历史数据区间,不得遗漏数据点
2. **收益率计算准确性**: 所有收益率计算必须基于复权后的净值数据
3. **风险指标计算准确性**: 波动率、最大回撤等风险指标必须采用标准计算公式
4. **组合指标计算准确性**: 组合收益率必须基于各基金持仓权重加权计算

### 业务逻辑约束

1. **估值状态判定**:
   - 分位点 < 30%: 低估
   - 30% ≤ 分位点 ≤ 70%: 正常
   - 分位点 > 70%: 高估

2. **会员服务权限**:
   - 非会员用户无法访问高级指标
   - 非会员用户无法使用深度回测功能
   - 非会员用户无法查看专业研报

3. **止盈止损触发**:
   - 止盈: 当前收益率 ≥ 止盈收益率 OR 当前净值 ≥ 目标净值
   - 止损: 当前回撤率 ≥ 止损回撤率 OR 当前净值 ≤ 目标净值

## 错误处理

### 错误分类

1. **网络错误**
   - API请求超时
   - 网络连接失败
   - 服务端错误(5xx)

2. **数据错误**
   - 数据源返回异常
   - 数据格式错误
   - 数据缺失

3. **业务逻辑错误**
   - 用户未登录
   - 权限不足
   - 参数错误

4. **系统错误**
   - 数据库连接失败
   - Redis连接失败
   - 计算服务异常

### 错误处理策略

**前端错误处理**:

```typescript
// API 请求统一错误处理
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // 服务端返回错误
      switch (error.response.status) {
        case 401:
          // 未授权,跳转到登录页
          router.push('/login')
          break
        case 403:
          // 权限不足
          showToast('权限不足')
          break
        case 404:
          // 资源不存在
          showToast('请求的资源不存在')
          break
        case 500:
          // 服务端错误
          showToast('服务器错误,请稍后重试')
          break
        default:
          showToast('请求失败')
      }
    } else if (error.request) {
      // 请求已发送但无响应
      showToast('网络错误,请检查网络连接')
    } else {
      // 请求配置错误
      showToast('请求配置错误')
    }
    return Promise.reject(error)
  }
)
```

**后端错误处理**:

```typescript
// 统一错误处理中间件
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Error occurred:', err)

  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details
    })
  }

  if (err instanceof AuthenticationError) {
    return res.status(401).json({
      error: 'Authentication Error',
      message: err.message
    })
  }

  if (err instanceof AuthorizationError) {
    return res.status(403).json({
      error: 'Authorization Error',
      message: err.message
    })
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      error: 'Not Found',
      message: err.message
    })
  }

  // 默认500错误
  res.status(500).json({
    error: 'Internal Server Error',
    message: '服务器内部错误'
  })
})
```

**数据采集错误处理**:

```typescript
// 数据采集错误处理
async function collectFundData() {
  try {
    const data = await externalAPI.fetchFundData()
    await validateAndSaveData(data)
  } catch (error) {
    logger.error('Failed to collect fund data:', error)
    // 记录失败日志,不中断整个采集流程
    errorTracker.trackError('data_collection_failed', {
      source: 'fund_data',
      error: error.message
    })
  }
}
```

### 重试机制

对于可能暂时失败的操作,实现指数退避重试:

```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === maxRetries - 1) throw error
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Max retries exceeded')
}
```

## 测试策略

### 单元测试

**测试框架**: Jest

**覆盖范围**:
- 前端组件测试(Vue Test Utils)
- 前端工具函数测试
- 后端服务单元测试
- 数据模型验证测试
- 算法计算测试(收益率、风险指标、分位点等)

**示例**:

```typescript
// 测试收益率计算
describe('calculateReturnRate', () => {
  it('should calculate correct annual return rate', () => {
    const startNav = 1.0
    const endNav = 1.2
    const days = 365
    const returnRate = calculateReturnRate(startNav, endNav, days)
    expect(returnRate).toBeCloseTo(0.2, 2)
  })
})

// 测试分位点计算
describe('calculatePercentile', () => {
  it('should calculate correct percentile for given value', () => {
    const history = [10, 20, 30, 40, 50]
    const current = 35
    const percentile = calculatePercentile(history, current)
    expect(percentile).toBeCloseTo(70, 2)
  })
})
```

### 集成测试

**测试框架**: Supertest(后端), Playwright(前端E2E)

**覆盖范围**:
- API接口集成测试
- 数据库操作集成测试
- 前后端交互测试
- 第三方服务集成测试(支付、登录等)

**示例**:

```typescript
// API 集成测试
describe('POST /api/auth/login', () => {
  it('should login successfully with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        phone: '13800138000',
        password: 'password123'
      })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('token')
    expect(response.body).toHaveProperty('user')
  })
})
```

### 端到端测试

**测试框架**: Playwright

**覆盖范围**:
- 用户注册/登录流程
- 基金筛选流程
- 基金详情查看流程
- 估值查看流程
- 组合管理流程
- 回测功能流程

**示例**:

```typescript
// E2E 测试示例
test('user can filter funds and view details', async ({ page }) => {
  await page.goto('/')
  await page.click('text=基金筛选')

  // 设置筛选条件
  await page.selectOption('select[name="type"]', '股票型')
  await page.fill('input[name="minReturn"]', '10')
  await page.click('button[type="submit"]')

  // 验证筛选结果
  await expect(page.locator('.fund-list')).toBeVisible()
  await page.click('.fund-card:first-child')

  // 验证详情页
  await expect(page.locator('.fund-detail')).toBeVisible()
  await expect(page.locator('.fund-name')).toContainText('基金名称')
})
```

### 性能测试

**测试工具**: k6, Apache Bench

**测试场景**:
- 并发用户访问
- 大量数据查询
- 复杂计算(回测、风险诊断)
- 缓存命中率测试

**性能指标**:
- API响应时间 < 200ms (P95)
- 页面加载时间 < 3s
- 并发支持 > 1000 QPS
- 缓存命中率 > 80%

### 数据质量测试

**测试内容**:
- 数据完整性检查
- 数据准确性验证
- 异常数据检测
- 数据一致性验证

**示例**:

```typescript
// 数据质量测试
describe('Data Quality Tests', () => {
  it('should have no duplicate fund codes', async () => {
    const duplicates = await db.query(`
      SELECT fund_code, COUNT(*) as count
      FROM funds
      GROUP BY fund_code
      HAVING COUNT(*) > 1
    `)
    expect(duplicates.rows).toHaveLength(0)
  })

  it('should have valid NAV values', async () => {
    const invalidNavs = await db.query(`
      SELECT * FROM fund_nav_history
      WHERE unit_nav <= 0 OR unit_nav IS NULL
    `)
    expect(invalidNavs.rows).toHaveLength(0)
  })
})
```

## 部署架构

### 容器化部署

**Docker Compose 配置**:

```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/pigfund
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=pigfund
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7
    volumes:
      - redis-data:/data

  influxdb:
    image: influxdb:2
    ports:
      - "8086:8086"
    volumes:
      - influxdb-data:/var/lib/influxdb

volumes:
  postgres-data:
  redis-data:
  influxdb-data:
```

### CI/CD 流程

**GitHub Actions 配置**:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run lint
      - run: npm run typecheck

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker images
        run: docker-compose build

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          docker-compose -f docker-compose.prod.yml up -d
```

## 参考资源

[^1]: Vue 3 官方文档 - https://vuejs.org/
[^2]: Vant 4 组件库 - https://vant-ui.github.io/vant/
[^3]: ECharts 图表库 - https://echarts.apache.org/
[^4]: PostgreSQL 数据库 - https://www.postgresql.org/
[^5]: Redis 缓存 - https://redis.io/
[^6]: TypeScript 官方文档 - https://www.typescriptlang.org/
[^7]: Express.js 框架 - https://expressjs.com/
[^8]: Docker 官方文档 - https://docs.docker.com/
