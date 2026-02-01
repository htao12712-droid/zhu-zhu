<template>
  <div class="fund-detail">
    <van-nav-bar title="基金详情" left-arrow @click-left="onClickLeft" />

    <van-loading v-if="loading" size="24px" vertical>加载中...</van-loading>

    <div v-else-if="fund" class="fund-content">
      <div class="fund-basic">
        <div class="fund-name">{{ fund.fund_name }}</div>
        <div class="fund-code">{{ fund.fund_code }}</div>
        <div class="fund-tags">
          <span class="tag">{{ fund.fund_type }}</span>
          <span class="tag">{{ formatSize(fund.fund_size) }}</span>
        </div>
      </div>

      <div class="fund-manager">
        <h3>基金经理</h3>
        <div class="manager-info">
          <span>{{ fund.manager_name || '--' }}</span>
          <span>{{ fund.education || '--' }}</span>
        </div>
      </div>

      <div class="fund-performance">
        <h3>业绩表现</h3>
        <van-button type="primary" size="small" @click="loadPerformance">查看业绩</van-button>
      </div>

      <div class="fund-actions">
        <van-button type="primary" block>立即申购</van-button>
        <van-button plain block>添加到组合</van-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const fund = ref<any>(null)

const formatSize = (size: number) => {
  if (!size) return '--'
  return (size / 100000000).toFixed(2) + '亿'
}

const onClickLeft = () => {
  router.back()
}

const loadFund = async () => {
  try {
    const response = await api.get(`/funds/${route.params.id}`)
    fund.value = response.data.fund
  } catch (error) {
    console.error('Failed to load fund:', error)
  } finally {
    loading.value = false
  }
}

const loadPerformance = async () => {
  console.log('Load performance for fund:', route.params.id)
}

onMounted(() => {
  loadFund()
})
</script>

<style scoped>
.fund-detail {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 20px;
}

.fund-content {
  background: white;
  padding: 20px;
}

.fund-basic {
  margin-bottom: 24px;
}

.fund-name {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.fund-code {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.fund-tags {
  display: flex;
  gap: 8px;
}

.tag {
  font-size: 12px;
  padding: 4px 8px;
  background: #f0f0f0;
  border-radius: 4px;
}

.fund-manager,
.fund-performance {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.fund-manager h3,
.fund-performance h3 {
  font-size: 16px;
  margin: 0 0 12px 0;
}

.manager-info {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #666;
}

.fund-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
