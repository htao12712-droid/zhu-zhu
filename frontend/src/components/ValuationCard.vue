<template>
  <div class="valuation-card" @click="onClick">
    <div class="card-header">
      <div class="index-name">{{ index.index_name }}</div>
      <div class="index-code">{{ index.index_code }}</div>
    </div>

    <div class="valuation-metrics">
      <div class="metric">
        <div class="metric-label">PE</div>
        <div class="metric-value">{{ index.pe_ratio?.toFixed(2) }}</div>
      </div>
      <div class="metric">
        <div class="metric-label">分位点</div>
        <div class="metric-value">{{ index.pe_percentile_5y?.toFixed(1) }}%</div>
      </div>
    </div>

    <div :class="['status', index.valuation_status?.toLowerCase()]">
      {{ getStatusText(index.valuation_status) }}
    </div>
  </div>
</template>

<script setup lang="ts">

interface Props {
  index: {
    id: number
    index_code: string
    index_name: string
    index_type: string
    pe_ratio?: number
    pe_percentile_5y?: number
    valuation_status?: string
  }
}

defineProps<Props>()

const emit = defineEmits<{
  click: [index: Props['index']]
}>()

const getStatusText = (status?: string) => {
  const map: Record<string, string> = {
    '低估': '低估',
    '正常': '正常',
    '高估': '高估'
  }
  return map[status || ''] || status
}

const onClick = () => {
  emit('click', defineProps<Props>().index)
}
</script>

<style scoped>
.valuation-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}

.valuation-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.index-name {
  font-size: 15px;
  font-weight: 600;
}

.index-code {
  font-size: 12px;
  color: #999;
}

.valuation-metrics {
  display: flex;
  gap: 24px;
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
  font-size: 18px;
  font-weight: 600;
}

.status {
  font-size: 14px;
  padding: 4px 12px;
  border-radius: 4px;
  display: inline-block;
  font-weight: 600;
}

.status.低估 {
  background: #e6f7ff;
  color: #1890ff;
}

.status.正常 {
  background: #fff7e6;
  color: #fa8c16;
}

.status.高估 {
  background: #fff1f0;
  color: #f5222d;
}
</style>
