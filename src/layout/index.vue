<template>
  <el-container class="layout-wrapper">
    <el-aside :width="isCollapse ? '64px' : '220px'" class="aside-container">
      <div class="aside-content">
        <div class="aside-logo">
          <span v-if="!isCollapse">信创政务系统</span>
          <el-icon class="toggle-icon" @click="isCollapse = !isCollapse">
            <Expand v-if="isCollapse" />
            <Fold v-else />
          </el-icon>
        </div>

        <el-menu
          :default-active="$route.path"
          class="aside-menu"
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409EFF"
          :collapse="isCollapse"
          :collapse-transition="false"
          router
        >
          <el-menu-item v-if="canVisitMenu('dashboard:view')" index="/dashboard">
            <el-icon><HomeFilled /></el-icon>
            <template #title>首页</template>
          </el-menu-item>

          <el-sub-menu v-if="canVisitMenu('project:manage') || canVisitMenu('project:engineering')" index="project">
            <template #title>
              <el-icon><Management /></el-icon>
              <span>工程管理</span>
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
          </el-sub-menu>
        </el-menu>

        <div class="aside-footer">
          <el-dropdown trigger="click" placement="right-end">
            <div class="user-profile-trigger">
              <el-avatar :size="32" icon="UserFilled" />
              <span class="username" v-if="!isCollapse">{{ displayName }}</span>
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
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Expand, Fold, HomeFilled, Management, Setting, SwitchButton, UserFilled } from '@element-plus/icons-vue'
import { useSessionStore } from '../stores/session'

const isCollapse = ref(false)
const router = useRouter()
const sessionStore = useSessionStore()

const displayName = computed(() => sessionStore.userInfo?.realName || sessionStore.userInfo?.username || '管理员')
const canVisitMenu = (menuKey) => sessionStore.hasMenu(menuKey)
const hasSystemMenus = computed(() => sessionStore.hasAnyMenu(['system:user', 'system:dept', 'system:role']))

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出系统吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await sessionStore.logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  })
}
</script>

<style scoped>
.layout-wrapper {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.aside-container {
  background-color: #304156;
  transition: width 0.3s;
  display: flex;
  flex-direction: column;
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
  font-weight: bold;
  background-color: #2b2f3a;
  overflow: hidden;
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
</style>
