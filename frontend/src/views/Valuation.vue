<template>
  <div class="valuation">
    <van-nav-bar title="估值仪表盘" />

    <van-notice-bar
      left-icon="volume-o"
      text="估值数据仅供参考,未来表现可能不同"
      color="#fff"
      background="#ff976a"
    />

    <div class="realtime-panel">
      <div class="panel-header">
        <h2>
          <van-icon name="search" />
          实时基金估值
        </h2>
        <span class="panel-subtitle">接入东财实时估值接口,默认 10 秒缓存</span>
      </div>

      <van-search
        v-model="searchValue"
        show-action
        placeholder="输入基金代码或名称"
        @search="onManualSearch"
        @cancel="clearSearch"
      />

      <div v-if="searchSuggestions.length" class="suggestion-panel">
        <div
          v-for="item in searchSuggestions"
          :key="item.fund_code"
          class="suggestion-item"
          @click="selectSuggestion(item)"
        >
          <div>
            <div class="suggestion-name">{{ item.fund_name }}</div>
            <div class="suggestion-meta">{{ item.fund_code }} · {{ item.fund_company || '权威数据源' }}</div>
          </div>
          <van-icon name="arrow" />
        </div>
      </div>

      <div class="estimate-card">
        <van-loading v-if="estimateLoading" size="20px" vertical>实时估值加载中...</van-loading>
        <template v-else>
          <div v-if="selectedEstimate" class="estimate-content">
            <div class="estimate-header">
              <div>
                <div class="estimate-name">{{ selectedEstimate.fund_name }}</div>
                <div class="estimate-code">{{ selectedEstimate.fund_code }} · 最新 {{ selectedEstimate.updated_at }}</div>
              </div>
              <div class="provider">{{ selectedEstimate.provider }}</div>
            </div>
            <div class="estimate-grid">
              <div>
                <div class="metric-label">单位净值 ({{ selectedEstimate.nav_date }})</div>
                <div class="metric-value">{{ formatNumber(selectedEstimate.unit_nav) }}</div>
              </div>
              <div>
                <div class="metric-label">实时估值</div>
                <div class="metric-value">{{ formatNumber(selectedEstimate.estimate_nav) }}</div>
              </div>
              <div>
                <div class="metric-label">估算涨跌幅</div>
                <div :class="['metric-value', estimateColor]">{{ formatPercent(selectedEstimate.estimate_change_pct) }}</div>
              </div>
            </div>
            <div class="estimate-footer">
              <div class="timestamp">同步时间: {{ selectedEstimate.received_at }}</div>
              <div v-if="selectedEstimate.delayed" class="delay-tag">数据可能延迟</div>
            </div>
          </div>
          <div v-else class="empty-hint">
            <van-icon name="aim" size="24" />
            <span>输入基金代码即可查看实时估值</span>
          </div>
        </template>
      </div>
    </div>

    <van-loading v-if="loading" size="24px" vertical>估值面板加载中...</van-loading>

    <div v-else class="valuation-list">
      <div
        v-for="item in indices"
        :key="item.index_code"
        class="valuation-card"
        @click="goToDetail(item.index_code)"
      >
        <div class="index-info">
          <div class="index-name">{{ item.index_name }}</div>
          <div class="index-code">{{ item.index_code }}</div>
        </div>
        <div class="valuation-metrics">
          <div class="metric">
            <div class="metric-label">PE</div>
            <div class="metric-value">{{ item.pe_ratio?.toFixed(2) }}</div>
          </div>
          <div class="metric">
            <div class="metric-label">分位点</div>
            <div class="metric-value">{{ item.pe_percentile_5y?.toFixed(1) }}%</div>
          </div>
        </div>
        <div :class="['status', item.valuation_status?.toLowerCase()]">
          {{ getValuationStatusText(item.valuation_status) }}
        </div>
      </div>
    </div>

    <van-tabbar v-model="active" route>
      <van-tabbar-item to="/" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item to="/valuation" icon="chart-trending-o">估值</van-tabbar-item>
      <van-tabbar-item to="/portfolio" icon="balance-list-o">组合</van-tabbar-item>
      <van-tabbar-item to="/profile" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showToast } from 'vant'
import api from '@/services/api'
import { fundAPI } from '@/services/fund'

const router = useRouter()
const loading = ref(true)
const active = ref(1)
const indices = ref<any[]>([])

const searchValue = ref('')
const searchSuggestions = ref<any[]>([])
const estimateLoading = ref(false)
const selectedEstimate = ref<any | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const estimateColor = computed(() => {
  if (!selectedEstimate.value) return ''
  const pct = Number(selectedEstimate.value.estimate_change_pct)
  if (pct > 0) return 'positive'
  if (pct < 0) return 'negative'
  return ''
})

const getValuationStatusText = (status: string) => {
  const map: any = {
    '低估': '低估',
    '正常': '正常',
    '高估': '高估'
  }
  return map[status] || status
}

const goToDetail = (code: string) => {
  router.push(`/valuation/ranking?code=${code}`)
}

const formatNumber = (value: number) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--'
  }
  return Number(value).toFixed(4)
}

const formatPercent = (value: number) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--'
  }
  const num = Number(value)
  const prefix = num > 0 ? '+' : ''
  return `${prefix}${num.toFixed(2)}%`
}

const fetchSuggestions = async (keyword: string) => {
  if (!keyword) return
  try {
    const response = await fundAPI.search(keyword, 8)
    searchSuggestions.value = response.data.funds
  } catch (error) {
    showFailToast('基金搜索失败')
  }
}

const loadRealtimeEstimate = async (code: string) => {
  if (!code) return
  estimateLoading.value = true
  try {
    const response = await fundAPI.getRealtimeEstimate(code)
    selectedEstimate.value = response.data.estimate
  } catch (error) {
    selectedEstimate.value = null
    showFailToast('获取实时估值失败,请稍后重试')
  } finally {
    estimateLoading.value = false
  }
}

const selectSuggestion = (fund: any) => {
  searchValue.value = `${fund.fund_name} (${fund.fund_code})`
  searchSuggestions.value = []
  loadRealtimeEstimate(fund.fund_code)
}

const onManualSearch = () => {
  if (searchValue.value.trim().length < 2) {
    showToast('请输入至少两个字符的基金代码')
    return
  }
  fetchSuggestions(searchValue.value.trim())
}

const clearSearch = () => {
  searchValue.value = ''
  searchSuggestions.value = []
  selectedEstimate.value = null
}

watch(searchValue, (val) => {
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
  const keyword = val.trim()
  if (keyword.length < 2) {
    searchSuggestions.value = []
    return
  }
  searchTimer = setTimeout(() => fetchSuggestions(keyword), 300)
})

onMounted(async () => {
  try {
    console.log('Fetching valuation data...')
    const response = await api.get('/valuation/dashboard')
    console.log('Valuation response:', response)
    indices.value = response.data.indices || []
    console.log('Indices:', indices.value)
  } catch (error) {
    console.error('Failed to load valuation data:', error)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
})
</script>

<style scoped>
.valuation {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 50px;
}

.realtime-panel {
  margin: 16px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(22, 119, 255, 0.08);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.panel-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  margin: 0;
}

.panel-subtitle {
  font-size: 12px;
  color: #8c8c8c;
}

.suggestion-panel {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-top: 8px;
  overflow: hidden;
}

.suggestion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #fff;
  border-bottom: 1px solid #f5f5f5;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-name {
  font-size: 14px;
  font-weight: 600;
}

.suggestion-meta {
  font-size: 12px;
  color: #999;
}

.estimate-card {
  margin-top: 12px;
  background: linear-gradient(180deg, #f7fbff 0%, #ffffff 100%);
  border-radius: 12px;
  padding: 16px;
}

.estimate-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.estimate-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.estimate-name {
  font-size: 18px;
  font-weight: 700;
}

.estimate-code {
  font-size: 12px;
  color: #888;
}

.provider {
  font-size: 12px;
  color: #165dff;
  background: rgba(22, 93, 255, 0.08);
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 600;
}

.estimate-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.metric-label {
  font-size: 12px;
  color: #8c8c8c;
}

.metric-value {
  font-size: 20px;
  font-weight: 700;
}

.metric-value.positive {
  color: #52c41a;
}

.metric-value.negative {
  color: #ef5350;
}

.estimate-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timestamp {
  font-size: 12px;
  color: #999;
}

.delay-tag {
  font-size: 12px;
  color: #fa8c16;
  background: #fff1e6;
  padding: 4px 8px;
  border-radius: 999px;
}

.empty-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  color: #999;
  font-size: 14px;
  min-height: 60px;
}

.valuation-list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.valuation-card {
  background: white;
  padding: 16px;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s;
}

.valuation-card:active {
  transform: scale(0.98);
}

.index-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.index-name {
  font-size: 16px;
  font-weight: 600;
}

.index-code {
  font-size: 14px;
  color: #999;
}

.valuation-metrics {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 12px;
  color: #999;
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
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  color: #1890ff;
}

.status.正常 {
  background: linear-gradient(135deg, #fff7e6 0%, #ffd591 100%);
  color: #fa8c16;
}

.status.高估 {
  background: linear-gradient(135deg, #fff1f0 0%, #ffa39e 100%);
  color: #f5222d;
}
</style>
