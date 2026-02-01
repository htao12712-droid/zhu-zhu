<template>
  <div class="funds">
    <van-nav-bar title="基金筛选" left-arrow @click-left="onClickLeft" />

    <van-search v-model="searchValue" placeholder="搜索基金代码或名称" />

    <div class="filter-section">
      <van-dropdown-menu>
        <van-dropdown-item v-model="fundType" :options="fundTypeOptions" @change="loadFunds" />
      </van-dropdown-menu>
    </div>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <div v-for="fund in funds" :key="fund.id" class="fund-card" @click="goToDetail(fund.id)">
          <div class="fund-header">
            <div class="fund-name">{{ fund.fund_name }}</div>
            <div class="fund-code">{{ fund.fund_code }}</div>
          </div>
          <div class="fund-info">
            <span class="fund-type">{{ fund.fund_type }}</span>
            <span class="fund-size">{{ formatSize(fund.fund_size) }}</span>
          </div>
        </div>
      </van-list>
    </van-pull-refresh>

    <van-tabbar v-model="active" route>
      <van-tabbar-item to="/" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item to="/valuation" icon="chart-trending-o">估值</van-tabbar-item>
      <van-tabbar-item to="/portfolio" icon="balance-list-o">组合</van-tabbar-item>
      <van-tabbar-item to="/profile" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()
const searchValue = ref('')
const fundType = ref('全部')
const refreshing = ref(false)
const loading = ref(false)
const finished = ref(false)
const funds = ref<any[]>([])
const page = ref(1)
const active = ref(1)

const fundTypeOptions = [
  { text: '全部类型', value: '' },
  { text: '股票型', value: '股票型' },
  { text: '混合型', value: '混合型' },
  { text: '债券型', value: '债券型' },
  { text: '指数型', value: '指数型' },
  { text: '货币型', value: '货币型' }
]

const formatSize = (size: number) => {
  if (!size) return '--'
  return (size / 100000000).toFixed(2) + '亿'
}

const onClickLeft = () => {
  router.back()
}

const loadFunds = async () => {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      pageSize: 20
    }
    if (fundType.value) {
      params.type = fundType.value
    }
    const response = await api.get('/funds', { params })
    funds.value = [...funds.value, ...response.data.funds]
    if (funds.value.length >= response.data.pagination.total) {
      finished.value = true
    }
    page.value++
  } catch (error) {
    console.error('Failed to load funds:', error)
  } finally {
    loading.value = false
  }
}

const onLoad = () => {
  loadFunds()
}

const onRefresh = () => {
  funds.value = []
  page.value = 1
  finished.value = false
  loadFunds().then(() => {
    refreshing.value = false
  })
}

const goToDetail = (id: string) => {
  router.push(`/funds/${id}`)
}
</script>

<style scoped>
.funds {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 50px;
}

.filter-section {
  margin: 12px 0;
}

.fund-card {
  background: white;
  margin: 12px;
  padding: 16px;
  border-radius: 8px;
  cursor: pointer;
}

.fund-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.fund-name {
  font-size: 16px;
  font-weight: 600;
  flex: 1;
}

.fund-code {
  font-size: 14px;
  color: #999;
}

.fund-info {
  display: flex;
  gap: 12px;
}

.fund-type {
  font-size: 12px;
  padding: 4px 8px;
  background: #e6f7ff;
  color: #1890ff;
  border-radius: 4px;
}

.fund-size {
  font-size: 12px;
  color: #666;
}
</style>
