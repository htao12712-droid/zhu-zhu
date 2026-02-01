<template>
  <div class="valuation-backtest">
    <van-nav-bar title="估值定投回测" left-arrow @click-left="onClickLeft" />

    <van-notice-bar
      left-icon="volume-o"
      text="回测结果仅供参考,不保证未来收益"
      color="#fff"
      background="#ff976a"
    />

    <van-form @submit="onSubmit">
      <van-cell-group inset title="回测参数">
        <van-field
          v-model="form.indexCode"
          name="indexCode"
          label="指数代码"
          placeholder="请输入指数代码"
          required
        />
        <van-field
          v-model.number="form.initialAmount"
          name="initialAmount"
          type="number"
          label="初始金额"
          placeholder="1000"
          required
        />
        <van-field
          v-model="form.frequency"
          name="frequency"
          label="定投频率"
          is-link
          readonly
          placeholder="请选择定投频率"
          @click="showFrequencyPicker = true"
          required
        />
        <van-field
          v-model="form.duration"
          name="duration"
          label="定投时长"
          type="number"
          placeholder="36"
          required
        />
      </van-cell-group>

      <van-cell-group inset title="估值定投规则">
        <van-field
          v-model.number="form.lowPercentile"
          name="lowPercentile"
          type="number"
          label="低估阈值"
          placeholder="30"
        />
        <van-field
          v-model.number="form.highPercentile"
          name="highPercentile"
          type="number"
          label="高估阈值"
          placeholder="70"
        />
        <van-field
          v-model.number="form.lowMultiple"
          name="lowMultiple"
          type="number"
          label="低估倍数"
          placeholder="1.5"
        />
        <van-field
          v-model.number="form.highMultiple"
          name="highMultiple"
          type="number"
          label="高估倍数"
          placeholder="0.5"
        />
      </van-cell-group>

      <div class="submit-button">
        <van-button round block type="primary" native-type="submit" :loading="submitting">
          开始回测
        </van-button>
      </div>
    </van-form>

    <van-popup v-model:show="showFrequencyPicker" position="bottom">
      <van-picker
        :columns="frequencyOptions"
        @confirm="onFrequencyConfirm"
        @cancel="showFrequencyPicker = false"
      />
    </van-popup>

    <div v-if="backtestResult" class="backtest-result">
      <van-cell-group inset title="回测结果">
        <van-cell title="累计收益率" :value="backtestResult.totalReturn + '%'" />
        <van-cell title="年化收益率" :value="backtestResult.annualizedReturn + '%'" />
        <van-cell title="最大回撤" :value="backtestResult.maxDrawdown + '%'" />
        <van-cell title="夏普比率" :value="backtestResult.sharpeRatio" />
      </van-cell-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import api from '@/services/api'

const router = useRouter()
const showFrequencyPicker = ref(false)
const submitting = ref(false)
const form = ref({
  indexCode: '000300',
  initialAmount: 1000,
  frequency: '月',
  duration: 36,
  lowPercentile: 30,
  highPercentile: 70,
  lowMultiple: 1.5,
  highMultiple: 0.5
})
const frequencyOptions = [
  { text: '日', value: '日' },
  { text: '周', value: '周' },
  { text: '月', value: '月' }
]
const backtestResult = ref<any>(null)

const onClickLeft = () => {
  router.back()
}

const onFrequencyConfirm = ({ selectedOptions }: any) => {
  form.value.frequency = selectedOptions[0].value
  showFrequencyPicker.value = false
}

const onSubmit = async () => {
  submitting.value = true
  try {
    const response = await api.post('/valuation/backtest', form.value)
    backtestResult.value = response.data.result
    showToast('回测完成')
  } catch (error) {
    console.error('Failed to run backtest:', error)
    showToast('回测失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.valuation-backtest {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 20px;
}

.submit-button {
  padding: 20px;
}

.backtest-result {
  padding: 0 12px;
  margin-top: 12px;
}
</style>
