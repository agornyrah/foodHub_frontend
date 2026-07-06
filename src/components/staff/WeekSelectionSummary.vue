<script setup>
  import { computed } from 'vue'
  import { DAY_STATUS } from '@/constants/dayStatus'

  const props = defineProps({
    weekDays: {
      type: Array,
      required: true,
    },
    selections: {
      type: Object,
      required: true,
    },
    menuItems: {
      type: Array,
      required: true,
    },
    isSubmitting: {
      type: Boolean,
      default: false,
    },
    isSavingDraft: {
      type: Boolean,
      default: false,
    },
    isSubmittingAll: {
      type: Boolean,
      default: false,
    },
    isDeadlinePassed: {
      type: Boolean,
      default: false,
    },
  })

  const emit = defineEmits(['submit', 'save-draft'])

  // Resolve name/status for each day
  const summaryItems = computed(() => {
    return props.weekDays.map(day => {
      const isOff = day.status === DAY_STATUS.OFF_DAY || day.status === DAY_STATUS.HOLIDAY
      const itemId = props.selections[day.date]
      const selectedItem = props.menuItems.find(item => String(item.id) === String(itemId))

      let displayText = 'Not selected yet'
      let textStyle = { color: '#8C8C8C', fontStyle: 'italic' }
      let isOffDay = false

      if (isOff) {
        displayText = 'Off day'
        textStyle = { color: '#C62828', fontWeight: 'bold' }
        isOffDay = true
      } else if (selectedItem) {
        displayText = selectedItem.title
        textStyle = { color: '#1E1E1E', fontWeight: 'bold' }
      }

      return {
        date: day.date,
        dayLabel: day.dayName || day.label?.split(' ')[0] || 'Day',
        displayText,
        textStyle,
        isOffDay,
      }
    })
  })

  // Check if at least one choice is made
  const hasSelections = computed(() => {
    return Object.values(props.selections).some(id => id !== null && id !== undefined)
  })
</script>

<template>
  <v-card
    class="pa-5 mb-8"
    style="background-color: #D2451E;"
    variant="flat"
  >
    <div class="font-weight-medium text-white mb-4" style="font-size: 20px;">
      Your Order Actions
    </div>

    <!-- Buttons -->
    <div class="d-flex flex-column ga-3 mb-3">
      <!-- Save Draft Button -->
      <v-btn
        class="text-capitalize font-weight-medium rounded-lg py-5 w-100"
        :class="{ 'disabled-white-btn': !hasSelections || isSavingDraft || isSubmittingAll || isDeadlinePassed }"
        :disabled="!hasSelections || isSavingDraft || isSubmittingAll || isDeadlinePassed"
        :loading="isSavingDraft"
        variant="flat"
        @click="emit('save-draft')"
      >
        Save as Draft
      </v-btn>

      <!-- Submit All Button -->
      <v-btn
        class="text-capitalize font-weight-medium rounded-lg py-5 w-100"
        color="white"
        :disabled="!hasSelections || isSubmitting || isDeadlinePassed"
        :loading="isSubmittingAll"
        prepend-icon="mdi-send-outline"
        variant="outlined"
        @click="emit('submit')"
      >
        Submit all selections
      </v-btn>
    </div>
  </v-card>
</template>

<style scoped>

</style>
