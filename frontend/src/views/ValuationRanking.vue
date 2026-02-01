<template>
  <div class="valuation-ranking">
    <van-nav-bar title="估值榜单" left-arrow @click-left="onClickLeft" />

    <div class="ranking-header">
      <div class="title">全部指数估值排名</div>
      <div class="subtitle">按估值分位点排序</div>
    </div>

    <van-loading v-if="loading" size="24px" vertical>加载中...</van-loading>

    <div v-else class="ranking-list">
      <div
        v-for="(item, index) in ranking"
        :key="item.index_code"
        class="ranking-item"
      >
        <div class="rank" :class="{ top: index < 10 }">{{ index + 1 }}</div>
        <div class="index-info">
          <div class="index-name">{{ item.index_name }}</div>
          <div class="index-code">{{ item.index_code }}</div>
        </div>
        <div class="valuation-data">
          <div class="pe-value">{{ item.pe_ratio?.toFixed(2) }}</div>
          <div class="percentile">{{ item.pe_percentile_5y?.toFixed(1) }}%</div>
        </div>
        <div :class="['status', item.valuation_status?.toLowerCase()]">
          {{ item.valuation_status }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()
const loading = ref(true)
const ranking = ref<any[]>([])

const onClickLeft = () => {
  router.back()
}

onMounted(async () => {
  try {
    const response = await api.get('/valuation/ranking')
    ranking.value = response.data.ranking
  } catch (error) {
    console.error('Failed to load ranking:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.valuation-ranking {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.ranking-header {
  background: white;
  padding: 20px;
  text-align: center;
  margin-bottom: 12px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 14px;
  color: #999;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.ranking-item {
  background: white;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.rank {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.rank.top {
  background: #ff976a;
  color: white;
}

.index-info {
  flex: 1;
  min-width: 0;
}

.index-name {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.index-code {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.valuation-data {
  text-align: right;
  min-width: 80px;
}

.pe-value {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 2px;
}

.percentile {
  font-size: 12px;
  color: #999;
}

.status {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
  flex-shrink: 0;
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
