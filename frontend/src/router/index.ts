import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue')
  },
  {
    path: '/funds',
    name: 'Funds',
    component: () => import('@/views/Funds.vue')
  },
  {
    path: '/funds/:id',
    name: 'FundDetail',
    component: () => import('@/views/FundDetail.vue')
  },
  {
    path: '/valuation',
    name: 'Valuation',
    component: () => import('@/views/Valuation.vue')
  },
  {
    path: '/valuation/ranking',
    name: 'ValuationRanking',
    component: () => import('@/views/ValuationRanking.vue')
  },
  {
    path: '/valuation/backtest',
    name: 'ValuationBacktest',
    component: () => import('@/views/ValuationBacktest.vue')
  },
  {
    path: '/portfolio',
    name: 'Portfolio',
    component: () => import('@/views/Portfolio.vue')
  },
  {
    path: '/portfolio/import',
    name: 'Import',
    component: () => import('@/views/Import.vue')
  },
  {
    path: '/portfolio/simulation',
    name: 'Simulation',
    component: () => import('@/views/Simulation.vue')
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
