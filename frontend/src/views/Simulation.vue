<template>
  <div class="simulation">
    <van-nav-bar title="模拟组合" left-arrow @click-left="onClickLeft" />

    <div class="simulation-actions">
      <van-button type="primary" block @click="openCreateDialog">创建模拟组合</van-button>
    </div>

    <van-loading v-if="loading" size="24px" vertical>加载中...</van-loading>

    <div v-else class="simulation-list">
      <div
        v-for="sim in simulations"
        :key="sim.id"
        class="simulation-card"
      >
        <div class="simulation-header">
          <div class="portfolio-name">{{ sim.portfolio_name }}</div>
          <div class="created-date">{{ formatDate(sim.created_at) }}</div>
        </div>
        <div class="simulation-metrics">
          <div class="metric">
            <div class="metric-label">初始资金</div>
            <div class="metric-value">{{ formatCurrency(sim.initial_capital) }}</div>
          </div>
          <div class="metric">
            <div class="metric-label">当前市值</div>
            <div class="metric-value">{{ formatCurrency(sim.current_value) }}</div>
          </div>
          <div class="metric">
            <div class="metric-label">累计收益</div>
            <div :class="['metric-value', sim.total_return >= 0 ? 'positive' : 'negative']">
              {{ sim.total_return >= 0 ? '+' : '' }}{{ sim.total_return?.toFixed(2) }}%
            </div>
          </div>
        </div>
        <div class="simulation-actions">
          <van-button size="mini" type="primary">查看详情</van-button>
          <van-button size="mini" type="danger">删除</van-button>
        </div>
      </div>
    </div>

    <van-dialog v-model:show="showDialog" title="创建模拟组合" show-cancel-button @confirm="onCreateConfirm">
      <van-form>
        <van-field
          v-model="createForm.portfolioName"
          name="portfolioName"
          label="组合名称"
          placeholder="请输入组合名称"
          required
        />
        <van-field
          v-model.number="createForm.initialCapital"
          name="initialCapital"
          type="number"
          label="初始资金"
          placeholder="请输入初始资金"
          required
        />
        <van-field
          v-model="createForm.startDate"
          name="startDate"
          type="date"
          label="建仓日期"
          placeholder="请选择建仓日期"
          required
        />
      </van-form>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'

const router = useRouter()
const loading = ref(true)
const showDialog = ref(false)
const simulations = ref<any[]>([])
const createForm = ref({
  portfolioName: '',
  initialCapital: 100000,
  startDate: new Date().toISOString().split('T')[0]
})

const formatCurrency = (value: number) => {
  if (!value) return '¥0.00'
  return '¥' + value.toFixed(2)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const onClickLeft = () => {
  router.back()
}

const openCreateDialog = () => {
  showDialog.value = true
}

const loadSimulations = async () => {
  loading.value = true
  try {
    console.log('Loading simulations...')
    simulations.value = []
    loading.value = false
  } catch (error) {
    console.error('Failed to load simulations:', error)
  }
}

const onCreateConfirm = async () => {
  try {
    showToast('创建成功')
    showDialog.value = false
    loadSimulations()
  } catch (error) {
    showToast('创建失败')
  }
}

onMounted(() => {
  loadSimulations()
})
</script>

<style scoped>
.simulation {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 20px;
}

.simulation-actions {
  padding: 12px;
}

.simulation-list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.simulation-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
}

.simulation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.portfolio-name {
  font-size: 16px;
  font-weight: 600;
}

.created-date {
  font-size: 12px;
  color: #999;
}

.simulation-metrics {
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

.metric-value.positive {
  color: #f5222d;
}

.metric-value.negative {
  color: #52c41a;
}

.simulation-actions {
  display: flex;
  gap: 8px;
}
</style>
