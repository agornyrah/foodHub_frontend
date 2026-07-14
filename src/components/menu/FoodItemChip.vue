<script setup>
  import { computed } from 'vue'
  import { VENDOR_BG_COLORS, VENDOR_COLORS } from '@/constants/vendors'

  const props = defineProps({
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      default: 'Standard',
    },
    showIcon: {
      type: Boolean,
      default: true,
    },
    compact: {
      type: Boolean,
      default: false,
    },
  })

  const typeBadgeColor = computed(() => VENDOR_COLORS[props.type] || '#888888')
  const typeIconBg = computed(() => VENDOR_BG_COLORS[props.type] || '#F5F5F5')
</script>

<template>
  <!-- Mini row with thumbnail + badge -->
  <div v-if="compact" class="food-item-mini d-flex align-center ga-2 pa-2 rounded-lg">

    <!-- Small Image Thumbnail -->
    <v-avatar class="flex-shrink-0" rounded="md" size="40">
      <v-img v-if="imageUrl" :alt="title" cover :src="imageUrl">
        <template #error>
          <div
            class="d-flex align-center justify-center fill-height"
            :style="{ backgroundColor: typeIconBg }"
          >
            <v-icon :color="typeBadgeColor" size="16">mdi-food</v-icon>
          </div>
        </template>
      </v-img>

      <div
        v-else
        class="d-flex align-center justify-center fill-height"
      >
        <v-icon color="#D2451E" size="24">mdi-food</v-icon>
      </div>
    </v-avatar>

    <!-- Title + Type Badge -->
    <div class="flex-grow-1 min-width-0">
      <div class="font-weight-medium text-truncate">
        {{ title }}
      </div>
    </div>

    <!-- Type Badge dot (right side) -->
    <div
      class="type-dot flex-shrink-0"
      :style="{ backgroundColor: typeBadgeColor }"
      :title="type"
    />

  </div>

  <!-- Card with large image + details  -->
  <v-card v-else class="food-item-card" elevation="0" rounded="lg">
    <div class="d-flex ga-3 align-start">
      <!-- Food Image -->
      <v-avatar v-if="imageUrl" class="flex-shrink-0" rounded="lg" size="52">
        <v-img :alt="title" cover :src="imageUrl">
          <template #error>
            <div
              class="d-flex align-center justify-center fill-height"
              :style="{ backgroundColor: typeIconBg }"
            >
              <v-icon :color="typeBadgeColor" size="24">mdi-food</v-icon>
            </div>
          </template>
        </v-img>
      </v-avatar>

      <!-- Food Icon (if no image) -->
      <v-avatar
        v-else
        class="flex-shrink-0"
        rounded="lg"
        size="52"
        :style="{ backgroundColor: typeIconBg }"
      >
        <v-icon :color="typeBadgeColor" size="26">mdi-food</v-icon>
      </v-avatar>

      <!-- Food Details -->
      <div class="flex-grow-1">
        <div class="d-flex align-center ga-2 mb-1 flex-wrap">
          <div class="text-body-2 font-weight-bold text-grey-darken-4">
            {{ title }}
          </div>

          <!-- Type Badge -->
          <v-chip
            size="x-small"
            :style="{ backgroundColor: typeBadgeColor, color: 'white' }"
            variant="flat"
          >
            {{ type }}
          </v-chip>
        </div>

        <div v-if="description" class="font-weight-medium text-grey-darken-2">
          {{ description }}
        </div>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
/* COMPACT: Mini row */
.food-item-mini {
  background-color: #FAFAF8;
  border: 1px solid #F0EDE8;
  transition: background-color 0.15s ease;
}

.food-item-mini:hover {
  background-color: #F5F2EC;
  cursor: pointer;
}

/* Small colored dot type indicator */
.type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* FULL: Standard card */
.food-item-card {
  background-color: #FAFAF8;
  border: 1px solid #F0EDE8;
  padding: 10px;
  transition: all 0.2s;
}

.food-item-card:hover {
  background-color: #F5F2EC;
  cursor: pointer;
}

</style>
