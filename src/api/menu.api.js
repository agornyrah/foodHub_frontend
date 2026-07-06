import { mockMenuItems, mockWeekDeadlines } from '../mocks/menu.mock.js'
import api from './axios.js'

// Mock Data Functions
// These helpers only affect browser localStorage.
function getMockMenuItems () {
  const saved = window.localStorage.getItem('mockMenuItems')

  if (saved) {
    return JSON.parse(saved)
  }

  window.localStorage.setItem('mockMenuItems', JSON.stringify(mockMenuItems))
  return [...mockMenuItems]
}

function saveMockMenuItems (menuItems) {
  window.localStorage.setItem('mockMenuItems', JSON.stringify(menuItems))
}

// function of axios api to get all requests
export async function getAllMenuItemsApi () {
  try {
    const response = await api.get('/menu/all')
    const menuItems = response.data

    // Map snake_case database responses to frontend camelCase
    const mapped = menuItems.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      imageUrl: item.image_url,
      type: item.type,
      day: item.day,
      date: item.date,
      weekString: item.week_string,
      status: item.status,
    }))

    return {
      success: true,
      data: mapped,
    }
  } catch (error) {
    if (import.meta.env.VITE_USE_MOCK_MENU === 'true') {
      return {
        success: true,
        data: getMockMenuItems(),
      }
    }

    throw error
  }
}

// function of axios api to create request
// export async function createMenuApi (data) {
//   try {
//     // Map frontend camelCase to backend snake_case schemas
//     const backendData = {
//       id: Math.floor(Math.random() * 1_000_000), // Backend requires an ID in body
//       title: data.title,
//       description: data.description,
//       image_url: data.imageUrl,
//       type: data.type,
//       day: data.day,
//       date: data.date,
//       week_string: data.weekString,
//       status: data.status,
//     }

//     const response = await api.post('/menu/create', backendData)
//     const menuItem = response.data

//     return {
//       success: true,
//       data: {
//         id: menuItem.id,
//         title: menuItem.title,
//         description: menuItem.description,
//         imageUrl: menuItem.image_url,
//         type: menuItem.type,
//         day: menuItem.day,
//         date: menuItem.date,
//         weekString: menuItem.week_string,
//         status: menuItem.status,
//       },
//     }
//   } catch (error) {
//     if (import.meta.env.VITE_USE_MOCK_MENU === 'true') {
//       const menuItems = getMockMenuItems()

//       const menuItem = {
//         id: Date.now(),
//         ...data,
//       }

//       menuItems.push(menuItem)
//       saveMockMenuItems(menuItems)

//       return {
//         success: true,
//         data: menuItem,
//       }
//     }

//     throw error
//   }
// }

export async function createMenuApi (data) {
    try {
        let imageUrl = data.imageUrl || ''

        // Upload image first if a file was selected
        if (data.imageFile) {
            const uploadFormData = new FormData()
            uploadFormData.append('file', data.imageFile)
            const uploadRes = await api.post('/menu/upload-image', uploadFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            imageUrl = uploadRes.data.image_url
        }

        // Then create menu with the returned URL
        const backendData = {
            title: data.title,
            description: data.description,
            image_url: imageUrl,
            type: data.type,
            day: data.day,
            date: data.date,
            week_string: data.weekString,
            status: data.status || null,
        }

        const response = await api.post('/menu/create', backendData)
        const menuItem = response.data

        return {
            success: true,
            data: {
                id: menuItem.id,
                title: menuItem.title,
                description: menuItem.description,
                imageUrl: menuItem.image_url,
                type: menuItem.type,
                day: menuItem.day,
                date: menuItem.date,
                weekString: menuItem.week_string,
                status: menuItem.status,
            },
        }
    } catch (error) {
        if (import.meta.env.VITE_USE_MOCK_MENU === 'true') {
            const menuItems = getMockMenuItems()
            const menuItem = { id: Date.now(), ...data }
            menuItems.push(menuItem)
            saveMockMenuItems(menuItems)
            return { success: true, data: menuItem }
        }
        throw error
    }
}

// function of axios api to update request
export async function updateMenuApi (id, data) {
  try {
    let imageUrl = data.imageUrl || ''

    // Upload image first if a new file was selected during editing
    if (data.imageFile) {
      const uploadFormData = new FormData()
      uploadFormData.append('file', data.imageFile)
      const uploadRes = await api.post('/menu/upload-image', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      imageUrl = uploadRes.data.image_url
    }

    const backendData = {
      id: Number(id),
      title: data.title,
      description: data.description,
      image_url: imageUrl,
      type: data.type,
      day: data.day,
      date: data.date,
      week_string: data.weekString,
      status: data.status,
    }

    const response = await api.put(`/menu/edit/${id}`, backendData)
    const menuItem = response.data

    return {
      success: true,
      data: {
        id: menuItem.id,
        title: menuItem.title,
        description: menuItem.description,
        imageUrl: menuItem.image_url,
        type: menuItem.type,
        day: menuItem.day,
        date: menuItem.date,
        weekString: menuItem.week_string,
        status: menuItem.status,
      },
    }
  } catch (error) {
    if (import.meta.env.VITE_USE_MOCK_MENU === 'true') {
      const menuItems = getMockMenuItems()

      const index = menuItems.findIndex(r => String(r.id) === String(id))

      if (index === -1) {
        return {
          success: false,
          error: 'Menu item not found',
        }
      }

      menuItems[index] = {
        ...menuItems[index],
        ...data,
      }

      saveMockMenuItems(menuItems)

      return {
        success: true,
        data: menuItems[index],
      }
    }

    throw error
  }
}

// function of axios api to delete request
export async function deleteMenuApi (id) {
  try {
    const response = await api.delete(`/menu/delete/${id}`)
    return {
      success: true,
      data: response.data,
    }
  } catch (error) {
    if (import.meta.env.VITE_USE_MOCK_MENU === 'true') {
      const menuItems = getMockMenuItems()
      const filteredMenuItems = menuItems.filter(
        r => String(r.id) !== String(id),
      )

      saveMockMenuItems(filteredMenuItems)

      return {
        success: true,
      }
    }

    throw error
  }
}

// Function to set the ordering deadline for a week
export async function setWeekDeadlineApi (weekString, isoDatetime) {
  try {
    const response = await api.post('/deadline', {
      week_string: weekString,
      deadline: isoDatetime,
    })

    return {
      success: true,
      data: response.data,
    }
  } catch (error) {
    if (import.meta.env.VITE_USE_MOCK_MENU === 'true') {
      // Mock fallback: simulate success in dev/mock mode
      return {
        success: true,
        data: { week_string: weekString, deadline: isoDatetime },
      }
    }

    throw error
  }
}

// Function to get the ordering deadline for a week
export async function getWeekDeadlineApi (weekString) {
  try {
    const response = await api.get(`/deadline/${weekString}`)
    return {
      success: true,
      data: response.data, // Expected format: { week_string: 'YYYY-MM-DD', deadline: 'YYYY-MM-DDTHH:mm:ss' }
    }
  } catch (error) {
    if (import.meta.env.VITE_USE_MOCK_MENU === 'true') {
      const saved = window.localStorage.getItem('foodhub:weekDeadlines')
      const deadlines = saved ? JSON.parse(saved) : {}

      // Seed if not present
      if (!deadlines[weekString] && mockWeekDeadlines && mockWeekDeadlines[weekString]) {
        deadlines[weekString] = mockWeekDeadlines[weekString]
        window.localStorage.setItem('foodhub:weekDeadlines', JSON.stringify(deadlines))
      }

      return {
        success: true,
        data: {
          week_string: weekString,
          deadline: deadlines[weekString] || null,
        },
      }
    }
    throw error
  }
}
