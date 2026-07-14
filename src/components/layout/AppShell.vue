<script setup>
  import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import { useAuthStore } from '../../stores/auth.store.js'
  import { useMenuStore } from '../../stores/menu.store.js'
  import HrNav from './HrNav.vue'
  import StaffNav from './StaffNav.vue'
  const { mobile } = useDisplay()

  const authStore = useAuthStore()
  const menuStore = useMenuStore()
  const router = useRouter()
  const route = useRoute()

  // Drawer open/close state for mobile
  const drawer = ref(false)

  // Use the connected token to validate authentication
  onMounted(() => {
    if(authStore.isAuthenticated){
      menuStore.connectWebSocket()
    }
  })

  // Diconnect token mount before connecting or after logout
  onBeforeUnmount(() => {
    menuStore.disconnectWebSocket()
  })

  // Close the navigation drawer automatically when navigation occurs
  watch(() => route.path, () => {
    drawer.value = false
  })

  // Read the role directly from the store, with path-based fallback for testing
  const role = computed(() => {
    if (authStore.isAuthenticated && authStore.userInfo?.role) {
      return authStore.userInfo.role
    }
    // Fallback: Infer role based on current route path
    const path = router.currentRoute.value.path
    if (path.includes('/hr-') || path.includes('/menu-') || path.includes('/order-') || path.includes('/off-days')) {
      return 'hr'
    }

    return 'staff'
  })

  function logout () {
    authStore.logout()
    router.push({ path: '/login' })
  }

</script>

<template>
  <v-row class="fill-height">

    <!-- NAV-BAR FOR TABLET AND DESKTOP -->
    <v-navigation-drawer
      v-if="!mobile"
      color="#D2451E"
      expand-on-hover
      permanent
      rail
      width="280"
    >

      <v-list>
        <v-list-item>
          <template #prepend>
            <v-icon size="27">mdi-food-fork-drink</v-icon>
          </template>

          <span class="font-weight-bold text-title-large">FoodHub</span>
        </v-list-item>
      </v-list>

      <v-divider class="border-opacity-25" color="white" />

      <!-- Role-based nav -->
      <HrNav v-if="role === 'hr'" />
      <StaffNav v-else-if="role === 'staff'" />
    </v-navigation-drawer>

    <!-- NAV-BAR FOR MOBILE -->
    <v-app-bar v-if="mobile" color="#D2451E" flat height="80">
      <template #prepend>
        <v-btn
          :icon="drawer ? 'mdi-close' : 'mdi-menu'"
          size="55"
          variant="text"
          @click="drawer = !drawer"
        />
      </template>

      <v-app-bar-title class="font-weight-bold text-white text-center">
        <div>
          <v-avatar class="mr-3" color="#F9ECEE" rounded="lg" size="43">
            <v-icon color="#D2451E" size="35">mdi-food-fork-drink</v-icon>
          </v-avatar>

          <span class="font-weight-bold text-title-large">FoodHub</span>
        </div>
      </v-app-bar-title>
    </v-app-bar>

    <!-- NAV-BAR FOR MOBILE -->
    <v-navigation-drawer
      v-if="mobile"
      v-model="drawer"
      color="#D2451E"
      temporary
      width="280"
    >

      <v-divider class="border-opacity-25" color="white" />

      <!-- Role-based nav -->
      <HrNav v-if="role === 'hr'" />
      <StaffNav v-else-if="role === 'staff'" />
    </v-navigation-drawer>

    <!-- Page content renders here -->
    <v-main color="#white" style="min-height: 100vh;">
      <div class="pa-2">
        <slot />
      </div>
    </v-main>

  </v-row>
</template>

<style scoped>

</style>
