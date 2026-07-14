<script setup>
  import { computed, onMounted, onUnmounted, ref } from 'vue'

  const props = defineProps({
    deadlineIso: {
      type: String,
      required: true,
    }, // "2026-06-13T10:00:00"

    to: {
      type: String,
      default: '/weekly-overview',
    },
  })

  // Reactive store for the countdown
  const countdown = ref({ days: 0, hours: 0, mins: 0, secs: 0 })
  let timer = null

  //Compute Passed & Urgent states
  const isPassed = computed(() =>{
    return new Date() > new Date(props.deadlineIso)
  })

  const isUrgent = computed(() =>{
    if (isPassed.value) return false
    const now = new Date()
    const end = new Date(props.deadlineIso)
    const diff = end - now // ms remaining

    return diff > 0 && diff <= 5 * 60 * 60 * 1000 //5 hours remaining in milliseconds
  })

  function updateCountdown () {
    const now = new Date()
    const end = new Date(props.deadlineIso)
    const diff = end - now // ms remaining
    if (diff <= 0) {
      countdown.value = { days: 0, hours: 0, mins: 0, secs: 0 }
      clearInterval(timer)
      return
    }
    const totalSeconds = Math.floor(diff / 1000)
    countdown.value = {
      days: Math.floor(totalSeconds / 86_400),
      hours: Math.floor((totalSeconds % 86_400) / 3600),
      mins: Math.floor((totalSeconds % 3600) / 60),
      secs: totalSeconds % 60,
    }
  }

  onMounted(() => {
    updateCountdown() // run once immediately
    timer = setInterval(updateCountdown, 1000) // then tick every second
  })

  onUnmounted(() => clearInterval(timer))
</script>

<template>
  <v-card
    class="pa-5 d-flex align-center justify-space-between cursor-pointer"
    :class="{ 'pulse-alert': isUrgent }"
    elevation="2"
    ripple
    style="background-color: #D2451E !important;"
    :to="to"
    variant="flat"
  >
    <!-- Icon Container -->
    <v-avatar class="mr-4" color="white" rounded="lg" size="48">
      <v-icon :color="isPassed ? '#D2451E' : (isUrgent ? '#D2451E' : '#D2451E')" size="33">
        {{ isPassed ? 'mdi-alert-circle' : (isUrgent ? 'mdi-alert-decagram' : 'mdi-calendar-clock') }}
      </v-icon>
    </v-avatar>

    <!-- Text Section -->
    <div class="flex-grow-1">
      <div class="font-weight-bold" :style="{ color: 'white' }" style="font-size: 20px;">
        {{ isPassed ? 'Ordering deadline has passed' : (isUrgent ? 'Urgent: Click this banner to Complete your meal selection!' : 'Click this banner to Select your meals for next week') }}
      </div>

      <div :style="{ color: isPassed ? 'white' : 'white' }" class="font-weight-medium">
        <template v-if="isPassed">
          Meal selection is now locked for next week.
        </template>
        <template v-else-if="isUrgent">
          Deadline in:
          {{ countdown.days }}d :
          {{ String(countdown.hours).padStart(2,'0') }}hrs :
          {{ String(countdown.mins).padStart(2,'0') }}mins :
          {{ String(countdown.secs).padStart(2,'0') }}secs left!
        </template>
        <template v-else>
          Deadline in:
          {{ countdown.days }}d :
          {{ String(countdown.hours).padStart(2,'0') }}hrs :
          {{ String(countdown.mins).padStart(2,'0') }}mins :
          {{ String(countdown.secs).padStart(2,'0') }}secs left
        </template>
      </div>
    </div>

    <!-- Arrow Icon -->
    <v-icon class="ml-2" color="white" size="48">mdi-arrow-right</v-icon>
  </v-card>
</template>

<style scoped>

.pulse-alert {
  animation: pulse 2s infinite ease-in-out;
}

</style>
