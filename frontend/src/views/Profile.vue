<template>
  <div class="profile">
    <van-nav-bar title="我的" />

    <div class="user-info">
      <div class="avatar">
        <van-icon name="user-o" size="48" color="#fff" />
      </div>
      <div v-if="userStore.isAuthenticated" class="user-details">
        <div class="nickname">{{ userStore.userInfo?.nickname || '未设置昵称' }}</div>
        <div class="phone">{{ userStore.userInfo?.phone }}</div>
      </div>
      <div v-else class="guest-info">
        <div class="nickname">访客模式</div>
        <van-button type="primary" size="small" @click="goToLogin" plain>去登录</van-button>
      </div>
    </div>

    <div v-if="userStore.isAuthenticated" class="member-status">
      <van-cell title="会员等级" :value="memberLevelText" />
      <van-cell title="会员到期" :value="expiresAtText" />
    </div>

    <van-cell-group inset title="工具">
      <van-cell title="定投计算器" is-link @click="showToast('功能开发中')" />
      <van-cell title="止盈止损" is-link @click="showToast('功能开发中')" />
      <van-cell title="资讯中心" is-link @click="showToast('功能开发中')" />
    </van-cell-group>

    <van-cell-group inset title="设置">
      <van-cell title="账户设置" is-link @click="showToast('功能开发中')" />
      <van-cell title="关于我们" is-link @click="showToast('功能开发中')" />
      <van-cell title="隐私政策" is-link @click="showToast('功能开发中')" />
    </van-cell-group>

    <div v-if="userStore.isAuthenticated" class="logout-section">
      <van-button block type="danger" @click="logout">退出登录</van-button>
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
import { computed, ref } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const active = ref(3)

const memberLevelText = computed(() => {
  const level = userStore.userInfo?.member_level
  const map: any = {
    0: '普通用户',
    1: '高级会员',
    2: '专业会员'
  }
  return map[level] || '普通用户'
})

const expiresAtText = computed(() => {
  const expires = userStore.userInfo?.member_expires_at
  if (!expires) return '永久有效'
  return new Date(expires).toLocaleDateString('zh-CN')
})

const goToLogin = () => {
  window.location.href = '/login'
}

const logout = async () => {
  try {
    await showConfirmDialog({
      title: '确认退出',
      message: '确定要退出登录吗?'
    })
    userStore.logout()
    showToast('已退出登录')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Logout failed:', error)
    }
  }
}
</script>

<style scoped>
.profile {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 50px;
}

.user-info {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: white;
}

.avatar {
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-details {
  flex: 1;
}

.guest-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nickname {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.phone {
  font-size: 14px;
  opacity: 0.9;
}

.member-status {
  margin: 12px;
}

.logout-section {
  padding: 20px;
}
</style>
