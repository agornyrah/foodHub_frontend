<script setup>
  import { computed, ref, watch } from 'vue'
  import { VENDORS } from '@/constants/vendors'

  const props = defineProps({
    modelValue: {
      type: Boolean,
      default: false,
    },
    foodItem: {
      type: Object,
      default: null,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  })

  const emit = defineEmits(['update:modelValue', 'save'])

  const imageFile = ref(null)
  const maxSize = 500_000  // 500 KB

  function handleFileUpload (file) {
    formData.value.imageFile = file  // store raw File
    formData.value.imageUrl = URL.createObjectURL(file)  // preview
  }

  // Food types
  const foodTypes = [...VENDORS, "Other"]

  const otherType = ref('')
  const showOtherInput = ref(false)

  // Form data
  const formData = ref({
    title: '',
    description: '',
    imageUrl: '',
    type: VENDORS[0],
  })

  // Form validation
  const isValid = ref(false)
  const titleRules = [
    v => !!v || 'Title is required',
    v => (v && v.length >= 3) || 'Title must be at least 3 characters',
  ]

  const descriptionRules = [
    // v => !!v || 'Description is required',
    v => {
      if (v && v.length >= 10) return 'Description must be at least 10 characters'
      return true
    }
  ]

  const imageRules = [
    v => {
      // if (!v && !formData.value.imageUrl) return 'Image is required'
      if (v && v.size >= maxSize) return 'Image must be less than 2MB'
      return true
    }
  ]

  const otherTypeRules = [
    v => (formData.value.type !== 'Other' || !!v) || 'Custom vendor type is required',
    v => (formData.value.type !== 'Other' || (v && v.trim().length >= 2)) || 'Custom vendor type must be at least 2 characters',
  ]

  // Dialog title
  const dialogTitle = computed(() => {
    return props.foodItem ? 'Edit Food Item' : 'Add Food Item'
  })

  // Watch for food item changes (when editing)
  watch(() => props.foodItem, newItem => {
    if (newItem) {

      const isPredefined = VENDORS.includes(newItem.type)

      formData.value = {
        title: newItem.title || '',
        description: newItem.description || '',
        imageUrl: newItem.imageUrl || '',
        type: isPredefined ? (newItem.type || VENDORS[0]) : "Other",
      }

      otherType.value = isPredefined ? "" : (newItem.type || "")
      showOtherInput.value = !isPredefined

      // Convert base64 imageUrl back to a File object for v-file-input display
      if (newItem.imageUrl && newItem.imageUrl.startsWith('data:')) {
        try {
          // 1. Split base64 metadata from the raw base64 data string
          const parts = newItem.imageUrl.split(',')
          
          // 2. Extract the mime type (e.g., "image/png") using regex
          const mimeMatch = parts[0].match(/:(.*?);/)
          const mime = mimeMatch ? mimeMatch[1] : 'image/png'
          
          // 3. Decode the base64-encoded string into binary
          const binaryStr = atob(parts[1])
          let n = binaryStr.length
          const u8arr = new Uint8Array(n)
          
          // 4. Fill the 8-bit unsigned integer array with characters
          while (n--) {
            u8arr[n] = binaryStr.charCodeAt(n)
          }
          
          // 5. Get the file extension (e.g., "png", "jpeg")
          const extension = mime.split('/')[1] || 'png'
          
          // 6. Create a brand new File object and assign it to imageFile
          imageFile.value = new File([u8arr], `food-image.${extension}`, { type: mime })
        } catch (error) {
          console.error('Error converting base64 data URL to File object:', error)
          imageFile.value = null
        }
      } else {
        // Clear file input if no base64 image exists (e.g., standard placeholders)
        imageFile.value = null
      }
    } else {
      resetForm()
    }
  }, { immediate: true })

  // Watch dialog close
  watch(() => props.modelValue, newVal => {
    if (!newVal) {
      resetForm()
    }
  })

  function resetForm () {
    formData.value = {
      title: '',
      description: '',
      imageUrl: '',
      type: VENDORS[0],
    }
    otherType.value = ''
    showOtherInput.value = false
    imageFile.value = null //Reset file input
  }

  function handleClose () {
    emit('update:modelValue', false)
  }

  function handleSave () {
    if (isValid.value) {
      const finalType = formData.value.type === 'Other' ? otherType.value.trim() : formData.value.type
      emit('save', { ...formData.value, type: finalType })
    }
  }
</script>

<template>
  <v-dialog
    max-width="600"
    :model-value="modelValue"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card elevation="0" style="border: 2px solid #D2451E;">
      <!-- Dialog Header -->
      <v-card-title class="px-8" style="background-color: #D2451E;">
        <div class="d-flex justify-space-between align-center">
          <div class="d-flex align-center ga-3">
            <v-icon class="mr-2" color="white">
              {{ foodItem ? 'mdi-pencil-box-outline' : 'mdi-plus-box-outline' }}
            </v-icon>
            <h2 class="text-title-large font-weight-bold text-white">
              {{ dialogTitle }}
            </h2>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            color="white"
            @click="handleClose"
          />
        </div>
      </v-card-title>

      <!-- Dialog Content -->
      <v-card-text class="px-8 pt-10">
        <v-form v-model="isValid">
          <!-- Food Title -->
          <div>
            <label class="font-weight-bold mb-2 d-block" style="color: #1E1E1E;">
              <v-icon class="mr-2">mdi-food-outline</v-icon>
              Food Title *
            </label>

            <v-text-field
              v-model="formData.title"
              density="comfortable"
              placeholder="e.g. Jollof Rice"
              :rules="titleRules"
              style="border-color: #D2451E;"
              variant="outlined"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="font-weight-bold mb-2 d-block" style="color: #1E1E1E;">
              <v-icon class="mr-2">mdi-note-text-outline</v-icon>
              Description
            </label>

            <v-textarea
              v-model="formData.description"
              placeholder="e.g. Jollof Rice with chicken and pepper"
              rows="3"
              :rules="descriptionRules"
              variant="outlined"
            />
          </div>

          <!-- Image Upload -->
          <div>
            <label class="font-weight-bold mb-2 d-block" style="color: #1E1E1E;">
              <!-- <v-icon class="mr-2">mdi-image-outline</v-icon> -->
              Upload Food Picture
            </label>

            <v-file-input
              v-model="imageFile"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              density="comfortable"
              placeholder="Pick an image"
              prepend-icon="mdi-camera"
              :rules="imageRules"
              show-size
              variant="outlined"
              @update:model-value="handleFileUpload"
            />
          </div>

          <!-- Vendor Type -->
          <div>
            <label class="font-weight-bold mb-2 d-block" style="color: #1E1E1E;">
              <v-icon class="mr-2">mdi-format-text-rotation-vertical</v-icon>
              Vendor Type
            </label>

            <v-select
              v-model="formData.type"
              density="comfortable"
              :items="foodTypes"
              variant="outlined"
            />
          </div>
          <!-- Custom Vendor Type (Other) -->
           <v-expand-transition>
            <div v-if="formData.type === 'Other'" class="mb-4">
              <label class="font-weight-bold mb-2 d-block" style="color: #1E1E1E;">
                <v-icon class="mr-2"> mdi-pencil-box-outline</v-icon>
                  Custom Vendor Type *
              </label>
              <v-text-field
                v-model="otherType"
                density="comfortable"
                placeholder="e.g. Local Joint"
                :rules="otherTypeRules"
                variant="outlined"
              />
            </div>
           </v-expand-transition>

          

          <!-- Image Preview -->
          <div v-if="formData.imageUrl" class="mb-4">
            <label class="font-weight-bold mb-2 d-block" style="color: #1E1E1E;">
              Preview
            </label>

            <v-card class="pa-3" elevation="0" style="border: 1px solid #E0E0E0;">
              <div class="d-flex ga-3 align-center">
                <v-avatar rounded="lg" size="64">
                  <v-img
                    :alt="formData.title"
                    cover
                    :src="formData.imageUrl"
                  >
                    <template #error>
                      <div class="d-flex align-center justify-center fill-height bg-grey-lighten-3">
                        <v-icon color="grey">mdi-image-broken</v-icon>
                      </div>
                    </template>
                  </v-img>
                </v-avatar>

                <div>
                  <div class="font-weight-bold" style="color: #1E1E1E;">
                    {{ formData.title || 'Food Title' }}
                  </div>

                  <div class="text-caption" style="color: #666666;">
                    {{ formData.description }}
                  </div>
                </div>
              </div>
            </v-card>
          </div>
        </v-form>
      </v-card-text>

      <!-- Dialog Actions -->
      <v-card-actions class="pa-6 pt-0">
        <v-spacer />

        <v-btn
          class="text-capitalize font-weight-bold px-14"
          color="#1E1E1E"
          variant="outlined"
          @click="handleClose"
        >
          Cancel
        </v-btn>

        <v-btn
          class="text-capitalize font-weight-bold px-14"
          color="#D2451E"
          :disabled="!isValid || loading"
          :loading="loading"
          variant="flat"
          @click="handleSave"
        >
          {{ foodItem ? 'Update' : 'Add' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
