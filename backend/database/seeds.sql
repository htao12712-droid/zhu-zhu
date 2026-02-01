-- 插入种子数据
-- 创建时间: 2026-01-31

-- 插入更多主题标签
INSERT INTO theme_tags (tag_name, description, is_hot, display_order) VALUES
('半导体', '半导体芯片产业链', TRUE, 6),
('军工', '国防军工装备', FALSE, 7),
('大金融', '银行、保险、证券', FALSE, 8),
('新材料', '先进材料研发', FALSE, 9),
('人工智能', 'AI人工智能技术', TRUE, 10)
ON CONFLICT (tag_name) DO NOTHING;

-- 插入行业指数
INSERT INTO indices (index_code, index_name, index_type, related_sectors) VALUES
('000001', '上证指数', '宽基', NULL),
('399001', '深证成指', '宽基', NULL),
('000688', '科创50', '主题', '半导体,人工智能,军工'),
('399006', '创业板指', '宽基', '新能源,医药健康'),
('000852', '中证1000', '宽基', NULL),
('399932', '中证消费', '行业', '消费升级'),
('000827', '中证环保', '行业', '碳中和'),
('399971', '中证传媒', '行业', NULL),
('000932', '中证医药', '行业', '医药健康'),
('399975', '证券公司', '行业', '大金融'),
('399933', '中证红利', '策略', NULL)
ON CONFLICT (index_code) DO NOTHING;

-- 插入基金经理
INSERT INTO fund_managers (name, gender, education, start_date, current_company) VALUES
('张三', '男', '硕士', '2010-05-01', '易方达基金'),
('李四', '女', '博士', '2012-03-15', '华夏基金'),
('王五', '男', '硕士', '2015-08-20', '南方基金'),
('赵六', '女', '硕士', '2014-11-10', '嘉实基金'),
('孙七', '男', '博士', '2011-06-01', '汇添富基金')
ON CONFLICT DO NOTHING;

-- 插入示例基金
INSERT INTO funds (fund_code, fund_name, fund_type, fund_company, established_date, fund_size, manager_id, benchmark_index, status) VALUES
-- 指数基金
('110020', '易方达沪深300ETF联接', '指数型', '易方达基金', '2009-07-21', 5200000000, 1, '000300', '正常'),
('000001', '华夏成长混合', '混合型', '华夏基金', '2001-11-28', 3800000000, 2, '000300', '正常'),
('202001', '南方稳健成长混合', '混合型', '南方基金', '2001-09-28', 4200000000, 3, '000300', '正常'),
('070001', '嘉实成长收益混合', '混合型', '嘉实基金', '2002-11-05', 3500000000, 4, '000300', '正常'),
('519068', '汇添富成长焦点混合', '混合型', '汇添富基金', '2007-03-12', 2800000000, 5, '000300', '正常'),
-- 科技主题基金
('001986', '易方达国防军工混合', '混合型', '易方达基金', '2015-06-19', 1500000000, 1, '000688', '正常'),
('005827', '易方达科技创新混合', '混合型', '易方达基金', '2018-09-17', 2200000000, 1, '000688', '正常'),
('005918', '天弘中证电子ETF联接', '指数型', '天弘基金', '2019-04-03', 1800000000, NULL, '000852', '正常'),
-- 医药基金
('000746', '招商行业领先混合', '混合型', '招商基金', '2015-06-29', 2100000000, 4, '000932', '正常'),
('006228', '工银瑞信医药健康股票', '股票型', '工银瑞信基金', '2018-12-25', 1200000000, NULL, '000932', '正常'),
-- 消费基金
('000083', '汇添富消费行业混合', '混合型', '汇添富基金', '2013-05-09', 2600000000, 5, '399932', '正常'),
('519706', '交银定期支付双息平衡混合', '混合型', '交银施罗德基金', '2013-09-04', 1900000000, NULL, '399932', '正常'),
-- 新能源基金
('003834', '华夏能源革新股票', '股票型', '华夏基金', '2017-06-07', 2300000000, 2, '399006', '正常'),
('005670', '嘉实新能源股票', '股票型', '嘉实基金', '2019-03-28', 1700000000, 4, '399006', '正常')
ON CONFLICT (fund_code) DO NOTHING;

-- 插入基金净值历史数据(示例数据)
INSERT INTO fund_nav_history (fund_id, nav_date, unit_nav, accumulated_nav, daily_return)
SELECT 
    f.id,
    (CURRENT_DATE - s.i)::date as nav_date,
    1.0000 + (s.i * 0.0005 + random() * 0.002 - 0.001)::numeric(10,6) as unit_nav,
    1.5000 + (s.i * 0.0008 + random() * 0.003 - 0.0015)::numeric(10,6) as accumulated_nav,
    (random() * 0.04 - 0.02)::numeric(8,4) as daily_return
FROM funds f
CROSS JOIN generate_series(0, 364) AS s(i)
ON CONFLICT (fund_id, nav_date) DO NOTHING;

-- 插入指数估值数据(示例数据)
INSERT INTO index_valuations (index_id, valuation_date, pe_ratio, pb_ratio, ps_ratio, dividend_yield, pe_percentile_5y, pb_percentile_5y, ps_percentile_5y, valuation_status)
SELECT 
    i.id,
    (CURRENT_DATE - s.i)::date as valuation_date,
    (10 + random() * 30)::numeric(10,2) as pe_ratio,
    (1.2 + random() * 2)::numeric(10,2) as pb_ratio,
    (2 + random() * 4)::numeric(10,2) as ps_ratio,
    (1 + random() * 3)::numeric(8,4) as dividend_yield,
    (30 + random() * 40)::numeric(5,2) as pe_percentile_5y,
    (25 + random() * 45)::numeric(5,2) as pb_percentile_5y,
    (35 + random() * 30)::numeric(5,2) as ps_percentile_5y,
    CASE 
        WHEN random() < 0.3 THEN '低估'
        WHEN random() > 0.7 THEN '高估'
        ELSE '正常'
    END as valuation_status
FROM indices i
CROSS JOIN generate_series(0, 364) AS s(i)
ON CONFLICT (index_id, valuation_date) DO NOTHING;

-- 插入主题基金关联
INSERT INTO theme_fund_relations (theme_id, fund_id, correlation_score)
SELECT 
    t.id as theme_id,
    f.id as fund_id,
    (0.7 + random() * 0.3)::numeric(5,2) as correlation_score
FROM theme_tags t
CROSS JOIN funds f
WHERE t.is_hot = TRUE
AND f.fund_type IN ('股票型', '混合型')
LIMIT 50
ON CONFLICT (theme_id, fund_id) DO NOTHING;

-- 插入指数基金关联
INSERT INTO index_funds (index_id, fund_id, fund_type, correlation)
SELECT 
    i.id as index_id,
    f.id as fund_id,
    'ETF' as fund_type,
    (0.95 + random() * 0.05)::numeric(5,4) as correlation
FROM indices i
JOIN funds f ON SUBSTRING(f.fund_code, 1, 2) IN ('51', '56')  -- 假设这些代码开头的基金是ETF
LIMIT 10
ON CONFLICT (index_id, fund_id, fund_type) DO NOTHING;

-- 插入模拟持仓示例数据
INSERT INTO user_holdings (user_id, fund_id, holding_shares, cost_price, cost_amount, source)
VALUES
(1, 1, 5000, 1.2345, 6172.5, '手动'),
(1, 2, 3000, 2.5678, 7703.4, '手动'),
(1, 7, 2000, 1.8900, 3780.0, '手动'),
(2, 3, 10000, 1.1000, 11000.0, '手动')
ON CONFLICT (user_id, fund_id) DO NOTHING;

-- 插入资讯示例数据
INSERT INTO news (title, content, news_type, source, publish_date, url, related_funds, related_indices) VALUES
('2025年基金市场展望: 结构性行情延续', '随着经济复苏和政策支持,2025年基金市场预计将呈现结构性行情...', '市场解读', 'XX证券', '2025-01-15', 'https://example.com/news/001', '110020,000001', '000300,399006'),
('科技主题基金表现亮眼', '受益于科技创新政策,科技主题基金近期表现突出...', '基金公告', '易方达基金', '2025-01-20', 'https://example.com/news/002', '005827', '000688'),
('新能源产业迎发展机遇', '碳中和目标下,新能源产业迎来新一轮发展机遇...', '研报摘要', '中金公司', '2025-01-22', 'https://example.com/news/003', '003834,005670', '399006'),
('医药健康板块估值修复', '经过前期调整,医药健康板块估值已进入合理区间...', '市场解读', 'XX基金', '2025-01-25', 'https://example.com/news/004', '000746,006228', '000932'),
('消费升级主题投资机会', '居民消费升级趋势明确,相关主题基金值得关注...', '基金公告', '汇添富基金', '2025-01-28', 'https://example.com/news/005', '000083', '399932')
ON CONFLICT DO NOTHING;

-- 插入止盈止损设置示例数据
INSERT INTO stop_loss_profit_settings (user_id, fund_id, stop_profit_type, stop_profit_value, stop_loss_type, stop_loss_value, status)
VALUES
(1, 1, '收益率', 30, '回撤率', -15, '激活'),
(1, 2, '收益率', 25, NULL, NULL, '激活'),
(1, 7, NULL, NULL, '回撤率', -20, '激活')
ON CONFLICT (user_id, fund_id) DO NOTHING;

-- 创建示例回测任务
INSERT INTO backtest_tasks (user_id, task_type, task_config, status, result_summary)
VALUES
(1, '估值定投', '{"indexCode": "000300", "initialAmount": 1000, "frequency": "月", "duration": 36, "lowPercentile": 30, "highPercentile": 70, "lowMultiple": 1.5, "highMultiple": 0.5}', '已完成', '{"totalReturn": 25.5, "annualizedReturn": 8.5, "maxDrawdown": -12.3, "sharpeRatio": 0.92}'),
(1, '均线定投', '{"indexCode": "000300", "initialAmount": 1000, "frequency": "周", "duration": 24, "maPeriod": 20, "upMultiple": 1.2, "downMultiple": 0.8}', '已完成', '{"totalReturn": 18.2, "annualizedReturn": 7.8, "maxDrawdown": -10.5, "sharpeRatio": 0.85}'),
(2, '估值定投', '{"indexCode": "399006", "initialAmount": 500, "frequency": "月", "duration": 12, "lowPercentile": 25, "highPercentile": 75, "lowMultiple": 2, "highMultiple": 0.3}', '进行中', NULL)
ON CONFLICT DO NOTHING;

-- 插入模拟组合示例数据
INSERT INTO simulated_portfolios (user_id, portfolio_name, initial_capital, start_date, current_value, total_return, description, is_public)
VALUES
(1, '科技成长组合', 100000, '2024-01-01', 125000, 25.0, '聚焦科技创新和高端制造', TRUE),
(1, '稳健配置组合', 200000, '2023-06-01', 215000, 7.5, '股债均衡配置', FALSE),
(2, '学习组合', 50000, '2024-06-01', 52000, 4.0, '新手上路组合', TRUE)
ON CONFLICT DO NOTHING;

-- 插入模拟组合配置
INSERT INTO simulated_portfolio_allocations (portfolio_id, fund_id, allocation_ratio)
VALUES
(1, 1, 40),
(1, 7, 30),
(1, 13, 30),
(2, 2, 30),
(2, 3, 20),
(2, 10, 30),
(2, 11, 20),
(3, 1, 25),
(3, 2, 25),
(3, 3, 25),
(3, 5, 25)
ON CONFLICT (portfolio_id, fund_id) DO NOTHING;

-- 更新统计数据
ANALYZE;

-- 提示
SELECT '种子数据插入完成!' as message;
