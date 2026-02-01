<template>
  <div class="valuation-chart">
    <div class="chart-header">
      <h3>{{ title }}</h3>
      <van-radio-group v-model="timeRange" direction="horizontal" @change="onTimeRangeChange">
        <van-radio name="1M">1月</van-radio>
        <van-radio name="3M">3月</van-radio>
        <van-radio name="6M">6月</van-radio>
        <van-radio name="1Y">1年</van-radio>
        <van-radio name="3Y">3年</van-radio>
      </van-radio-group>
    </div>

    <div ref="chartRef" class="chart-container"></div>

    <div class="chart-legend">
      <div class="legend-item" v-for="item in legend" :key="item.name">
        <div class="legend-color" :style="{ background: item.color }"></div>
        <div class="legend-name">{{ item.name }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'

interface Props {
  title?: string
  data: {
    dates: string[]
    fundData: number[]
    benchmarkData?: number[]
    categoryData?: number[]
  }
  defaultTimeRange?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '净值走势',
  defaultTimeRange: '1Y'
})

const emit = defineEmits<{
  timeRangeChange: [range: string]
}>()

const chartRef = ref<HTMLElement>()
const timeRange = ref(props.defaultTimeRange)
let chart: echarts.ECharts | null = null

const legend = [
  { name: '基金净值', color: '#1890ff' },
  { name: '基准指数', color: '#52c41a' },
  { name: '同类平均', color: '#fa8c16' }
]

const initChart = () => {
  if (!chartRef.value) return

  chart = echarts.init(chartRef.value)

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = params[0].axisValue + '<br/>'
        params.forEach((param: any) => {
          result += `${param.marker} ${param.seriesName}: ${param.value.toFixed(4)}<br/>`
        })
        return result
      }
    },
    legend: {
      show: false
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.data.dates
    },
    yAxis: {
      type: 'value',
      name: '净值'
    },
    series: [
      {
        name: '基金净值',
        type: 'line',
        smooth: true,
        data: props.data.fundData,
        itemStyle: { color: '#1890ff' }
      }
    ]
  }

  if (props.data.benchmarkData) {
    option.series.push({
      name: '基准指数',
      type: 'line',
      smooth: true,
      data: props.data.benchmarkData,
      itemStyle: { color: '#52c41a' }
    })
  }

  if (props.data.categoryData) {
    option.series.push({
      name: '同类平均',
      type: 'line',
      smooth: true,
      data: props.data.categoryData,
      itemStyle: { color: '#fa8c16' }
    })
  }

  chart.setOption(option)
}

const updateChart = () => {
  if (!chart) return

  chart.setOption({
    xAxis: {
      data: props.data.dates
    },
    series: [
      {
        data: props.data.fundData
      },
      ...(props.data.benchmarkData ? [{
        data: props.data.benchmarkData
      }] : []),
      ...(props.data.categoryData ? [{
        data: props.data.categoryData
      }] : [])
    ]
  })
}

const onTimeRangeChange = (value: string) => {
  emit('timeRangeChange', value)
}

watch(() => props.data, updateChart, { deep: true })
watch(() => props.defaultTimeRange, (value) => {
  timeRange.value = value
})

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (chart) {
    chart.dispose()
    chart = null
  }
  window.removeEventListener('resize', handleResize)
})

const handleResize = () => {
  if (chart) {
    chart.resize()
  }
}
</script>

<style scoped>
.valuation-chart {
  background: white;
  border-radius: 8px;
  padding: 16px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.chart-container {
  width: 100%;
  height: 300px;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
</style>
