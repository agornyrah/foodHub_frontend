import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useSnackbar } from '@/composables/useSnackbar'
import { DAY_STATUS } from '@/constants/dayStatus'
import { useMenuStore } from '@/stores/menu.store'
import { formatDate, getWeekString, isDeadlinePassed, parseLocalDate } from '@/utils/dateHelpers'

export function useWeekMenu () {
  const menuStore = useMenuStore()
  const { error: snackError } = useSnackbar()

  // Pull reactive state from menu.store
  const { allMenuItems, isLoading } = storeToRefs(menuStore)

  // The ISO date string ("YYYY-MM-DD") the user is currently viewing
  const activeDay = ref(null)

  // The Monday ISO date string of the week currently loaded
  const activeWeek = ref(null)

  // Derived: off-days and holidays
  // These are derived from allMenuItems where the API has flagged a day's status
  // Array of ISO date strings that are off-days this week
  const offDays = computed(() =>
    allMenuItems.value
      .filter(item => item.status === DAY_STATUS.OFF_DAY)
      .map(item => item.date),
  )

  // Array of ISO date strings that are public holidays this week
  const holidays = computed(() =>
    allMenuItems.value
      .filter(item => item.status === DAY_STATUS.HOLIDAY)
      .map(item => item.date),
  )

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // HELPERS
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Returns true if the given date is an off-day
  function isOffDay (dateString) {
    return offDays.value.includes(dateString)
  }

  // Returns true if the given date is a public holiday
  function isHoliday (dateString) {
    return holidays.value.includes(dateString)
  }

  // Returns the DAY_STATUS value for any ISO date string.
  // Priority: OFF_DAY → HOLIDAY → DEADLINE_PASSED → OPEN
  function dayStatus (dateString) {
    if (isOffDay(dateString)) {
      return DAY_STATUS.OFF_DAY
    }
    if (isHoliday(dateString)) {
      return DAY_STATUS.HOLIDAY
    }

    // Check against HR-set deadline for this week
    const weekKey = getWeekString(parseLocalDate(dateString))
    const deadline = menuStore.deadlineByWeek(weekKey)

    if (deadline) {
      // If a deadline is set, use it
      if (new Date() > new Date(deadline)) {
        return DAY_STATUS.DEADLINE_PASSED
      }
    } else {
      // Fall back to the old hardcoded logic if no deadline is set
      if (isDeadlinePassed(dateString)) {
        return DAY_STATUS.DEADLINE_PASSED
      }
    }

    return DAY_STATUS.OPEN
  }

  // Computed from store getters

  // All menu items for the active week, each annotated with their computed day status
  const weekMenu = computed(() => {
    if (!activeWeek.value) {
      return []
    }
    return menuStore.menuByWeek(activeWeek.value).map(item => ({
      ...item,
      status: dayStatus(item.date),
    }))
  })

  // Unique Mon-Fri dates for the active week with their status.
  // Shape: [{ date: "2025-06-09", status: "open" | "off_day" | "holiday" | "deadline_passed" }]
  const weekDays = computed(() => {
    const seen = new Set()
    return weekMenu.value
      .filter(item => {
        if (seen.has(item.date)) {
          return false
        }
        seen.add(item.date)
        return true
      })
      .map(item => ({ date: item.date, status: item.status }))
      .sort((a, b) => a.date.localeCompare(b.date))
  })

  // The list of menu items for the day the user is currently viewing
  const activeDayMenu = computed(() => {
    if (!activeDay.value) {
      return []
    }
    return menuStore.menuByDate(activeDay.value)
  })

  // Whether the currently active day is an off-day
  const activeDayIsOff = computed(() => isOffDay(activeDay.value))

  // The DAY_STATUS value of the currently active day
  const activeDayStatus = computed(() =>
    activeDay.value ? dayStatus(activeDay.value) : null,
  )

  // True if the active day is still open for ordering
  const activeDayIsOpen = computed(() =>
    activeDayStatus.value === DAY_STATUS.OPEN,
  )

  // True if today's date falls within the currently loaded week
  const isCurrentWeek = computed(() => {
    if (!activeWeek.value) {
      return false
    }
    const todayStr = formatDate(new Date())
    return weekDays.value.some(d => d.date === todayStr)
  })

  // Fetch all menu items then filter down to the given week.
  // Sets the active day to the first OPEN day, or Monday as a fallback.
  async function fetchWeekMenu (weekStartDate) {
    activeWeek.value = weekStartDate

    // Fetch ONLY menu items for the target week and the deadline in parallel
    const [okMenu, okDeadline] = await Promise.all([
      menuStore.getAllMenuItems({ week_string: weekStartDate }),
      menuStore.getWeekDeadline(weekStartDate),
    ])

    if (!okMenu) {
      snackError('Could not load the week menu.')
      return
    }

    const firstOpen = weekDays.value.find(d => d.status === DAY_STATUS.OPEN)
    activeDay.value = firstOpen?.date ?? weekDays.value[0]?.date ?? null
  }

  // Set the day the user is currently browsing
  function setActiveDay (dateString) {
    activeDay.value = dateString
  }

  return {
    // Raw store state
    allMenuItems,
    isLoading,

    // Derived lists
    offDays,
    holidays,
    weekMenu,
    weekDays,
    activeDayMenu,

    // Active day state
    activeDay,
    activeWeek,
    activeDayIsOff,
    activeDayStatus,
    activeDayIsOpen,
    isCurrentWeek,
    DAY_STATUS,

    // Helpers
    isOffDay,
    isHoliday,
    dayStatus,

    // Actions
    fetchWeekMenu,
    setActiveDay,

    // HR store actions passed through so HR views don't import the store directly
    createMenu: menuStore.createMenu,
    createBulkMenu: menuStore.createBulkMenu,
    updateMenu: menuStore.updateMenu,
    deleteMenu: menuStore.deleteMenu,
  }
}
