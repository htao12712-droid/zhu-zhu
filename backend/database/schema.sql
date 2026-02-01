-- 猪猪养基数据库初始化脚本
-- 创建时间: 2026-01-31

-- 创建用户相关表
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    avatar_url VARCHAR(255),
    member_level SMALLINT DEFAULT 0,
    member_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_member_level ON users(member_level);

CREATE TABLE IF NOT EXISTS user_third_party_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    platform_user_id VARCHAR(100) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_third_party_platform ON user_third_party_accounts(platform);

CREATE TABLE IF NOT EXISTS user_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    risk_level SMALLINT DEFAULT 5,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建基金相关表
CREATE TABLE IF NOT EXISTS fund_managers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    gender VARCHAR(10),
    education VARCHAR(50),
    start_date DATE,
    current_company VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_managers_name ON fund_managers(name);

CREATE TABLE IF NOT EXISTS funds (
    id BIGSERIAL PRIMARY KEY,
    fund_code VARCHAR(10) UNIQUE NOT NULL,
    fund_name VARCHAR(100) NOT NULL,
    fund_type VARCHAR(20) NOT NULL,
    fund_company VARCHAR(100),
    established_date DATE,
    fund_size DECIMAL(15,2),
    manager_id BIGINT REFERENCES fund_managers(id),
    benchmark_index VARCHAR(20),
    status VARCHAR(20) DEFAULT '正常',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_funds_code ON funds(fund_code);
CREATE INDEX IF NOT EXISTS idx_funds_type ON funds(fund_type);
CREATE INDEX IF NOT EXISTS idx_funds_manager ON funds(manager_id);
CREATE INDEX IF NOT EXISTS idx_funds_status ON funds(status);

CREATE TABLE IF NOT EXISTS fund_nav_history (
    id BIGSERIAL PRIMARY KEY,
    fund_id BIGINT NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
    nav_date DATE NOT NULL,
    unit_nav DECIMAL(10,6) NOT NULL,
    accumulated_nav DECIMAL(10,6) NOT NULL,
    daily_return DECIMAL(8,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fund_id, nav_date)
);

CREATE INDEX IF NOT EXISTS idx_nav_fund_id ON fund_nav_history(fund_id);
CREATE INDEX IF NOT EXISTS idx_nav_date ON fund_nav_history(nav_date);
CREATE INDEX IF NOT EXISTS idx_nav_fund_date ON fund_nav_history(fund_id, nav_date);

CREATE TABLE IF NOT EXISTS fund_holdings (
    id BIGSERIAL PRIMARY KEY,
    fund_id BIGINT NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
    report_period VARCHAR(20) NOT NULL,
    report_type VARCHAR(20) NOT NULL,
    security_code VARCHAR(20) NOT NULL,
    security_name VARCHAR(100) NOT NULL,
    security_type VARCHAR(20) NOT NULL,
    holding_ratio DECIMAL(8,4) NOT NULL,
    holding_value DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_holdings_fund_id ON fund_holdings(fund_id);
CREATE INDEX IF NOT EXISTS idx_holdings_report_period ON fund_holdings(report_period);
CREATE INDEX IF NOT EXISTS idx_holdings_security ON fund_holdings(security_code, security_type);

-- 创建估值相关表
CREATE TABLE IF NOT EXISTS indices (
    id BIGSERIAL PRIMARY KEY,
    index_code VARCHAR(20) UNIQUE NOT NULL,
    index_name VARCHAR(100) NOT NULL,
    index_type VARCHAR(20) NOT NULL,
    related_sectors VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_indices_code ON indices(index_code);
CREATE INDEX IF NOT EXISTS idx_indices_type ON indices(index_type);

CREATE TABLE IF NOT EXISTS index_valuations (
    id BIGSERIAL PRIMARY KEY,
    index_id BIGINT NOT NULL REFERENCES indices(id) ON DELETE CASCADE,
    valuation_date DATE NOT NULL,
    pe_ratio DECIMAL(10,2),
    pb_ratio DECIMAL(10,2),
    ps_ratio DECIMAL(10,2),
    dividend_yield DECIMAL(8,4),
    pe_percentile_5y DECIMAL(5,2),
    pb_percentile_5y DECIMAL(5,2),
    ps_percentile_5y DECIMAL(5,2),
    valuation_status VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(index_id, valuation_date)
);

CREATE INDEX IF NOT EXISTS idx_valuation_index_id ON index_valuations(index_id);
CREATE INDEX IF NOT EXISTS idx_valuation_date ON index_valuations(valuation_date);
CREATE INDEX IF NOT EXISTS idx_valuation_index_date ON index_valuations(index_id, valuation_date);
CREATE INDEX IF NOT EXISTS idx_valuation_status ON index_valuations(valuation_status);

CREATE TABLE IF NOT EXISTS index_funds (
    id BIGSERIAL PRIMARY KEY,
    index_id BIGINT NOT NULL REFERENCES indices(id) ON DELETE CASCADE,
    fund_id BIGINT NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
    fund_type VARCHAR(20) NOT NULL,
    correlation DECIMAL(5,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(index_id, fund_id, fund_type)
);

CREATE INDEX IF NOT EXISTS idx_index_funds_index_id ON index_funds(index_id);
CREATE INDEX IF NOT EXISTS idx_index_funds_fund_id ON index_funds(fund_id);

-- 创建组合相关表
CREATE TABLE IF NOT EXISTS user_holdings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fund_id BIGINT NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
    holding_shares DECIMAL(12,4) NOT NULL,
    cost_price DECIMAL(10,4) NOT NULL,
    cost_amount DECIMAL(15,2),
    source VARCHAR(50) DEFAULT '手动',
    sync_platform VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, fund_id)
);

CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON user_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_fund_id ON user_holdings(fund_id);

CREATE TABLE IF NOT EXISTS simulated_portfolios (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_name VARCHAR(100) NOT NULL,
    initial_capital DECIMAL(15,2) NOT NULL,
    start_date DATE NOT NULL,
    current_value DECIMAL(15,2),
    total_return DECIMAL(8,4),
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    follow_source_id BIGINT REFERENCES simulated_portfolios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sim_portfolios_user_id ON simulated_portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_sim_portfolios_is_public ON simulated_portfolios(is_public);

CREATE TABLE IF NOT EXISTS simulated_portfolio_allocations (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL REFERENCES simulated_portfolios(id) ON DELETE CASCADE,
    fund_id BIGINT NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
    allocation_ratio DECIMAL(8,4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(portfolio_id, fund_id)
);

CREATE INDEX IF NOT EXISTS idx_allocations_portfolio_id ON simulated_portfolio_allocations(portfolio_id);

CREATE TABLE IF NOT EXISTS stop_loss_profit_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fund_id BIGINT NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
    stop_profit_type VARCHAR(20),
    stop_profit_value DECIMAL(10,2),
    stop_loss_type VARCHAR(20),
    stop_loss_value DECIMAL(10,2),
    status VARCHAR(20) DEFAULT '激活',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, fund_id)
);

CREATE INDEX IF NOT EXISTS idx_stop_loss_user_id ON stop_loss_profit_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_stop_loss_fund_id ON stop_loss_profit_settings(fund_id);
CREATE INDEX IF NOT EXISTS idx_stop_loss_status ON stop_loss_profit_settings(status);

-- 创建工具相关表
CREATE TABLE IF NOT EXISTS backtest_tasks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL,
    task_config JSONB NOT NULL,
    status VARCHAR(20) DEFAULT '进行中',
    result_summary JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backtest_user_id ON backtest_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_status ON backtest_tasks(status);

CREATE TABLE IF NOT EXISTS news (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    news_type VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    publish_date DATE NOT NULL,
    url VARCHAR(500),
    related_funds VARCHAR(500),
    related_indices VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_news_type ON news(news_type);
CREATE INDEX IF NOT EXISTS idx_news_publish_date ON news(publish_date);

-- 创建系统相关表
CREATE TABLE IF NOT EXISTS theme_tags (
    id BIGSERIAL PRIMARY KEY,
    tag_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_hot BOOLEAN DEFAULT FALSE,
    display_order INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_theme_tags_name ON theme_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_theme_tags_is_hot ON theme_tags(is_hot);

CREATE TABLE IF NOT EXISTS theme_fund_relations (
    id BIGSERIAL PRIMARY KEY,
    theme_id BIGINT NOT NULL REFERENCES theme_tags(id) ON DELETE CASCADE,
    fund_id BIGINT NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
    correlation_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(theme_id, fund_id)
);

CREATE INDEX IF NOT EXISTS idx_theme_fund_theme_id ON theme_fund_relations(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_fund_fund_id ON theme_fund_relations(fund_id);

-- 创建函数: 自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有包含 updated_at 字段的表创建触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fund_managers_updated_at BEFORE UPDATE ON fund_managers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_funds_updated_at BEFORE UPDATE ON funds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_indices_updated_at BEFORE UPDATE ON indices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_holdings_updated_at BEFORE UPDATE ON user_holdings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_simulated_portfolios_updated_at BEFORE UPDATE ON simulated_portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_simulated_portfolio_allocations_updated_at BEFORE UPDATE ON simulated_portfolio_allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stop_loss_profit_settings_updated_at BEFORE UPDATE ON stop_loss_profit_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_theme_tags_updated_at BEFORE UPDATE ON theme_tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建视图: 用户持仓汇总
CREATE OR REPLACE VIEW user_portfolio_summary AS
SELECT
    uh.user_id,
    f.fund_code,
    f.fund_name,
    uh.holding_shares,
    uh.cost_price,
    uh.cost_amount,
    fnh.unit_nav as current_nav,
    (uh.holding_shares * fnh.unit_nav) as current_value,
    ((uh.holding_shares * fnh.unit_nav - uh.cost_amount) / uh.cost_amount * 100) as return_rate
FROM user_holdings uh
JOIN funds f ON uh.fund_id = f.id
LEFT JOIN fund_nav_history fnh ON f.id = fnh.fund_id
    AND fnh.nav_date = (
        SELECT MAX(nav_date)
        FROM fund_nav_history
        WHERE fund_id = f.id
    );

-- 创建视图: 指数估值概览
CREATE OR REPLACE VIEW index_valuation_overview AS
SELECT
    i.index_code,
    i.index_name,
    i.index_type,
    iv.valuation_date,
    iv.pe_ratio,
    iv.pb_ratio,
    iv.pe_percentile_5y,
    iv.valuation_status,
    iv.pe_percentile_5y < 30 as is_undervalued,
    iv.pe_percentile_5y > 70 as is_overvalued
FROM indices i
LEFT JOIN LATERAL (
    SELECT *
    FROM index_valuations
    WHERE index_id = i.id
    ORDER BY valuation_date DESC
    LIMIT 1
) iv ON true;

-- 创建视图: 组合资产分布
CREATE OR REPLACE VIEW portfolio_asset_allocation AS
SELECT
    uh.user_id,
    f.fund_type,
    COUNT(DISTINCT uh.fund_id) as fund_count,
    SUM(uh.cost_amount) as total_cost,
    SUM(uh.holding_shares * fnh.unit_nav) as total_value,
    (SUM(uh.holding_shares * fnh.unit_nav) /
        (SELECT SUM(uh2.holding_shares * fnh2.unit_nav)
         FROM user_holdings uh2
         JOIN funds f2 ON uh2.fund_id = f2.id
         LEFT JOIN fund_nav_history fnh2 ON f2.id = fnh2.fund_id
             AND fnh2.nav_date = (SELECT MAX(nav_date) FROM fund_nav_history WHERE fund_id = f2.id)
         WHERE uh2.user_id = uh.user_id) * 100
    ) as allocation_ratio
FROM user_holdings uh
JOIN funds f ON uh.fund_id = f.id
LEFT JOIN fund_nav_history fnh ON f.id = fnh.fund_id
    AND fnh.nav_date = (
        SELECT MAX(nav_date)
        FROM fund_nav_history
        WHERE fund_id = f.id
    )
GROUP BY uh.user_id, f.fund_type;

-- 插入示例数据
INSERT INTO theme_tags (tag_name, description, is_hot, display_order) VALUES
('科创50', '聚焦科技创新和高端制造', TRUE, 1),
('碳中和', '绿色低碳发展主题', TRUE, 2),
('新能源', '新能源汽车和清洁能源', TRUE, 3),
('消费升级', '居民消费结构升级', FALSE, 4),
('医药健康', '医疗健康产业', FALSE, 5)
ON CONFLICT (tag_name) DO NOTHING;

INSERT INTO indices (index_code, index_name, index_type) VALUES
('000300', '沪深300', '宽基'),
('000016', '上证50', '宽基'),
('399006', '创业板指', '宽基'),
('000905', '中证500', '宽基'),
('000852', '中证1000', '宽基'),
('000688', '科创50', '主题')
ON CONFLICT (index_code) DO NOTHING;

-- 创建测试用户(密码: 123456, 使用bcrypt加密)
INSERT INTO users (phone, email, password_hash, nickname, member_level) VALUES
('13800138000', 'test@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '测试用户', 1),
('13800138001', NULL, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '演示用户', 0)
ON CONFLICT (phone) DO NOTHING;

COMMENT ON TABLE users IS '用户表';
COMMENT ON TABLE user_third_party_accounts IS '第三方账号绑定表';
COMMENT ON TABLE user_settings IS '用户设置表';
COMMENT ON TABLE fund_managers IS '基金经理表';
COMMENT ON TABLE funds IS '基金基础信息表';
COMMENT ON TABLE fund_nav_history IS '基金净值历史表';
COMMENT ON TABLE fund_holdings IS '基金持仓表';
COMMENT ON TABLE indices IS '指数信息表';
COMMENT ON TABLE index_valuations IS '指数估值表';
COMMENT ON TABLE index_funds IS '指数基金关联表';
COMMENT ON TABLE user_holdings IS '用户持仓表';
COMMENT ON TABLE simulated_portfolios IS '模拟组合表';
COMMENT ON TABLE simulated_portfolio_allocations IS '模拟组合配置表';
COMMENT ON TABLE stop_loss_profit_settings IS '止盈止损设置表';
COMMENT ON TABLE backtest_tasks IS '回测任务表';
COMMENT ON TABLE news IS '资讯表';
COMMENT ON TABLE theme_tags IS '主题标签表';
COMMENT ON TABLE theme_fund_relations IS '主题基金关联表';

COMMENT ON FUNCTION update_updated_at_column() IS '自动更新updated_at字段的触发器函数';
