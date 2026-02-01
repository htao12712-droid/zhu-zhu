#!/bin/bash

# 数据库初始化脚本
# 使用方法: ./scripts/init-db.sh

echo "开始初始化数据库..."

# 等待PostgreSQL启动
echo "等待PostgreSQL启动..."
while ! pg_isready -h postgres -p 5432 -U postgres > /dev/null 2>&1; do
  sleep 1
done
echo "PostgreSQL已就绪"

# 执行schema创建
echo "创建数据库表结构..."
psql -h postgres -U postgres -d pigfund -f /app/database/schema.sql

if [ $? -eq 0 ]; then
  echo "表结构创建成功"
else
  echo "表结构创建失败"
  exit 1
fi

# 执行种子数据
echo "插入种子数据..."
psql -h postgres -U postgres -d pigfund -f /app/database/seeds.sql

if [ $? -eq 0 ]; then
  echo "种子数据插入成功"
else
  echo "种子数据插入失败"
  exit 1
fi

echo "数据库初始化完成!"
