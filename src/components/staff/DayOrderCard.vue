<script setup>
  import { computed } from 'vue'
  import { DAY_STATUS } from '@/constants/dayStatus'
  import { VENDOR_COLORS } from '@/constants/vendors'

  const props = defineProps({
    day: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    dateString: {
      type: String,
      required: true,
    },
    items: {
      type: Array,
      default: () => [],
    },
    selectedItemId: {
      type: [Number, String],
      default: null,
    },
    status: {
      type: String,
      default: 'open',
    },
  })

  const emit = defineEmits(['select'])

  const isOffDay = computed(() => props.status === DAY_STATUS.OFF_DAY || props.status === DAY_STATUS.HOLIDAY)
  const isDeadlinePassed = computed(() => props.status === DAY_STATUS.DEADLINE_PASSED)
  const isDisabled = computed(() => isOffDay.value || isDeadlinePassed.value)

  // Card styling
  const cardBorderColor = computed(() => {
    if (isOffDay.value) return '#C62828' // Red border for off days
    if (props.selectedItemId) return '#D2451E' // Signature Orange for selected days
    return '#E0E0E0' // Default gray
  })

  const cardBgColor = computed(() => {
    if (isOffDay.value) return '#FFEBEE' // Light red backdrop for off days
    return '#FFFFFF'
  })

  function handleSelect (itemId) {
    if (isDisabled.value) return
    emit('select', { date: props.dateString, itemId })
  }
</script>

<template>
  <v-card
    class="pa-3 d-flex flex-column"
    :color="cardBgColor"
    style="border: 1.5px solid; height: 100%;"
    :style="{ borderColor: cardBorderColor }"
    variant="flat"
  >
    <!-- Header -->
    <div class="mb-4">
      <div class="font-weight-bold" style="color: #1E1E1E; font-size: 20px;">
        {{ day }}
      </div>

      <div class="font-weight-medium" style="color: #1E1E1E;">
        {{ date }}
      </div>
    </div>

    <!-- Off Day / Holiday State -->
    <div v-if="isOffDay" class="d-flex flex-column align-center justify-center flex-grow-1 py-4 text-center">
      <v-icon class="mb-2" color="#C62828" size="40">mdi-umbrella-beach-outline</v-icon>

      <div class="font-weight-bold text-subtitle-2" style="color: #C62828;">
        Off day
      </div>

      <div class="text-caption text-grey-darken-2">
        {{ status === DAY_STATUS.HOLIDAY ? 'Public holiday' : 'Office closed' }}
      </div>
    </div>

    <!-- Menu Items List with full details -->
    <div v-else-if="items.length > 0" class="d-flex flex-column ga-3 flex-grow-1">
      <v-card
        v-for="item in items"
        :key="item.id"
        class="pa-3 rounded-lg cursor-pointer"
        :disabled="isDeadlinePassed"
        style="border: 1.5px solid; "
        :style="{
          borderColor: String(item.id) === String(selectedItemId) ? '#D2451E' : '#BDBDBD',
          backgroundColor: String(item.id) === String(selectedItemId) ? '#FBE9E7' : 'transparent',
        }"
        variant="flat"
        @click="handleSelect(item.id)"
      >
        <div class="d-flex align-start ga-3">
          <!-- Selection indicator (Radio icon) -->
          <div class="pt-1 flex-shrink-0">
            <v-icon
              :color="String(item.id) === String(selectedItemId) ? '#D2451E' : 'grey-lighten-1'"
              size="20"
            >
              {{ String(item.id) === String(selectedItemId) ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}
            </v-icon>
          </div>

          <!-- Food Image Thumbnail -->
          <v-avatar class="flex-shrink-0" rounded="lg" size="52" style="background-color: #FBE9E7;">
            <v-img v-if="item.imageUrl" :alt="item.title" cover :src="item.imageUrl" loading="lazy">
              <template #error>
                <div class="d-flex align-center justify-center fill-height" style="background-color: #D2451E;">
                  <v-icon color="#D2451E" size="20">mdi-food</v-icon>
                </div>
              </template>
            </v-img>

            <div v-else class="d-flex align-center justify-center fill-height">
              <v-icon color="#D2451E" size="25">mdi-food</v-icon>
            </div>
          </v-avatar>

          <!-- Text Details -->
          <div class="flex-grow-1 min-width-0">
            <div class="d-flex align-center justify-space-between flex-wrap ga-1 mb-1">
              <span class="text-body-2 font-weight-bold text-grey-darken-4 text-truncate">
                {{ item.title }}
              </span>

              <!-- Type Chip -->
              <v-chip
                v-if="item.type"
                class="text-white"
                :color="VENDOR_COLORS[item.type] || 'grey'"
                size="x-small"
                variant="flat"
              >
                {{ item.type }}
              </v-chip>
            </div>

            <!-- Description -->
            <div v-if="item.description" class="font-weight-medium text-grey-darken-2">
              {{ item.description }}
            </div>
          </div>
        </div>
      </v-card>
    </div>

    <!-- No Items State -->
    <div v-else class="d-flex flex-column align-center justify-center flex-grow-1 text-center py-6">
      <div class="font-weight-medium" style="font-size: 20px; color: #1E1E1E;">
        No meals added for this day
      </div>
    </div>
  </v-card>
</template>

<style scoped>

</style>
