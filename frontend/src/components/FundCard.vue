<template>
  <div class="fund-card" @click="goToDetail">
    <div class="fund-header">
      <div class="fund-info">
        <div class="fund-name">{{ fund.fund_name }}</div>
        <div class="fund-code">{{ fund.fund_code }}</div>
      </div>
      <div class="fund-tags">
        <span class="tag">{{ fund.fund_type }}</span>
      </div>
    </div>

    <div class="fund-metrics">
      <div class="metric">
        <div class="metric-label">基金规模</div>
        <div class="metric-value">{{ formatSize(fund.fund_size) }}</div>
      </div>
      <div class="metric" v-if="fund.established_date">
        <div class="metric-label">成立日期</div>
        <div class="metric-value">{{ formatDate(fund.established_date) }}</div>
      </div>
    </div>

    <div class="fund-actions">
      <van-button size="small" type="primary">申购</van-button>
      <van-button size="small" plain>关注</van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

interface Props {
  fund: {
    id: number
    fund_code: string
    fund_name: string
    fund_type: string
    fund_size?: number
    established_date?: string
  }
}

const props = defineProps<Props>()
const router = useRouter()

const formatSize = (size?: number) => {
  if (!size) return '--'
  return (size / 100000000).toFixed(2) + '亿'
}

const formatDate = (date?: string) => {
  if (!date) return '--'
  return date.substring(0, 10)
}

const goToDetail = () => {
  router.push(`/funds/${props.fund.id}`)
}
</script>

<style scoped>
.fund-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
}

.fund-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.fund-info {
  flex: 1;
}

.fund-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.fund-code {
  font-size: 14px;
  color: #999;
}

.fund-tags {
  display: flex;
  gap: 8px;
}

.tag {
  font-size: 12px;
  padding: 4px 8px;
  background: #e6f7ff;
  color: #1989fa;
  border-radius: 4px;
}

.fund-metrics {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.metric {
  flex: 1;
}

.metric-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
}

.fund-actions {
  display: flex;
  gap: 8px;
}
</style>
