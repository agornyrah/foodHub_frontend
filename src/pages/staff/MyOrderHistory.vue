<script setup>
  import { computed, onMounted, ref, onUnmounted } from 'vue'
  import { useRouter } from 'vue-router'
  import AppShell from '@/components/layout/AppShell.vue'
  import ReviewDialog from '@/components/shared/ReviewDialog.vue'
  import { useAuth } from '@/composables/useAuth'
  import { useMenuStore } from '@/stores/menu.store'
  import { useOrderStore } from '@/stores/orders.store'
  import { getWeekString, parseLocalDate } from '@/utils/dateHelpers'
  import { useSnackbar } from '@/composables/useSnackbar'
  import SkeletonCard from '@/components/shared/SkeletonCard.vue'

  // Load auth, order store, and menu store
  const router = useRouter()
  const { user } = useAuth()
  const orderStore = useOrderStore()
  const menuStore = useMenuStore()
  const { success: snackSuccess, error: snackError } = useSnackbar()

  const isLoading = ref(true)
  const search = ref('')
  const selectedMonth = ref('All Months')
  let pollTimer = null   // ← polling interval for deadline refresh (60s)

  const headers = [
    { title: 'Week Date', key: 'title', sortable: false, width: '250px' },
    { title: 'Mon', key: 'day_0', sortable: false, align: 'center', width: '150px' },
    { title: 'Tue', key: 'day_1', sortable: false, align: 'center', width: '150px' },
    { title: 'Wed', key: 'day_2', sortable: false, align: 'center', width: '150px' },
    { title: 'Thu', key: 'day_3', sortable: false, align: 'center', width: '150px' },
    { title: 'Fri', key: 'day_4', sortable: false, align: 'center', width: '150px' },
    { title: 'Status', key: 'status', sortable: false, align: 'center', width: '50px' },
  ]

  // Smart back button fallback helper
  function goBack() {
    if (window.history.state && window.history.state.back) {
      router.back()
    } else {
      router.push('/staff-dashboard')
    }
  }

  // Fetch all orders and menu configurations on mount
  onMounted(async () => {
    try {
      await Promise.all([
        orderStore.getMyOrders(user.value.id),
        menuStore.getAllMenuItems(),
      ])

      // Check and auto-update expired orders
      await checkAndUpdateExpiredOrders()

      // Refetch to get updated data
      await orderStore.getMyOrders(user.value.id)

      // Poll deadline changes from HR every 60 seconds
      // 60_000 = 60 seconds. Change this value to adjust the interval.
      pollTimer = setInterval(async () => {
        const weekStrings = [...new Set(orderStore.myOrders.map(o => o.weekString))]
        for (const weekString of weekStrings) {
          const prevDeadline = menuStore.deadlineByWeek(weekString)
          const wasPassed    = prevDeadline ? new Date() > new Date(prevDeadline) : false

          await menuStore.getWeekDeadline(weekString)

          const newDeadline = menuStore.deadlineByWeek(weekString)
          const nowPassed   = newDeadline ? new Date() > new Date(newDeadline) : false

          // If deadline flipped from past → future, revert auto-submitted orders
          if (wasPassed && !nowPassed) {
            await revertOrdersForWeek(weekString)
          }
        }
      }, 60_000)
    } catch (error) {
      console.error('Failed to load history data:', error)
    } finally {
      isLoading.value = false
    }
  })

  // Review Dialog Logic
  const showReviewDialog = ref(false)
  const selectedOrderToReview = ref(null)

  function openReview (order) {
    if (!order) return
    selectedOrderToReview.value = order
    showReviewDialog.value = true
  }

  async function handleReviewSubmit (review) {
    try {
      const success = await orderStore.updateOrder(review.id, {
        rating: review.rating,
        comment: review.comment,
      })

      if (success) {
        snackSuccess('Review submitted successfully')
        // Re-fetch the user's personal orders to update the UI instantly
        await orderStore.getMyOrders(user.value.id)

        // Update the selected order ref with fresh data
        const updatedOrder = orderStore.myOrders.find(o => o.id === review.id)
        if (updatedOrder) {
          selectedOrderToReview.value = updatedOrder
          showReviewDialog.value = false // Close dialog ONLY after successful API update
        }
        else{
          snackError('Failed to submit review')
        }
      }
    } catch (error) {
      console.error('Failed to submit review', error)
      snackError('Failed to submit review')
    }
  }

  // Auto-update orders to "submitted" when deadline passes
  async function checkAndUpdateExpiredOrders () {
    // Get all unique week strings from myOrders
    const weekStrings = [...new Set(orderStore.myOrders.map(o => o.weekString))]

    for (const weekString of weekStrings) {
      // 1. Fetch deadline from backend/mock so it's loaded in memory
      await menuStore.getWeekDeadline(weekString)

      // Get deadline for this week
      const weekDeadline = menuStore.deadlineByWeek(weekString)
      if (!weekDeadline) continue

      // Check if deadline has passed
      const isDeadlinePassed = new Date() > new Date(weekDeadline)
      if (!isDeadlinePassed) continue

      // 2. Find all orders for this week that are still "pending" OR "draft"
      const ordersToUpdate = orderStore.myOrders.filter(
        o => o.weekString === weekString && (o.status === 'pending' || o.status === 'draft'),
      )

      // Update each pending/draft order to "submitted"
      for (const order of ordersToUpdate) {
        await orderStore.updateOrder(order.id, {
          ...order,
          status: 'submitted',
        })
      }
    }
  }

  // Counterpart to checkAndUpdateExpiredOrders:
  // When HR extends a passed deadline, revert submitted orders back to 'pending'
  async function revertOrdersForWeek (weekString) {
    const ordersToRevert = orderStore.myOrders.filter(
      o => o.weekString === weekString && o.status === 'submitted',
    )
    for (const order of ordersToRevert) {
      await orderStore.updateOrder(order.id, { ...order, status: 'pending' })
    }
    await orderStore.getMyOrders(user.value.id)
  }

  // Group and format order weeks for listing
  const historyWeeks = computed(() => {
    const groups = {}

    // Group myOrders by weekStart Monday string
    for (const order of orderStore.myOrders) {
      if (!groups[order.weekString]) {
        groups[order.weekString] = []
      }
      groups[order.weekString].push(order)
    }

    // Ensure the current week is represented even if the user hasn't made selections yet
    const currentWeek = getWeekString(new Date())
    if (!groups[currentWeek]) {
      groups[currentWeek] = []
    }

    return Object.keys(groups).map(weekStart => {
      const orders = groups[weekStart]
      const monday = parseLocalDate(weekStart)

      // Format Mon-Fri range label: e.g., "Week of Jun 9 – 13, 2025"
      const mondayObj = new Date(monday)
      const fridayObj = new Date(monday)
      fridayObj.setDate(mondayObj.getDate() + 4)

      const options = { month: 'short', day: 'numeric', year: 'numeric' }
      const startStr = mondayObj.toLocaleDateString('en-US', options)
      const endStr = fridayObj.toLocaleDateString('en-US', options)
      const title = `Week of ${startStr} – ${endStr}`

      // Generate dates for Mon-Fri
      const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
      const days = []
      let foodCount = 0
      let offCount = 0

      for (let i = 0; i < 5; i++) {
        const currentDate = new Date(monday)
        currentDate.setDate(monday.getDate() + i)

        const year = currentDate.getFullYear()
        const month = String(currentDate.getMonth() + 1).padStart(2, '0')
        const day = String(currentDate.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`

        // Look up order in database for this day
        const order = orders.find(o => o.date === dateStr)

        // Cross-reference menu to check if it's an off day or holiday
        const menuItems = menuStore.allMenuItems.filter(item => item.date === dateStr)
        const isMenuOff = menuItems.some(item => item.status === 'off_day' || item.status === 'holiday')

        let selection = null
        let status = 'open'

        if (isMenuOff) {
          status = 'off_day'
          offCount++
        } else if (order) {
          if (order.status === 'off' || order.status === 'off_day') {
            status = 'off_day'
            offCount++
          } else {
            selection = order.menuTitle
            status = order.status
            foodCount++
          }
        }

        days.push({
          label: dayLabels[i],
          selection,
          status,
          order: order || null,
        })
      }

      // Overall status of the week card
      const isCurrent = weekStart === currentWeek
      const isFuture = weekStart > currentWeek
      const isSubmitted = orders.length > 0 && orders.every(o => o.status === 'submitted')

      // Check if deadline has passed for this week
      const weekDeadline = menuStore.deadlineByWeek(weekStart)
      const isDeadlinePassed = weekDeadline ? new Date() > new Date(weekDeadline) : false

      // Determine week status
      let weekStatus = 'submitted' // Past weeks always default to submitted

      if (isFuture) {
        // Future weeks (e.g. next week): only submitted if ALL orders are actually submitted
        // Draft/pending orders = still in progress
        weekStatus = isSubmitted ? 'submitted' : 'in_progress'
      } else if (isCurrent) {
        // Current week: in the new cycle staff order for NEXT week, so current week
        // is effectively closed. Show submitted unless explicitly still pending.
        if (isDeadlinePassed || orders.length === 0 || isSubmitted) {
          weekStatus = 'submitted'
        } else {
          weekStatus = 'in_progress'
        }
      }
      // Past weeks: always 'submitted' (default set above)

      // Subtitle text
      let subtitle = ''
      if (isCurrent) {
        subtitle += isDeadlinePassed ? 'Deadline passed · ' : 'Current week · '
      }

      const maxActiveDays = 5 - offCount
      subtitle += foodCount === maxActiveDays && foodCount > 0 ? `${foodCount} day${foodCount === 1 ? '' : 's'} · all ordered` : `${foodCount} selection${foodCount === 1 ? '' : 's'} made`

      if (offCount > 0) {
        subtitle += ` · ${offCount} off day${offCount === 1 ? '' : 's'}`
      }

      return {
        weekStart,
        title,
        subtitle,
        status: weekStatus,
        days,
        highlight: isCurrent,
      }
    }).sort((a, b) => b.weekStart.localeCompare(a.weekStart)) // Newest first
  })

  // Modify to include searchable flat strings:
  const historyWeeksMapped = computed(() => {
    return historyWeeks.value.map(week => {
      return {
        ...week,
        // Flat strings for search index lookup
        monSelection: week.days[0].selection || '',
        tueSelection: week.days[1].selection || '',
        wedSelection: week.days[2].selection || '',
        thuSelection: week.days[3].selection || '',
        friSelection: week.days[4].selection || '',
      }
    })
  })

  // Extract all unique months from order history
  const monthsList = computed(() => {
    const months = new Set()
    for (const week of historyWeeks.value) {
      const date = parseLocalDate(week.weekStart)
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      months.add(monthName)
    }
    return ['All Months', ...Array.from(months)]
  })

  // Filter weeks based on selected Month dropdown
  const filteredHistoryWeeks = computed(() => {
    return historyWeeksMapped.value.filter(week => {
      if (selectedMonth.value === 'All Months') return true
      const date = parseLocalDate(week.weekStart)
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      return monthName === selectedMonth.value
    })
  })

  onUnmounted(() => {
    if (pollTimer) clearInterval(pollTimer)
  })
</script>

<template>
  <AppShell>
    <div style="max-width: 1400px; margin: 0 auto; padding: 0 16px;">
      <!-- Loading State -->
      <div v-if="isLoading" class="d-flex flex-column ga-4">
        <SkeletonCard v-for="i in 3" :key="i"/>
      </div>

      <div v-else>
        <!-- Back button -->
        <v-row class="d-flex align-center justify-space-between">
          <v-col class="d-flex justify-start align-center" cols="12" sm="6">
            <v-btn
              prepend-icon="mdi-arrow-left"
              variant="flat"
              color="#D2451E"
              class="mr-2 mt-4"
              @click="goBack"
            > 
            Go back 
            </v-btn>
          </v-col>
        </v-row>

        <!-- Header -->
        <v-row class="d-flex mb-4 mt-n1 align-center justify-space-between">
          <v-col class="d-flex justify-start align-center" cols="12" sm="6">
            <h1 class="font-weight-bold text-display-medium" style="color: #1E1E1E;">
              My order history
            </h1>
          </v-col>

          <v-col class="d-flex justify-sm-end align-center ga-3" cols="12" sm="6">
            <!-- Month Filter Dropdown -->
            <v-select
              v-model="selectedMonth"
              density="compact"
              hide-details
              :items="monthsList"
              label="Filter by Month"
              style="max-width: 226px;"
              variant="outlined"
            />
          </v-col>
        </v-row>

        <!-- History Listing Table -->
        <div v-if="historyWeeksMapped.length > 0">
          <v-card elevation="0" style="border: 1px solid #BDBDBD;">
            <!-- Search Toolbar matching HR style -->
            <v-card-title class="d-flex align-center pa-4" style="background-color: #FFF3E0;">
              <v-text-field
                v-model="search"
                clearable
                density="compact"
                hide-details
                label="Search meals or dates..."
                prepend-inner-icon="mdi-magnify"
                single-line
                style="max-width: 400px;"
                variant="outlined"
              />
            </v-card-title>

            <!-- DataTable -->
            <v-data-table
              :headers="headers"
              :items="filteredHistoryWeeks"
              :search="search"
              :loading="isLoading"
              class="elevation-0"
              :items-per-page="10"
            >
              <!-- Week Title Column -->
              <template #item.title="{ item }">
                <span class="font-weight-bold text-grey-darken-4">
                  {{ item.title }}
                </span>
              </template>

              <!-- Dynamic columns for Mon-Fri -->
              <template
                v-for="index in [0, 1, 2, 3, 4]"
                :key="index"
                #[`item.day_${index}`]="{ item }"
              >
                <div class="d-flex flex-column align-center py-2">
                  <!-- Selection Name -->
                  <span 
                    v-if="item.days[index].status === 'off_day' || item.days[index].status === 'holiday'" 
                    class="text-red-darken-2 font-weight-bold text-caption"
                  >
                    Off day
                  </span>
                  <span v-else class="text-body-2 font-weight-medium">
                    {{ item.days[index].selection || '–' }}
                  </span>

                  <!-- Review Button with Tooltip -->
                  <v-tooltip 
                    v-if="item.days[index].selection && item.days[index].order && (item.status === 'submitted' || item.days[index].status === 'submitted')"
                    :text="item.days[index].order.rating ? `Reviewed: ${item.days[index].order.rating} Stars. Click to edit.` : 'Click to review this meal'" 
                    location="top"
                  >
                    <template #activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon
                        variant="text"
                        density="compact"
                        class="mt-1"
                        :color="item.days[index].order.rating ? 'amber-darken-2' : 'grey-darken-1'"
                        @click="openReview(item.days[index].order)"
                      >
                        <v-icon size="small">
                          {{ item.days[index].order.rating ? 'mdi-star' : 'mdi-comment-plus-outline' }}
                        </v-icon>
                      </v-btn>
                    </template>
                  </v-tooltip>
                </div>
              </template>

              <!-- Status Column -->
              <template #item.status="{ item }">
                <v-chip
                  :color="item.status === 'submitted' ? 'green-darken-1' : 'orange-darken-2'"
                  size="small"
                  variant="flat"
                  class="font-weight-bold text-capitalize"
                >
                  {{ item.status === 'submitted' ? 'Submitted' : 'In Progress' }}
                </v-chip>
              </template>

              <!-- Empty State -->
              <template #no-data>
                <div class="text-center py-12">
                  <v-icon color="#1E1E1E" size="64">
                    mdi-clipboard-text-off-outline
                  </v-icon>
                  <div class="font-weight-medium mt-4" style="font-size: 20px;">
                    No order history matches the criteria
                  </div>
                </div>
              </template>
            </v-data-table>
          </v-card>

          <ReviewDialog
            v-model="showReviewDialog"
            :order="selectedOrderToReview"
            :loading="orderStore.isLoading"
            @submit-review="handleReviewSubmit"
          />
        </div>

        <!-- Empty State -->
        <v-card
          v-else
          class="pa-8 rounded-lg text-center"
          style="border: 1px dashed #D2451E;"
          variant="flat"
        >
          <v-icon class="mb-3" color="#1E1E1E" size="48">
            mdi-clipboard-text-off-outline
          </v-icon>

          <div class="font-weight-medium" style="font-size: 20px; color: #1E1E1E;">
            No past order history found.
          </div>
        </v-card>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
/* Custom table styling matching HR dashboard */
:deep(.v-data-table) {
  border-radius: 0;
}

:deep(.v-data-table__thead) {
  background-color: #FFF3E0;
}

:deep(.v-data-table__thead th) {
  font-weight: 700 !important;
  color: #1E1E1E !important;
  border-bottom: 2px solid #D2451E !important;
}

:deep(.v-data-table__tbody tr:hover) {
  background-color: #FAFAFA !important;
}

:deep(.v-data-table__tbody td) {
  border-bottom: 1px solid #E0E0E0 !important;
}

/* Pagination styling */
:deep(.v-data-table-footer) {
  border-top: 2px solid #D2451E;
  padding: 16px;
}

:deep(.v-pagination__item--is-active) {
  background-color: #D2451E !important;
  color: white !important;
}
</style>