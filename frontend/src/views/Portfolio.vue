<template>
  <div class="portfolio xiaobei">
    <van-nav-bar title="我的组合" />

    <div class="portfolio-summary" v-if="summary">
      <div class="summary-row">
        <div class="summary-item">
          <div class="label">总资产</div>
          <div class="value">{{ formatCurrency(displayMode === 'est' ? summary.totalValueEst : summary.totalValue) }}</div>
        </div>
        <div class="summary-item">
          <div class="label">总成本</div>
          <div class="value">{{ formatCurrency(summary.totalCost) }}</div>
        </div>
        <div class="summary-item">
          <div class="label">累计收益</div>
          <div :class="['value', (displayMode === 'est' ? summary.totalProfitEst : summary.totalProfitNav) >= 0 ? 'positive' : 'negative']">
            {{ (displayMode === 'est' ? summary.totalProfitEst : summary.totalProfitNav) >= 0 ? '+' : '' }}{{ formatCurrency(displayMode === 'est' ? summary.totalProfitEst : summary.totalProfitNav) }}
          </div>
        </div>
      </div>

      <div class="summary-toggle">
        <van-tabs v-model:active="activeTab" type="card" shrink @change="onTabChange">
          <van-tab title="估算口径" />
          <van-tab title="净值口径" />
        </van-tabs>
        <div class="hint">
          <span v-if="displayMode==='est'">实时估算价会波动，数据每 15 秒自动刷新</span>
          <span v-else>净值口径按最新净值（T-1）计算</span>
        </div>
      </div>
    </div>

    <div class="actions-bar">
      <van-button type="primary" block round @click="openAddDialog">+ 添加持仓</van-button>
    </div>

    <van-loading v-if="loading" size="24px" vertical>加载中...</van-loading>

    <div v-else class="holdings-section">
      <div v-if="holdings.length === 0" class="empty-state">
        <van-icon name="records" size="64" color="#ccc" />
        <p>暂无持仓，点击上方按钮添加</p>
      </div>

      <div v-else>
        <van-search
          v-model="searchKeyword"
          placeholder="输入基金代码或名称筛选"
          shape="round"
          class="holdings-search"
          background="#f7f8fa"
          clearable
          show-action
          @cancel="searchKeyword = ''"
        />

        <div v-if="filteredHoldings.length === 0" class="empty-state search-empty">
          <van-icon name="search" size="60" color="#ccc" />
          <p>没有匹配的基金，换个关键词试试</p>
        </div>

        <div v-else class="holdings-list">
          <div
            v-for="h in filteredHoldings"
            :key="h.id"
            class="holding-card xiaobei-card"
            @click="openHoldingDetail(h)"
          >
            <!-- 第一行：基金名/代码 + 估值标签 + 今日涨跌 -->
            <div class="row row-1">
              <div class="left">
                <div class="name">{{ h.fund_name || '--' }}</div>
                <div class="code">{{ h.fund_code }}</div>
              </div>

              <div class="right">
                <van-tag v-if="h.valuation_tag" :type="h.valuation_tag==='低估' ? 'success' : (h.valuation_tag==='高估' ? 'danger' : 'primary')" round class="tag">
                  {{ h.valuation_tag }}
                  <span v-if="h.valuation_percentile_5y != null" class="pct">({{ Number(h.valuation_percentile_5y).toFixed(0) }}%)</span>
                </van-tag>

                <div :class="['change', displayTodayChange(h) >= 0 ? 'positive' : 'negative']">
                  {{ displayTodayChange(h) >= 0 ? '+' : '' }}{{ displayTodayChange(h).toFixed(2) }}%
                </div>
              </div>
            </div>

            <!-- 第二行：今日收益（大号） -->
            <div class="row row-2">
              <div :class="['today-profit', displayTodayProfit(h) >= 0 ? 'positive' : 'negative', h.__flash ? 'flash' : '']">
                {{ displayTodayProfit(h) >= 0 ? '+' : '' }}{{ formatCurrency(displayTodayProfit(h)) }}
              </div>
              <div class="sub">今日收益</div>
            </div>

            <!-- 第三行：累计收益 + 成本 + 份额 -->
            <div class="row row-3">
              <div class="mini">
                <div class="mini-label">累计收益</div>
                <div :class="['mini-value', displayTotalProfit(h) >= 0 ? 'positive' : 'negative']">
                  {{ displayTotalProfit(h) >= 0 ? '+' : '' }}{{ formatCurrency(displayTotalProfit(h)) }}
                </div>
              </div>
              <div class="mini">
                <div class="mini-label">成本</div>
                <div class="mini-value">{{ formatCurrency(h.cost_amount || 0) }}</div>
              </div>
              <div class="mini">
                <div class="mini-label">份额</div>
                <div class="mini-value">{{ Number(h.holding_shares || 0).toFixed(2) }}</div>
              </div>
            </div>

            <div class="row row-4 meta">
              <span v-if="displayMode==='est'">估算价: {{ (h.est_nav ?? 0) ? Number(h.est_nav).toFixed(4) : '--' }}</span>
              <span v-if="displayMode==='est'">净值: {{ (h.nav_t1 ?? 0) ? Number(h.nav_t1).toFixed(4) : '--' }}</span>
              <span v-else>最新净值: {{ (h.current_nav ?? 0) ? Number(h.current_nav).toFixed(4) : '--' }}</span>
              <span>更新: {{ (h.nav_t1_date || h.nav_date || '').toString().slice(0,10) || '--' }}</span>
            </div>

            <div class="row row-5 actions" @click.stop>
              <van-button size="small" plain type="primary" round @click="editHolding(h)">编辑</van-button>
              <van-button size="small" plain type="danger" round @click="deleteHolding(h.id)">删除</van-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑持仓弹窗 -->
    <van-popup v-model:show="showAddDialog" position="bottom" round :style="{ height: '80%' }">
      <div class="popup-content">
        <div class="popup-header">
          <h3>{{ isEditing ? '编辑持仓' : '添加持仓' }}</h3>
          <van-icon name="cross" size="20" @click="closeAddDialog" />
        </div>

        <div class="field">
          <div class="field-label">基金</div>
          <van-search
            v-model="fundSearchKeyword"
            placeholder="输入基金名称/代码搜索"
            shape="round"
            background="#fff"
            clearable
            @search="searchFunds"
          />
          <div class="ocr-row">
            <van-uploader :after-read="onOcrAfterRead" accept="image/*" :max-count="1">
              <van-button size="small" plain round icon="photograph-o">截图自动填</van-button>
            </van-uploader>
            <span class="ocr-tip">上传含基金代码与金额的截图，自动识别填入</span>
          </div>

          <div v-if="searchResults.length" class="search-results">
            <div
              v-for="item in searchResults"
              :key="item.fund_code"
              class="search-item"
              @click="selectFund(item)"
            >
              <div class="si-left">
                <div class="si-name">{{ item.fund_name }}</div>
                <div class="si-code">{{ item.fund_code }}</div>
              </div>
              <van-icon name="arrow" />
            </div>
          </div>

          <div v-if="selectedFund" class="selected-fund">
            <van-tag type="primary" round>{{ selectedFund.fund_name }} ({{ selectedFund.fund_code }})</van-tag>
          </div>
        </div>

        <div class="field">
          <div class="field-label">买入金额</div>
          <van-field v-model="form.buyAmount" type="number" placeholder="例如 1000" input-align="right" />
          <div class="calc-hint" v-if="selectedFund && form.buyAmount">
            将按 <b>{{ buyPriceHint }}</b> 自动换算份额
            <span v-if="computedShares">≈ {{ computedShares }} 份</span>
          </div>
        </div>

        <div class="field">
          <div class="field-label">买入日期（可选）</div>
          <van-field v-model="form.buyDate" readonly placeholder="不填默认今天" input-align="right" @click="showDatePicker = true" />
        </div>

        <div class="popup-actions">
          <van-button type="primary" block round :loading="saving" @click="submitHolding">{{ isEditing ? '保存修改' : '确认添加' }}</van-button>
        </div>
      </div>
    </van-popup>

    <van-calendar v-model:show="showDatePicker" @confirm="onDateConfirm" />

    <!-- 持仓详情（曲线） -->
    <van-popup v-model:show="showDetail" position="bottom" round :style="{ height: '80%' }">
      <div class="popup-content">
        <div class="popup-header">
          <h3>{{ detailHolding?.fund_name || '持仓详情' }}</h3>
          <van-icon name="cross" size="20" @click="showDetail=false" />
        </div>

        <div class="detail-metrics" v-if="detailHolding">
          <div class="dm-row">
            <div class="dm-item">
              <div class="dm-label">今日收益</div>
              <div :class="['dm-value', displayTodayProfit(detailHolding) >= 0 ? 'positive' : 'negative']">
                {{ displayTodayProfit(detailHolding) >= 0 ? '+' : '' }}{{ formatCurrency(displayTodayProfit(detailHolding)) }}
              </div>
            </div>
            <div class="dm-item">
              <div class="dm-label">累计收益</div>
              <div :class="['dm-value', displayTotalProfit(detailHolding) >= 0 ? 'positive' : 'negative']">
                {{ displayTotalProfit(detailHolding) >= 0 ? '+' : '' }}{{ formatCurrency(displayTotalProfit(detailHolding)) }}
              </div>
            </div>
            <div class="dm-item">
              <div class="dm-label">持有份额</div>
              <div class="dm-value">{{ Number(detailHolding.holding_shares || 0).toFixed(2) }}</div>
            </div>
          </div>
        </div>

        <div class="chart-wrap">
          <div class="chart-title">近 30 天净值收益曲线（T-1）</div>
          <div ref="chartEl" class="chart"></div>
        </div>

        <div class="popup-actions" style="padding-top: 8px;">
          <van-button block round plain type="primary" @click="goFundDetail(detailHolding)">查看基金详情</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog, showLoadingToast, closeToast } from 'vant'
import * as echarts from 'echarts'
import api from '@/services/api'
import { fundAPI } from '@/services/fund'
import { recognizeImage } from '@/utils/ocr'

const router = useRouter()

const loading = ref(true)
const saving = ref(false)

const showAddDialog = ref(false)
const showDatePicker = ref(false)
const isEditing = ref(false)

const searchKeyword = ref('')
const fundSearchKeyword = ref('')
const searchResults = ref<any[]>([])
const selectedFund = ref<any>(null)

const holdings = ref<any[]>([])
const summary = ref<any>(null)

const displayMode = ref<'est' | 'nav'>('est')
const activeTab = ref(0)

const refreshTimer = ref<any>(null)

// detail popup
const showDetail = ref(false)
const detailHolding = ref<any>(null)
const chartEl = ref<HTMLDivElement | null>(null)
let chartIns: echarts.ECharts | null = null

const form = ref({
  buyAmount: '',
  buyDate: '',
  holdingId: null as any,
})

const buyPriceHint = computed(() => {
  if (!selectedFund.value) return '--'
  const p = selectedFund.value.__buyPrice || selectedFund.value.estimate_nav || selectedFund.value.unit_nav || selectedFund.value.current_nav
  return p ? Number(p).toFixed(4) : '--'
})

const computedShares = computed(() => {
  const amt = Number(form.value.buyAmount || 0)
  const p = Number(selectedFund.value?.__buyPrice || 0)
  if (!amt || !p) return ''
  return (amt / p).toFixed(4)
})

const filteredHoldings = computed(() => {
  const kw = searchKeyword.value.trim()
  if (!kw) return holdings.value
  return holdings.value.filter(h =>
    String(h.fund_code || '').includes(kw) || String(h.fund_name || '').includes(kw)
  )
})

function onTabChange(i: number) {
  displayMode.value = i === 0 ? 'est' : 'nav'
}

function formatCurrency(v: any) {
  const n = Number(v || 0)
  // keep 2 decimals, but show minus sign naturally
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function displayTodayChange(h: any): number {
  if (displayMode.value === 'est') return Number(h.today_change_rate ?? h.estimate_change_pct ?? 0)
  return Number(h.latest_change_rate ?? 0)
}

function displayTodayProfit(h: any): number {
  if (displayMode.value === 'est') return Number(h.today_profit ?? 0)
  return Number(h.latest_profit ?? 0)
}

function displayTotalProfit(h: any): number {
  if (displayMode.value === 'est') return Number(h.total_profit_est ?? 0)
  return Number(h.total_profit_nav ?? h.total_profit ?? 0)
}

function openAddDialog() {
  isEditing.value = false
  selectedFund.value = null
  searchResults.value = []
  fundSearchKeyword.value = ''
  form.value = { buyAmount: '', buyDate: '', holdingId: null }
  showAddDialog.value = true
}

function closeAddDialog() {
  showAddDialog.value = false
}

async function fetchPortfolio() {
  loading.value = true
  try {
    const res = await api.get('/portfolio')
    holdings.value = (res.data?.holdings || []).map((h: any) => ({ ...h, __flash: false, __prevTodayProfit: Number(h.today_profit || 0) }))
    // summary
    const totalCost = holdings.value.reduce((s: number, h: any) => s + Number(h.cost_amount || 0), 0)
    const totalValue = holdings.value.reduce((s: number, h: any) => s + Number(h.current_value || 0), 0)
    const totalValueEst = holdings.value.reduce((s: number, h: any) => s + Number(h.current_value_est || 0), 0)
    const totalProfitNav = holdings.value.reduce((s: number, h: any) => s + Number(h.total_profit_nav ?? h.total_profit ?? 0), 0)
    const totalProfitEst = holdings.value.reduce((s: number, h: any) => s + Number(h.total_profit_est ?? 0), 0)

    summary.value = { totalCost, totalValue, totalValueEst, totalProfitNav, totalProfitEst }
  } catch (e: any) {
    showToast(e?.response?.data?.message || '加载组合失败')
  } finally {
    loading.value = false
  }
}

async function refreshEstimates() {
  if (!holdings.value.length) return
  try {
    const codes = Array.from(new Set(holdings.value.map(h => h.fund_code).filter(Boolean)))
    if (!codes.length) return
    const res = await api.post('/funds/realtime/batch', { codes })
    const mp = res.data?.estimates || {}
    const now = Date.now()

    holdings.value = holdings.value.map((h: any) => {
      const est = mp[h.fund_code]
      if (!est) return h
      const estNav = Number(est.estimate_nav || 0)
      const navT1 = Number(est.unit_nav || 0)
      const todayChange = Number(est.estimate_change_pct || 0)
      const todayProfit = Number(h.holding_shares || 0) * (estNav - navT1)
      const totalProfitEst = Number(h.holding_shares || 0) * estNav - Number(h.cost_amount || 0)
      const currentValueEst = Number(h.holding_shares || 0) * estNav

      // flash when today profit changes
      const prev = Number(h.__prevTodayProfit || 0)
      const diff = Math.abs(todayProfit - prev)
      const flash = diff >= 0.01 // 1 cent
      const nh = {
        ...h,
        est_nav: estNav,
        nav_t1: navT1,
        nav_t1_date: est.nav_date,
        today_change_rate: todayChange,
        today_profit: todayProfit,
        total_profit_est: totalProfitEst,
        current_value_est: currentValueEst,
        __prevTodayProfit: todayProfit,
        __flash: flash ? true : false,
        __updatedAt: now
      }
      return nh
    })

    // reset flash quickly
    setTimeout(() => {
      holdings.value = holdings.value.map(h => ({ ...h, __flash: false }))
    }, 300)
    // recompute summary
    if (summary.value) {
      summary.value.totalValueEst = holdings.value.reduce((s: number, h: any) => s + Number(h.current_value_est || 0), 0)
      summary.value.totalProfitEst = holdings.value.reduce((s: number, h: any) => s + Number(h.total_profit_est ?? 0), 0)
    }
  } catch (e) {
    // ignore background refresh errors
  }
}

function startAutoRefresh() {
  stopAutoRefresh()
  refreshTimer.value = setInterval(() => refreshEstimates(), 15000)
}

function stopAutoRefresh() {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
    refreshTimer.value = null
  }
}

async function searchFunds() {
  const kw = fundSearchKeyword.value.trim()
  if (!kw) return
  try {
    const res = await fundAPI.searchFunds(kw)
    searchResults.value = res.data?.funds || []
  } catch (e: any) {
    showToast(e?.response?.data?.message || '搜索失败')
  }
}

async function selectFund(item: any) {
  selectedFund.value = item
  searchResults.value = []

  // get realtime estimate for buy price hint
  try {
    const r = await api.get(`/funds/realtime/${item.fund_code}`)
    const est = r.data?.estimate
    if (est) {
      selectedFund.value.__buyPrice = Number(est.estimate_nav || 0) || Number(est.unit_nav || 0) || 0
      selectedFund.value.estimate_nav = est.estimate_nav
      selectedFund.value.unit_nav = est.unit_nav
    }
  } catch (e) {
    // ignore
  }
}

async function onOcrAfterRead(file: any) {
  try {
    showLoadingToast({ message: '识别中...', forbidClick: true, duration: 0 })
    const { fundCode, amount } = await recognizeImage(file.file)
    closeToast()

    if (!fundCode && !amount) {
      showToast('没识别到基金代码/金额，请换更清晰的截图')
      return
    }

    // confirm before fill
    const msg = `识别到：${fundCode || '未知基金'} / 金额：${amount || '未知'}，是否填入？`
    await showConfirmDialog({ title: '截图识别', message: msg })

    if (fundCode) {
      fundSearchKeyword.value = fundCode
      await searchFunds()
      const hit = searchResults.value.find(x => String(x.fund_code) === String(fundCode))
      if (hit) {
        await selectFund(hit)
      } else {
        // if not in search results, still set selectedFund by code
        selectedFund.value = { fund_code: fundCode, fund_name: fundCode }
      }
    }

    if (amount) {
      form.value.buyAmount = String(amount)
    }
  } catch (e: any) {
    closeToast()
    if (e && e.message && String(e.message).includes('cancel')) return
    showToast('识别失败，请换更清晰的截图')
  }
}

function onDateConfirm(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  form.value.buyDate = `${y}-${m}-${d}`
  showDatePicker.value = false
}

async function submitHolding() {
  if (!selectedFund.value?.fund_code) {
    showToast('请选择基金')
    return
  }
  const amt = Number(form.value.buyAmount || 0)
  if (!amt || amt <= 0) {
    showToast('请输入买入金额')
    return
  }

  saving.value = true
  try {
    const payload: any = {
      fund_code: selectedFund.value.fund_code,
      cost_amount: amt,
      // 不传 holding_shares：后端按小倍规则自动算份额并锁定成本价
      buy_date: form.value.buyDate || undefined
    }

    if (isEditing.value && form.value.holdingId) {
      await api.put(`/portfolio/${form.value.holdingId}`, payload)
      showToast('保存成功')
    } else {
      await api.post('/portfolio', payload)
      showToast('添加成功')
    }

    showAddDialog.value = false
    await fetchPortfolio()
    await refreshEstimates()
  } catch (e: any) {
    showToast(e?.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function editHolding(h: any) {
  isEditing.value = true
  selectedFund.value = { fund_code: h.fund_code, fund_name: h.fund_name, __buyPrice: Number(h.est_nav || h.current_nav || 0) }
  form.value.holdingId = h.id
  form.value.buyAmount = String(h.cost_amount || '')
  form.value.buyDate = ''
  showAddDialog.value = true
}

async function deleteHolding(id: any) {
  try {
    await showConfirmDialog({ title: '确认删除', message: '确定要删除该持仓吗？' })
    await api.delete(`/portfolio/${id}`)
    showToast('删除成功')
    await fetchPortfolio()
  } catch (e) {}
}

function openHoldingDetail(h: any) {
  detailHolding.value = h
  showDetail.value = true
  nextTick(() => renderChart())
}

function goFundDetail(h: any) {
  if (!h?.fund_id) return
  showDetail.value = false
  router.push(`/funds/${h.fund_id}`)
}

async function renderChart() {
  if (!detailHolding.value?.fund_id) return
  if (!chartEl.value) return

  try {
    const r = await api.get(`/funds/${detailHolding.value.fund_id}/nav`, { params: { days: 30 } })
    const navs = r.data?.navHistory || r.data?.nav_history || r.data?.navs || []
    const xs: string[] = []
    const ys: number[] = []
    const shares = Number(detailHolding.value.holding_shares || 0)
    const cost = Number(detailHolding.value.cost_amount || 0)

    // expected navs: [{nav_date, unit_nav}]
    for (const row of navs) {
      const dt = (row.nav_date || row.date || '').toString().slice(0, 10)
      const nav = Number(row.unit_nav ?? row.nav ?? row.value ?? 0)
      if (!dt || !nav) continue
      xs.push(dt.slice(5))
      ys.push(shares * nav - cost)
    }

    if (!chartIns) {
      chartIns = echarts.init(chartEl.value)
    }
    chartIns.setOption({
      grid: { left: 12, right: 12, top: 20, bottom: 20, containLabel: true },
      xAxis: { type: 'category', data: xs, axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
      tooltip: { trigger: 'axis' },
      series: [{ type: 'line', data: ys, smooth: true, showSymbol: false, areaStyle: {} }]
    })
  } catch (e) {
    // ignore chart errors
  }
}

watch(showDetail, (v) => {
  if (!v) {
    if (chartIns) {
      chartIns.dispose()
      chartIns = null
    }
  }
})

onMounted(async () => {
  await fetchPortfolio()
  await refreshEstimates()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
  if (chartIns) {
    chartIns.dispose()
    chartIns = null
  }
})
</script>

<style scoped>
.portfolio.xiaobei {
  background: #f6f7fb;
  min-height: 100vh;
}

.actions-bar {
  padding: 12px 12px 6px 12px;
}

.portfolio-summary {
  padding: 12px;
}

.summary-row {
  display: flex;
  gap: 10px;
}

.summary-item {
  flex: 1;
  background: #fff;
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.04);
}

.summary-item .label {
  font-size: 12px;
  color: #888;
}
.summary-item .value {
  margin-top: 6px;
  font-size: 16px;
  font-weight: 700;
}
.summary-toggle {
  margin-top: 10px;
  background: #fff;
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.04);
}
.summary-toggle .hint {
  margin-top: 6px;
  font-size: 12px;
  color: #888;
}

.holdings-search {
  margin: 8px 12px 0 12px;
  border-radius: 14px;
}

.holdings-list {
  padding: 10px 12px 24px 12px;
}

.holding-card.xiaobei-card {
  background: #fff;
  border-radius: 18px;
  padding: 12px 12px 10px 12px;
  margin-bottom: 12px;
  box-shadow: 0 10px 22px rgba(0,0,0,0.05);
}

.row { display: flex; align-items: center; justify-content: space-between; }
.row-1 .name { font-size: 15px; font-weight: 700; color: #222; }
.row-1 .code { font-size: 12px; color: #999; margin-top: 2px; }
.row-1 .right { display: flex; gap: 8px; align-items: center; }
.row-1 .change { font-size: 13px; font-weight: 700; }

.row-2 { margin-top: 10px; flex-direction: column; align-items: flex-start; }
.today-profit { font-size: 26px; font-weight: 800; letter-spacing: 0.2px; }
.sub { font-size: 12px; color: #888; margin-top: 2px; }

.row-3 { margin-top: 10px; gap: 10px; }
.mini { flex: 1; background: #f7f8fa; border-radius: 12px; padding: 8px 10px; }
.mini-label { font-size: 11px; color: #888; }
.mini-value { margin-top: 4px; font-size: 14px; font-weight: 700; color: #222; }

.meta { margin-top: 8px; font-size: 11px; color: #888; gap: 8px; justify-content: flex-start; flex-wrap: wrap; }
.actions { margin-top: 10px; gap: 10px; justify-content: flex-end; }

.positive { color: #e54d42; }
.negative { color: #2ecc71; }

.flash { animation: flash 0.25s ease-in-out; }
@keyframes flash {
  0% { transform: scale(1.00); opacity: 1; }
  50% { transform: scale(1.02); opacity: 0.85; }
  100% { transform: scale(1.00); opacity: 1; }
}

.popup-content {
  padding: 12px;
  height: 100%;
  overflow: auto;
}
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 6px;
  border-bottom: 1px solid #eee;
}
.popup-header h3 { margin: 0; font-size: 16px; }

.field { margin-top: 12px; }
.field-label { font-size: 13px; color: #666; margin-bottom: 8px; }

.search-results { max-height: 220px; overflow: auto; border: 1px solid #f0f0f0; border-radius: 12px; }
.search-item { padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f4f4f4; }
.search-item:last-child { border-bottom: none; }
.si-name { font-weight: 700; color: #222; }
.si-code { font-size: 12px; color: #999; margin-top: 2px; }
.selected-fund { margin-top: 10px; }

.ocr-row { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
.ocr-tip { font-size: 12px; color: #999; }

.calc-hint { margin-top: 6px; font-size: 12px; color: #666; }
.popup-actions { margin-top: 16px; padding-bottom: 24px; }

.detail-metrics { margin-top: 10px; }
.dm-row { display: flex; gap: 10px; }
.dm-item { flex: 1; background: #f7f8fa; border-radius: 12px; padding: 10px; }
.dm-label { font-size: 11px; color: #888; }
.dm-value { margin-top: 6px; font-size: 16px; font-weight: 800; }
.chart-wrap { margin-top: 12px; background: #fff; border-radius: 14px; padding: 10px; box-shadow: 0 8px 18px rgba(0,0,0,0.04); }
.chart-title { font-size: 12px; color: #888; margin-bottom: 6px; }
.chart { width: 100%; height: 220px; }
</style>
