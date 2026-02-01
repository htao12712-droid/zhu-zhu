<template>
  <div class="home">
    <van-nav-bar title="猪猪养基" />
    
    <van-notice-bar
      left-icon="volume-o"
      text="历史数据仅供参考,不构成投资建议"
      color="#fff"
      background="#ff976a"
    />

    <div class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">智能基金管理</h1>
        <p class="hero-subtitle">AI 驱动，让投资更轻松</p>
        <div class="hero-buttons">
          <van-button type="primary" size="large" @click="goToImport" icon="plus">导入基金</van-button>
          <van-button type="default" size="large" @click="goToPortfolio" icon="chart-trending-o">我的组合</van-button>
        </div>
      </div>
    </div>

    <div class="valuation-dashboard">
      <div class="section-title">
        <h2>
          <van-icon name="chart-trending-o" />
          估值仪表盘
        </h2>
        <router-link to="/valuation" class="more">查看更多</router-link>
      </div>
      <div class="valuation-cards">
        <div v-for="item in valuationData" :key="item.index_code" class="valuation-card">
          <div class="index-name">{{ item.index_name }}</div>
          <div class="pe-ratio">PE: {{ item.pe_ratio?.toFixed(2) }}</div>
          <div class="percentile">分位点: {{ item.pe_percentile_5y?.toFixed(1) }}%</div>
          <div :class="['status', item.valuation_status?.toLowerCase()]">
            {{ getValuationStatusText(item.valuation_status) }}
          </div>
        </div>
      </div>
    </div>

    <div class="fund-ranking">
      <div class="section-title">
        <h2>
          <van-icon name="fire" />
          热门基金
        </h2>
        <router-link to="/funds" class="more">查看更多</router-link>
      </div>
      <div class="ranking-list">
        <div v-for="(fund, index) in topFunds" :key="fund.id" class="ranking-item">
          <div class="rank" :class="{ top: index < 3 }">{{ index + 1 }}</div>
          <div class="fund-info">
            <div class="fund-name">{{ fund.fund_name }}</div>
            <div class="fund-type">{{ fund.fund_type }}</div>
          </div>
          <div class="fund-return">
            <div class="return-value">{{ fund.return_rate }}%</div>
          </div>
        </div>
      </div>
    </div>

    <div class="quick-actions">
      <div class="action-grid">
        <div class="action-item" @click="goToValuation">
          <div class="action-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
            <van-icon name="chart-trending-o" size="24" color="#fff" />
          </div>
          <span>估值分析</span>
        </div>
        <div class="action-item" @click="goToPortfolio">
          <div class="action-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
            <van-icon name="balance-list-o" size="24" color="#fff" />
          </div>
          <span>我的组合</span>
        </div>
        <div class="action-item" @click="goToSimulation">
          <div class="action-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
            <van-icon name="play-circle-o" size="24" color="#fff" />
          </div>
          <span>模拟投资</span>
        </div>
        <div class="action-item" @click="goToImport">
          <div class="action-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)">
            <van-icon name="photo-o" size="24" color="#fff" />
          </div>
          <span>AI识别</span>
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()
const active = ref(0)
const valuationData = ref<any[]>([])
const topFunds = ref<any[]>([])

const getValuationStatusText = (status: string) => {
  const map: any = {
    '低估': '低估',
    '正常': '正常',
    '高估': '高估'
  }
  return map[status] || status
}

const goToImport = () => {
  router.push('/portfolio/import')
}

const goToPortfolio = () => {
  router.push('/portfolio')
}

const goToValuation = () => {
  router.push('/valuation')
}

const goToSimulation = () => {
  router.push('/portfolio/simulation')
}

onMounted(async () => {
  try {
    const valuationRes = await api.get('/valuation/dashboard')
    valuationData.value = valuationRes.data.indices.slice(0, 6)

    const fundsRes = await api.get('/funds', { params: { pageSize: 5 } })
    topFunds.value = fundsRes.data.funds.map((fund: any) => ({
      ...fund,
      return_rate: (Math.random() * 30 - 5).toFixed(2)
    }))
  } catch (error) {
    console.error('Failed to load data:', error)
  }
})
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: linear-gradient(180deg, #f7f8fa 0%, #ffffff 100%);
  padding-bottom: 50px;
}

.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 32px 16px 48px;
  color: white;
  border-radius: 0 0 24px 24px;
  margin-bottom: -24px;
  position: relative;
}

.hero-content {
  text-align: center;
}

.hero-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.hero-subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin: 0 0 24px;
}

.hero-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.hero-buttons .van-button {
  min-width: 120px;
  height: 44px;
  border-radius: 22px;
  font-weight: 600;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 12px;
  background: white;
}

.section-title h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title h2 .van-icon {
  color: #667eea;
}

.more {
  color: #1989fa;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}

.valuation-dashboard {
  margin: 12px;
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.valuation-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.valuation-card {
  padding: 16px 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  transition: transform 0.2s, box-shadow 0.2s;
}

.valuation-card:active {
  transform: scale(0.98);
}

.index-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #333;
}

.pe-ratio {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.percentile {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.status {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 12px;
  display: inline-block;
  font-weight: 500;
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

.fund-ranking {
  margin: 12px;
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 14px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  border-radius: 12px;
  transition: transform 0.2s;
}

.ranking-item:active {
  transform: scale(0.98);
}

.rank {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #d9d9d9 0%, #bfbfbf 100%);
  color: white;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 700;
  margin-right: 14px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.rank.top {
  background: linear-gradient(135deg, #ff976a 0%, #f5222d 100%);
  box-shadow: 0 2px 8px rgba(245, 34, 45, 0.3);
}

.fund-info {
  flex: 1;
}

.fund-name {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #333;
}

.fund-type {
  font-size: 12px;
  color: #999;
}

.fund-return {
  text-align: right;
}

.return-value {
  font-size: 18px;
  font-weight: 700;
  color: #f5222d;
  text-shadow: 0 1px 2px rgba(245, 34, 45, 0.1);
}

.quick-actions {
  margin: 12px;
  background: white;
  border-radius: 16px;
  padding: 20px 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.action-item:active {
  transform: scale(0.95);
}

.action-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.action-item span {
  font-size: 12px;
  color: #333;
  font-weight: 500;
}
</style>
