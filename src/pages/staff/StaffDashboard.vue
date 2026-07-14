<script setup>
  import { storeToRefs } from 'pinia'
  import { computed, onMounted, ref } from 'vue'
  import AppShell from '@/components/layout/AppShell.vue'
  import DeadlineAlert from '@/components/staff/DeadlineAlert.vue'
  import PreviousWeekCard from '@/components/staff/PreviousWeekCard.vue'
  import { useAuth } from '@/composables/useAuth'
  import { useWeekLabel } from '@/composables/useWeekLabel'
  import { useWeekMenu } from '@/composables/useWeekMenu'
  import { useMenuStore } from '@/stores/menu.store'
  import { useOrderStore } from '@/stores/orders.store'
  import { getWeekDates, getWeekString, parseLocalDate } from '@/utils/dateHelpers'
  import SkeletonCard from '@/components/shared/SkeletonCard.vue'
  import { useRouter } from 'vue-router'

  // Load composables and stores
  const router = useRouter()
  const { user } = useAuth()
  const orderStore = useOrderStore()
  const menuStore = useMenuStore()
  const { weekRangeLabel, weekDayLabels } = useWeekLabel()
  const { weekDays: menuDays, fetchWeekMenu, DAY_STATUS } = useWeekMenu()

  const isLoading = ref(true)

  // Fetch orders and menus on mount
  onMounted(async () => {
    try {
      const mondayStr = getWeekString(new Date())
      const nextMondayStr = nextWeekStart.value

      // 1. Fetch next week's deadline first so isDeadlinePassed is calculated correctly
      await menuStore.getWeekDeadline(nextMondayStr)

      // 2. Fetch all menu items and user orders in parallel
      await Promise.all([
        orderStore.getMyOrders(user.value.id),
        menuStore.getAllMenuItems(),
      ])

      // 3. Load the menu for either current week or next week based on deadline status
      const targetWeek = isDeadlinePassed.value ? nextMondayStr : mondayStr
      await fetchWeekMenu(targetWeek)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      isLoading.value = false
    }
  })

  // Dynamic Greeting based on time of day
  const greeting = computed(() => {
    const hr = new Date().getHours()
    const name = user.value.name ? user.value.name.split(' ')[0] : 'there'
    if (hr < 12) return `Good morning, ${name}`
    if (hr < 17) return `Good afternoon, ${name}`
    return `Good evening, ${name}`
  })

  // Monday date string for the current week
  const currentWeekStart = computed(() => getWeekString(new Date()))

  const dateSubtitle = computed(() => {
    const options = { weekday: 'long', month: 'short', day: 'numeric' }
    const formattedToday = new Date().toLocaleDateString('en-US', options)

    // Get Mon-Fri range label based on which week we are showing
    const range = weekRangeLabel(weekOffset.value) // e.g. "Jun 8 - Jun 12, 2026"
    // Strip the year for a cleaner look
    const rangeShort = range.split(',')[0]

    return `${formattedToday}; Week of ${rangeShort}`
  })

  // Monday date string for the next week
  const nextWeekStart = computed(() => getWeekString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)))

  // Calculate next week deadline details
  const nextWeekDeadlineIso = computed(() =>
    menuStore.deadlineByWeek(nextWeekStart.value) ?? null,
  )
  const isDeadlinePassed = computed(() => {
    if (!nextWeekDeadlineIso.value) return false
    return new Date() > new Date(nextWeekDeadlineIso.value)
  })

  // Determine display week offset (0 = current week, 1 = next week)
  const weekOffset = computed(() => isDeadlinePassed.value ? 1 : 0)

  // Monday date string of the week to display
  const displayWeekStart = computed(() => isDeadlinePassed.value ? nextWeekStart.value : currentWeekStart.value)

  // Computed title for the selections section
  const sectionTitle = computed(() => {
    return isDeadlinePassed.value ? "Next Week's Confirmed Orders" : "This week's selections"
  })

  // Check if next week's order is fully submitted
  const isNextWeekSubmitted = computed(() => {
    const nextOrders = orderStore.myOrders.filter(
      o => o.weekString === nextWeekStart.value,
    )
    if (nextOrders.length === 0) return false
    return nextOrders.every(o => o.status === 'submitted')
  })

  // Current Week's selections mapped for Mon-Fri
  const thisWeekSummary = computed(() => {
    // Mon-Fri labels: e.g., [{ date: "2026-06-08", label: "Mon" }]
    const labels = weekDayLabels(weekOffset.value)

    return labels.map(day => {
      // Check if day is off/holiday in menu
      const menuDay = menuDays.value.find(d => d.date === day.date)
      const isOff = menuDay?.status === DAY_STATUS.OFF_DAY || menuDay?.status === DAY_STATUS.HOLIDAY

      // Find matching order in DB
      const order = orderStore.myOrders.find(o => o.date === day.date)

      let selectionText = 'Not selected'
      // let style = { border: '1px solid #D2451E', color: '#8C8C8C' }
      let style = { border: '1.5px solid ' + (day.imageUrl ? '#D2451E' : '#E0E0E0') }

      if (isOff) {
        selectionText = 'Off day'
        style = {
          borderColor: '#FFCDD2',
          backgroundColor: '#FFEBEE',
          color: '#C62828',
        }
      } else if (order) {
        const fullItem = menuStore.allMenuItems.find(m => m.id === order.menuItemId)

        return {
          dayName: day.label.split(' ')[0],
          selection: order.menuTitle || 'Selected',
          imageUrl: fullItem?.imageUrl || '',
          description: fullItem?.description || '',
          style: { ...style, borderColor: '#D2451E' },
        }
      }

      return {
        dayName: day.label.split(' ')[0],
        selection: selectionText,
        imageUrl: '',
        description: '',
        style,
      }
    })
  })

  // Historical weeks for "Previous Weeks" summary list
  const previousWeeks = computed(() => {
    const groups = {}
    // Sort orders descending
    const sortedOrders = [...orderStore.myOrders].sort((a, b) => b.date.localeCompare(a.date))
    for (const order of sortedOrders) {
      // 1. If we are showing NEXT week on the main cards (deadline passed):
      //    Show the CURRENT week in the history list (filter out next week and future weeks).
      // 2. If we are showing CURRENT week on the main cards (before deadline):
      //    Filter out both current and next week from the history list.
      if (isDeadlinePassed.value) {
        if (order.weekString === nextWeekStart.value) continue
      } else {
        if (order.weekString === currentWeekStart.value || order.weekString === nextWeekStart.value) continue
      }
      if (!groups[order.weekString]) {
        groups[order.weekString] = []
      }
      groups[order.weekString].push(order)
    }

    return Object.keys(groups).map(weekStart => {
      const orders = groups[weekStart]
      const monday = parseLocalDate(weekStart)
      const friday = parseLocalDate(weekStart)
      friday.setDate(monday.getDate() + 4)

      const options = { month: 'short', day: 'numeric' }
      const startStr = monday.toLocaleDateString('en-US', options)
      const endStr = friday.toLocaleDateString('en-US', { day: 'numeric' })
      const title = `Week of ${startStr} – ${endStr}`

      // Compute stats
      const foodCount = orders.filter(
        o => o.menuItemId !== null && o.status !== 'off' && o.status !== 'off_day',
      ).length
      const offCount = orders.filter(
        o => o.menuItemId === null || o.status === 'off' || o.status === 'off_day',
      ).length

      let subtitle = `${foodCount} day${foodCount === 1 ? '' : 's'} ordered`
      if (offCount > 0) {
        subtitle += ` · ${offCount} off day${offCount === 1 ? '' : 's'}`
      }

      // Status
      const isSubmitted = orders.some(o => o.status === 'submitted')
      const status = isSubmitted ? 'submitted' : 'draft'

      return {
        weekStart,
        title,
        subtitle,
        status,
      }
    }).sort((a, b) => b.weekStart.localeCompare(a.weekStart)) // Newest first
  })

  //Function to only show the last 3 weeks
  const recentPreviousWeeks = computed(() => {
    return previousWeeks.value.slice(0, 3)
  })
</script>

<template>
  <AppShell>
    <div style="max-width: 1400px; margin: 0 auto; padding: 0 16px;">
      <!-- Loading State -->
      <v-row v-if="isLoading">
        <v-col 
          v-for="i in 3" :key="i" 
          cols="12" 
          md="4" 
          sm="12"
        >
          <SkeletonCard />
        </v-col>
      </v-row>

      <div v-else class="mb-10">
        <!-- Greeting Header -->
        <div class="mb-6">
          <h1 class="font-weight-bold text-display-medium" style="color: #1E1E1E;">
            {{ greeting }}
          </h1>

          <div class="font-weight-medium mt-n6">
            {{ dateSubtitle }}
          </div>
        </div>

        <v-divider class="border-opacity-25 my-6" />

        <!-- Section 1: Dynamic Selections -->

        <div class="mb-8">
          <h2 class="font-weight-bold mb-4">
            {{ sectionTitle }}
          </h2>

          <v-row class="ma-0 ga-3 d-flex flex-wrap justify-space-between">
            <v-col
              v-for="day in thisWeekSummary"
              :key="day.dayName"
              class="pa-0 flex-grow-1 d-flex flex-column"
              cols="12"
              md="2"
              sm="5"
            >
              <v-card
                class="pa-0 rounded-lg overflow-hidden flex-grow-1 d-flex flex-column"
                elevation="0"
                :style="day.style"
              >
                <!-- Food Image (top portion) -->
                <v-img
                  v-if="day.imageUrl"
                  class="flex-shrink-0 clickable-image"
                  cover
                  height="200"
                  :src="day.imageUrl"
                  loading="lazy"
                  @click="router.push('/weekly-overview')"
                >
                  <template #error>
                    <div class="d-flex align-center justify-center" style="height: 200px; background-color: #F5F2EC;">
                      <v-icon color="#D2451E" size="80">mdi-food</v-icon>
                    </div>
                  </template>
                </v-img>

                <div
                  v-else
                  class="d-flex align-center justify-center flex-shrink-0 clickable-image"
                  style="height: 200px; background-color: #F5F2EC;"
                  @click="router.push('/weekly-overview')"
                >
                  <v-icon color="#D2451E" size="80">mdi-food</v-icon>
                </div>

                <!-- Card Content (Stretches to fill remaining space) -->
                <div class="pa-3 d-flex flex-column flex-grow-1">
                  <div class="font-weight-bold mb-1" style="color: #1E1E1E; font-size: 20px;">
                    {{ day.dayName }}
                  </div>

                  <div class="font-weight-bold text-truncate mb-1" style="color: #1E1E1E; font-size: 20px;">
                    {{ day.selection }}
                  </div>

                  <div
                    v-if="day.description"
                    class="font-weight-medium mb-1 text-grey-darken-2"
                  >
                    {{ day.description }}
                  </div>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <v-divider class="border-opacity-25 my-6" />

        <!-- Deadline Notification Banner -->
        <DeadlineAlert
          v-if="!isNextWeekSubmitted && nextWeekDeadlineIso"
          :deadline-iso="nextWeekDeadlineIso"
          to="/weekly-overview"
        />

        <v-divider class="border-opacity-25 my-6" />

        <!-- Section 2: Recent Order History -->
        <div>
          <div class="d-flex flex-column flex-sm-row justify-space-between align-sm-center ga-3 mb-4">
            <h2 class="font-weight-bold mb-4" style="color: #1E1E1E;">
              Recent Order History
            </h2>

            <v-btn
              color="#D2451E"
              prepend-icon="mdi-history"
              variant="flat"
              class="text-capitalize font-weight-bold px-8 py-5"
              @click="router.push('/my-order-history')"
            >
             View All History
            </v-btn>
          </div>

          <div v-if="recentPreviousWeeks.length > 0">
            <PreviousWeekCard
              v-for="week in recentPreviousWeeks"
              :key="week.weekStart"
              :status="week.status"
              :subtitle="week.subtitle"
              :title="week.title"
            />
          </div>

          <!-- Empty State -->
          <v-card
            v-else
            class="pa-8 rounded-lg text-center"
            style="border: 1px dashed #BDBDBD;"
            variant="flat"
          >
            <v-icon class="mb-3" color="#1E1E1E" size="48">
              mdi-history
            </v-icon>

            <div class="font-weight-medium" style="color: #1E1E1E; font-size: 20px;">
              No recent order history found.
            </div>
          </v-card>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<style scoped> 
.clickable-image {
  cursor: pointer;
  transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
}
.clickable-image:hover {
  opacity: 0.9;
  transform: scale(1.10);
}
</style>
