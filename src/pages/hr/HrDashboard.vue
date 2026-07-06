<script setup>
  import { storeToRefs } from 'pinia'
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import AppShell from '@/components/layout/AppShell.vue'
  import DayMenuCard from '@/components/menu/DayMenuCard.vue'
  import WeekPicker from '@/components/shared/WeekPicker.vue'
  import { useSnackbar } from '@/composables/useSnackbar.js'
  import { useWeekMenu } from '@/composables/useWeekMenu.js'
  import { useMenuStore } from '@/stores/menu.store.js'
  import { useOrderStore } from '@/stores/orders.store.js'
  import { useStaffStore } from '@/stores/staff.store.js'
  import { getWeekDates, getWeekString } from '@/utils/dateHelpers.js'
  import SkeletonCard from '../../components/shared/SkeletonCard.vue'

  const router = useRouter()

  // Initialize stores
  const staffStore = useStaffStore()
  const orderStore = useOrderStore()
  const menuStore = useMenuStore()

  // Get reactive state from stores
  const { allStaff } = storeToRefs(staffStore)
  const { allOrders } = storeToRefs(orderStore)
  const deadlineDate = ref('')
  const deadlineTime = ref('09:00')
  const showDeadlineMenu = ref(false)
  const { success: snackSuccess, error: snackError } = useSnackbar()

  // Week offset state (0 = current week)
  const weekOffset = ref(1)

  // Dynamic page title based on week offset
  const pageTitle = computed(() => {
    if (weekOffset.value === 0) return 'This week'
    if (weekOffset.value === 1) return 'Next week'
    return 'Week Overview'
  })

  // Computed: current deadline for the visible week
  const currentWeekString = computed(() => getWeekString(getWeekDates(weekOffset.value)[0]))

  const savedDeadline = computed(() =>
    menuStore.deadlineByWeek(currentWeekString.value),
  )

  // Save handler
  async function saveDeadline () {
    if (!deadlineDate.value || !deadlineTime.value) return

    const ok = await menuStore.setWeekDeadline(
      currentWeekString.value,
      `${deadlineDate.value}T${deadlineTime.value}:00`,
    )

    if (ok) {
      snackSuccess('Ordering deadline saved')
      showDeadlineMenu.value = false
    } else {
      snackError('Failed to save deadline')
    }
  }

  // Pre-fill the picker fields when HR re-opens the deadline menu
  watch(showDeadlineMenu, (isOpen) => {
    if (isOpen && savedDeadline.value) {
      const d = new Date(savedDeadline.value)
      const year  = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day   = String(d.getDate()).padStart(2, '0')
      deadlineDate.value = `${year}-${month}-${day}`
      deadlineTime.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
  })

  // Use the composable to fetch menu data
  const { weekMenu, weekDays, isLoading, fetchWeekMenu } = useWeekMenu()

  // Fetch all data on mount
  onMounted(async () => {
    // Fetch menu for next week FIRST
    const weekStartDate = getWeekString(getWeekDates(1)[0])

    // Fetch all data in parallel
    await Promise.all([
      fetchWeekMenu(weekStartDate),
      staffStore.getAllStaff(),
      orderStore.getAllOrders(),
    ])
  })

  // Watch for week changes
  function handleWeekChange (newOffset) {
    weekOffset.value = newOffset

    // Calculate the new week's Monday
    const dates = getWeekDates(newOffset)
    const mondayDate = getWeekString(dates[0])

    fetchWeekMenu(mondayDate)
  }

  // Get the dates for the current week for display
  const weekDates = computed(() => {
    return getWeekDates(weekOffset.value)
  })

  // Stats computed from real data
  const stats = computed(() => {
    // Count off days from the week data
    const offDaysCount = weekDays.value.filter(
      d => d.status === 'off_day' || d.status === 'holiday',
    ).length

    // Get current week string for filtering orders
    const currentWeekString = getWeekString(getWeekDates(weekOffset.value)[0])

    // Filter orders for current week
    const currentWeekOrders = allOrders.value.filter(order => {
      // If your orders have weekString property, use it
      if (order.weekString) {
        return order.weekString === currentWeekString
      }
      // Otherwise, return all for now
      return true
    })

    // Count submitted orders
    const submittedOrders = currentWeekOrders.filter(
      o => o.status?.toLowerCase() === 'submitted',
    ).length

    // Count pending/draft orders
    const pendingOrders = currentWeekOrders.filter(
      o => o.status?.toLowerCase() === 'draft' || o.status?.toLowerCase() === 'pending',
    ).length

    return [
      { title: 'Staff ordering', count: allStaff.value.length },
      { title: 'Orders submitted', count: submittedOrders },
      { title: 'Pending', count: pendingOrders },
      { title: 'Off days this week', count: offDaysCount },
    ]
  })

  // Format day cards data
  const dayCards = computed(() => {
    return weekDates.value.map((date, index) => {
      // Day names
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

      // Format date as "Jun 9"
      const options = { month: 'short', day: 'numeric' }
      const formattedDate = date.toLocaleDateString('en-US', options)

      // Get the YYYY-MM-DD format
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`

      // Find menu data for this date
      const dayData = weekDays.value.find(d => d.date === dateString)
      const menuItems = weekMenu.value.filter(item => item.date === dateString)

      // Count orders for this specific date
      const ordersForDay = allOrders.value.filter(order => {
        if (order.date) {
          return order.date === dateString
        }
        return false
      })

      return {
        day: dayNames[index],
        date: formattedDate,
        dateString: dateString,
        items: menuItems || [],
        status: dayData?.status?.toLowerCase() || 'open',
        orderedCount: ordersForDay.length,
        totalStaff: allStaff.value.length,
      }
    })
  })

  // Helper function inline or reuse formatDate from dateHelpers
  const weekMin = computed(() => {
    const d = getWeekDates(0)[0]
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  const weekMax = computed(() => {
    const d = getWeekDates(0)[4]
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  // Navigate to add item (menu manager page)
  function handleAddItem (data) {
    router.push({
      name: 'MenuManager',
      query: { date: data.dateString }, // Query parameter
    })
  }
</script>

<template>
  <AppShell>
    <div style="max-width: 1400px; margin: 0 auto; padding: 0px 16px;">
      <!-- Page Header -->
      <v-row class="d-flex mb-4 align-center justify-space-between">
        <v-col class="d-flex justify-start" cols="12" sm="6">
          <h1
            class="font-weight-bold text-display-medium"
            style="letter-spacing: 0.5px; color: #D2451E !important;"
          >
            {{ pageTitle }}
          </h1>
        </v-col>

        <v-col class="d-flex justify-sm-end" cols="12" sm="6">
          <WeekPicker
            :model-value="weekOffset"
            @update:model-value="handleWeekChange"
          />
        </v-col>
      </v-row>

      <!-- Stats Cards Row -->
      <v-row class="mb-6">
        <v-col
          v-for="(stat, i) in stats"
          :key="i"
          cols="12"
          md="3"
          sm="6"
        >
          <v-card
            class="pa-5 border-0"
            color="white"
            elevation="0"
            style="border: 1px solid #D2451E !important;"
          >
            <div class="font-weight-medium mb-1" style="font-size: 20px;">
              {{ stat.title }}
            </div>

            <div class="font-weight-medium" style="font-size: 45px; color: #1E1E1E;">
              {{ stat.count }}
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Deadline Setter Panel -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card
            class="pa-5"
            elevation="0"
            style="border: 1px solid #D2451E !important;"
          >
            <div class="d-flex align-center justify-space-between flex-wrap ga-4">

              <!-- Left: label + current deadline display -->
              <div>
                <div class="font-weight-medium mb-1" style="font-size: 20px; color: #1E1E1E;">
                  Deadline for next week's orders
                </div>

                <div v-if="savedDeadline" class="d-flex align-center ga-2">
                  <v-icon color="#D2451E" size="18">mdi-clock-outline</v-icon>

                  <span style="font-size: 16px; color: #1E1E1E;">
                    {{ new Date(savedDeadline).toLocaleString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })
                    }}
                  </span>
                </div>

                <div v-else style="font-size: 16px; color: #1E1E1E;">
                  No deadline set for next week — staff can order any time
                </div>
              </div>

              <!-- Right: picker + save button inside a v-menu -->
              <v-menu v-model="showDeadlineMenu" :close-on-content-click="false">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    class="text-capitalize font-weight-bold px-8 py-6"
                    color="#D2451E"
                    prepend-icon="mdi-calendar-clock"
                    variant="flat"
                  >
                    {{ savedDeadline ? 'Change deadline' : 'Set ordering deadline' }}
                  </v-btn>
                </template>

                <v-card class="pa-4" elevation="4" min-width="320">
                  <div class="font-weight-bold mb-4" style="font-size: 16px;">
                    Set ordering deadline
                  </div>

                  <!-- Date input -->
                  <v-text-field
                    v-model="deadlineDate"
                    class="mb-3"
                    density="compact"
                    label="Deadline date"
                    :max="weekMax"
                    :min="weekMin"
                    type="date"
                    variant="outlined"
                  />

                  <!-- Time input -->
                  <v-text-field
                    v-model="deadlineTime"
                    class="mb-4"
                    density="compact"
                    label="Deadline time"
                    type="time"
                    variant="outlined"
                  />

                  <div class="d-flex justify-end ga-2">
                    <v-btn
                      variant="text"
                      @click="showDeadlineMenu = false"
                    >
                      Cancel
                    </v-btn>

                    <v-btn
                      color="#D2451E"
                      :disabled="!deadlineDate || !deadlineTime || isLoading"
                      variant="flat"
                      @click="saveDeadline"
                    >
                      Save
                    </v-btn>
                  </div>
                </v-card>
              </v-menu>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Loading State -->
      <v-row v-if="isLoading">
        <v-col
          v-for="i in 3"
          :key="i"
          cols="12"
          md="4"
          sm="12"
        >
          <SkeletonCard />
        </v-col>
      </v-row>

      <!-- Weekly Menu Grid -->
      <v-row v-else>
        <v-col
          v-for="card in dayCards"
          :key="card.dateString"
          cols="12"
          md="4"
          sm="12"
        >
          <DayMenuCard
            :can-edit="true"
            :date="card.date"
            :date-string="card.dateString"
            :day="card.day"
            :items="card.items"
            :ordered-count="card.orderedCount"
            :status="card.status"
            :total-staff="card.totalStaff"
            @add-item="handleAddItem"
          />
        </v-col>
      </v-row>

      <!-- Empty State (if no menu data) -->
      <v-row v-if="!isLoading && dayCards.length === 0" class="mt-8">
        <v-col class="text-center py-12" cols="12">
          <v-icon color="grey-lighten-1" size="64">
            mdi-calendar-blank
          </v-icon>

          <div class="text-h6 text-grey-darken-1 mt-4">
            No menu data available for this week
          </div>

          <v-btn
            class="mt-4"
            color="#D2451E"
            variant="flat"
            @click="router.push({ name: 'MenuManager' })"
          >
            Create Menu
          </v-btn>
        </v-col>
      </v-row>
    </div>
  </AppShell>
</template>

<style scoped>

</style>
