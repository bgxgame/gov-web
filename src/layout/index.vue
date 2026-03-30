<template>
    <el-container class="layout-shell">
      <el-aside :width="isCollapse ? '64px' : '220px'" class="aside-container">
      <div class="aside-content">
        <div class="aside-logo">
          <span v-if="!isCollapse" class="logo-title">信创政务管理系统</span>
          <el-icon class="toggle-icon" @click="isCollapse = !isCollapse">
            <Expand v-if="isCollapse" />
            <Fold v-else />
          </el-icon>
        </div>

        <el-menu
          :default-active="activeMenuPath"
          class="aside-menu"
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409EFF"
          :collapse="isCollapse"
          :collapse-transition="false"
          :unique-opened="true"
          @select="handleMenuSelect"
        >
          <el-menu-item v-if="canVisitMenu('dashboard:view')" index="/dashboard">
            <el-icon><HomeFilled /></el-icon>
            <template #title>首页</template>
          </el-menu-item>

          <el-sub-menu v-if="canVisitMenu('project:manage') || canVisitMenu('project:engineering')" index="project">
            <template #title>
              <el-icon><Management /></el-icon>
              <span>项目管理</span>
            </template>
            <el-menu-item v-if="canVisitMenu('project:manage')" index="/project/manage">项目管理</el-menu-item>
            <el-menu-item v-if="canVisitMenu('project:engineering')" index="/project/engineering">工程进度</el-menu-item>
          </el-sub-menu>

          <el-sub-menu v-if="hasSystemMenus" index="settings">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>系统设置</span>
            </template>
            <el-menu-item v-if="canVisitMenu('system:user')" index="/system/user">用户管理</el-menu-item>
            <el-menu-item v-if="canVisitMenu('system:dept')" index="/system/dept">部门管理</el-menu-item>
            <el-menu-item v-if="canVisitMenu('system:role')" index="/system/role">角色管理</el-menu-item>
            <el-menu-item v-if="canVisitMenu('system:audit')" index="/system/audit">审计日志</el-menu-item>
            <el-menu-item v-if="canVisitMenu('system:frontend-monitor')" index="/system/frontend-monitor">前端监控</el-menu-item>
          </el-sub-menu>
        </el-menu>

        <div class="aside-footer">
          <el-dropdown trigger="click" placement="right-end">
            <div class="user-profile-trigger">
              <el-avatar :size="32" icon="UserFilled" />
              <span v-if="!isCollapse" class="username">{{ displayName }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  <span>退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-aside>

    <el-main class="main-container">
      <router-view v-slot="{ Component, route }">
        <keep-alive :include="cachedViewNames">
          <component
            v-if="Component && shouldKeepAliveRoute(route)"
            :is="Component"
            :key="route.name || route.path"
          />
        </keep-alive>
        <component
          :is="Component"
          v-if="Component && !shouldKeepAliveRoute(route)"
          :key="route.fullPath"
        />
      </router-view>
    </el-main>
  </el-container>

  <el-dialog
    v-model="logoutDialogVisible"
    title="退出登录"
    width="420px"
    :close-on-click-modal="false"
    append-to-body
  >
    <div class="logout-tip">确认退出当前账号吗？</div>
    <template #footer>
      <el-button @click="logoutDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmLogout">确定退出</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Expand, Fold, HomeFilled, Management, Setting, SwitchButton } from '@element-plus/icons-vue'
import { useSessionStore } from '../stores/session'
import { showSuccess } from '../utils/feedback'
import { logUserAction, logger } from '../utils/logger'
import { nowMs, reportPerfDuration } from '../utils/perf-metrics'
import { resolveMenuTargetPath } from '../utils/menu-navigation'
import { CACHEABLE_VIEW_NAMES, shouldKeepAliveRoute } from '../utils/router-cache'

/**
 * 职责：承载系统主布局，统一处理侧边菜单、页面缓存和退出登录交互。
 * 为什么存在：避免每个业务页重复维护菜单权限、布局结构和会话操作入口。
 * 关键输入输出：输入为当前路由、当前用户菜单权限和缓存策略；输出为侧边导航与主内容区。
 * 关联链路：登录成功 -> 主布局 -> 菜单切换 -> 页面缓存复用。
 */
const isCollapse = ref(false)
const logoutDialogVisible = ref(false)
const navigatingPath = ref('')
const router = useRouter()
const route = useRoute()
const sessionStore = useSessionStore()

const cachedViewNames = CACHEABLE_VIEW_NAMES
const activeMenuPath = computed(() => route.path)
const displayName = computed(() => sessionStore.userInfo?.realName || sessionStore.userInfo?.username || '管理员')
const hasSystemMenus = computed(() =>
  sessionStore.hasAnyMenu(['system:user', 'system:dept', 'system:role', 'system:audit', 'system:frontend-monitor'])
)

function canVisitMenu(menuKey) {
  return sessionStore.hasMenu(menuKey)
}

/**
 * 作用：统一处理菜单跳转，跳过重复导航，避免快速点击时产生无意义的路由切换。
 */
async function handleMenuSelect(index) {
  const targetPath = resolveMenuTargetPath(index)
  const isRoutePath = Boolean(targetPath)

  if (!targetPath || !isRoutePath || route.path === targetPath || navigatingPath.value === targetPath) {
    logUserAction('menu_skip', {
      currentPath: route.path,
      targetPath,
      reason: !targetPath
        ? 'empty_target'
        : !isRoutePath
          ? 'non_route_index'
          : route.path === targetPath
            ? 'same_route'
            : 'navigation_pending'
    }, 'debug')
    return
  }

  const navigateStartAt = nowMs()
  const fromPath = route.path
  logUserAction('menu_select', {
    fromPath,
    targetPath
  })
  navigatingPath.value = targetPath
  try {
    await router.push(targetPath)
    logUserAction('menu_select_success', {
      fromPath,
      targetPath
    }, 'debug')
    reportPerfDuration('menu_navigation', navigateStartAt, {
      fromPath,
      targetPath,
      success: true
    }, {
      thresholdMs: 300,
      normalLevel: 'info'
    })
  } catch (error) {
    logger.warn('菜单跳转失败', {
      fromPath,
      targetPath,
      message: error?.message
    })
    reportPerfDuration('menu_navigation', navigateStartAt, {
      fromPath,
      targetPath,
      success: false,
      message: error?.message
    }, {
      thresholdMs: 300,
      normalLevel: 'info'
    })
  } finally {
    if (navigatingPath.value === targetPath) {
      navigatingPath.value = ''
    }
  }
}

/**
 * 作用：先打开确认框，再执行真正的退出动作，避免误触退出。
 */
function handleLogout() {
  logUserAction('logout_dialog_open', {
    currentPath: route.path
  }, 'debug')
  logoutDialogVisible.value = true
}

/**
 * 作用：退出时清理本地会话并使用 replace 回到登录页，避免后退回到受保护页面。
 */
async function confirmLogout() {
  logUserAction('logout_confirm', {
    currentPath: route.path
  })
  await sessionStore.logout()
  logoutDialogVisible.value = false
  showSuccess('已退出登录')
  await router.replace('/login')
}
</script>

<style scoped>
.layout-wrapper {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.layout-shell {
  height: 100%;
  width: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
}

.aside-container {
  background-color: #304156;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.aside-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.aside-logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  color: #fff;
  font-weight: 700;
  background-color: #2b2f3a;
  overflow: hidden;
}

.logo-title {
  letter-spacing: 1px;
}

.toggle-icon {
  cursor: pointer;
  font-size: 20px;
  color: #bfcbd9;
}

.toggle-icon:hover {
  color: #fff;
}

.aside-menu {
  flex: 1;
  border-right: none;
}

.aside-footer {
  border-top: 1px solid #3d4d66;
  padding: 15px 0;
  background-color: #2b2f3a;
  display: flex;
  justify-content: center;
}

.user-profile-trigger {
  display: flex;
  align-items: center;
  padding: 5px 15px;
  cursor: pointer;
  color: #fff;
  border-radius: 4px;
  transition: background 0.3s;
}

.user-profile-trigger:hover {
  background-color: #3d4d66;
}

.username {
  margin-left: 10px;
  font-size: 14px;
}

.main-container {
  padding: 0;
  background-color: #f0f2f5;
  position: relative;
  height: 100vh;
  overflow: hidden;
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logout-tip {
  font-size: 14px;
  color: #303133;
}
</style>
