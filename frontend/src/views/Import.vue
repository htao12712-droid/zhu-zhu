<template>
  <div class="import-page">
    <van-nav-bar title="导入基金" left-arrow @click-left="onClickLeft" />

    <div class="content">
      <div class="import-methods">
        <div class="method-card" @click="showCamera = true">
          <div class="method-icon camera">
            <van-icon name="photograph" size="32" color="#fff" />
          </div>
          <h3>AI 拍照识别</h3>
          <p>拍摄基金截图，自动识别基金信息</p>
        </div>

        <div class="method-card" @click="onFileUpload">
          <div class="method-icon upload">
            <van-icon name="photo-o" size="32" color="#fff" />
          </div>
          <h3>上传图片</h3>
          <p>上传基金截图进行识别</p>
        </div>

        <div class="method-card" @click="onCSVUpload">
          <div class="method-icon csv">
            <van-icon name="description" size="32" color="#fff" />
          </div>
          <h3>CSV/Excel 导入</h3>
          <p>导入基金历史交易数据</p>
        </div>

        <div class="method-card" @click="onManualImport">
          <div class="method-icon manual">
            <van-icon name="edit" size="32" color="#fff" />
          </div>
          <h3>手动添加</h3>
          <p>手动输入基金信息</p>
        </div>
      </div>

      <div class="tips">
        <van-notice-bar
          left-icon="info-o"
          text="支持识别支付宝、微信等平台的基金截图和交易记录"
          background="#f0f9ff"
          color="#1989fa"
        />
      </div>
    </div>

    <van-popup v-model:show="showCamera" position="bottom" :style="{ height: '80%' }">
      <div class="camera-container">
        <div class="camera-header">
          <van-button @click="showCamera = false">取消</van-button>
          <h3>拍照识别</h3>
          <van-button type="primary" @click="capturePhoto">拍照</van-button>
        </div>
        <div class="camera-preview">
          <van-icon name="photograph" size="64" color="#ccc" />
          <p>点击下方按钮开始拍照</p>
        </div>
      </div>
    </van-popup>

    <van-dialog v-model:show="showResult" title="识别结果" show-cancel-button @confirm="confirmImport">
      <div class="result-content">
        <van-form v-if="recognizedFund">
          <van-field
            v-model="recognizedFund.fund_name"
            label="基金名称"
            placeholder="请输入基金名称"
          />
          <van-field
            v-model="recognizedFund.fund_code"
            label="基金代码"
            placeholder="请输入基金代码"
          />
          <van-field
            v-model.number="recognizedFund.holding_shares"
            label="持有份额"
            type="number"
            placeholder="请输入持有份额"
          />
          <van-field
            v-model.number="recognizedFund.cost_price"
            label="成本价"
            type="number"
            placeholder="请输入成本价"
          />
        </van-form>
      </div>
    </van-dialog>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleFileChange"
    />

    <input
      ref="csvInput"
      type="file"
      accept=".csv,.xlsx,.xls"
      style="display: none"
      @change="handleCSVChange"
    />

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
import { showToast, showLoadingToast, closeToast } from 'vant'
import api from '@/services/api'

const router = useRouter()
const active = ref(2)
const showCamera = ref(false)
const showResult = ref(false)
const fileInput = ref<HTMLInputElement>()
const csvInput = ref<HTMLInputElement>()
const recognizedFund = ref<any>(null)

const onClickLeft = () => {
  router.back()
}

const capturePhoto = () => {
  showToast('相机功能开发中')
}

const onFileUpload = () => {
  fileInput.value?.click()
}

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  showLoadingToast({
    message: '识别中...',
    forbidClick: true,
    duration: 0
  })

  try {
    const formData = new FormData()
    formData.append('image', file)

    const response = await api.post('/portfolio/recognize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    recognizedFund.value = response.data
    showResult.value = true
  } catch (error) {
    showToast('识别失败，请重试')
  } finally {
    closeToast()
    target.value = ''
  }
}

const onCSVUpload = () => {
  csvInput.value?.click()
}

const handleCSVChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  showLoadingToast({
    message: '导入中...',
    forbidClick: true,
    duration: 0
  })

  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/portfolio/import-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    showToast(`成功导入 ${response.data.count} 条记录`)
    router.push('/portfolio')
  } catch (error) {
    showToast('导入失败，请检查文件格式')
  } finally {
    closeToast()
    target.value = ''
  }
}

const onManualImport = () => {
  router.push('/portfolio')
}

const confirmImport = async () => {
  try {
    await api.post('/portfolio', recognizedFund.value)
    showToast('导入成功')
    showResult.value = false
    router.push('/portfolio')
  } catch (error) {
    showToast('导入失败')
  }
}
</script>

<style scoped>
.import-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 50px;
}

.content {
  padding: 16px;
}

.import-methods {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.method-card {
  background: white;
  border-radius: 16px;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.method-card:active {
  transform: scale(0.98);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.method-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.method-icon.camera {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.method-icon.upload {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.method-icon.csv {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.method-icon.manual {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.method-card h3 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.method-card p {
  margin: 0;
  font-size: 12px;
  color: #999;
  line-height: 1.5;
}

.tips {
  margin-top: 24px;
}

.camera-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.camera-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.camera-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.camera-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.camera-preview p {
  margin-top: 16px;
  color: #999;
  font-size: 14px;
}

.result-content {
  padding: 16px;
}
</style>
