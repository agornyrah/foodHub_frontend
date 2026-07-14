import { mockOrders } from '../mocks/orders.mock.js'
import api from './axios.js'

// Mock Data Functions
// These helpers only affect browser localStorage.
function getMockOrders () {
  const saved = window.localStorage.getItem('mockOrders')

  if (saved) {
    return JSON.parse(saved)
  }

  window.localStorage.setItem('mockOrders', JSON.stringify(mockOrders))
  return [...mockOrders]
}

function saveMockOrders (orders) {
  window.localStorage.setItem('mockOrders', JSON.stringify(orders))
}

// function of axios api to get all requests
export async function getAllOrdersApi ( params = {} ) {
  try {
    const response = await api.get('/orders/all', { params })
    const orders = response.data

    // Map snake_case database responses to frontend camelCase
    const mapped = orders.map(item => ({
      id: item.id,
      staffId: item.staff_id,
      staffName: item.staff_name,
      weekString: item.week_string,
      date: item.date,
      day: item.day,
      menuItemId: item.menu_item_id,
      menuTitle: item.menu_title,
      status: item.status,
      rating: item.rating,
      comment: item.comment,
    }))

    return {
      success: true,
      data: mapped,
    }
  } catch (error) {
    if (import.meta.env.VITE_USE_MOCK_ORDERS === 'true') {
      return {
        success: true,
        data: getMockOrders(),
      }
    }

    throw error
  }
}

// function of axios api to get my orders
export async function getMyOrdersApi (staffId) {
  try {
    const response = await api.get(`/orders/my/${staffId}`)
    const orders = response.data

    // Map snake_case database responses to frontend camelCase
    const mapped = orders.map(item => ({
      id: item.id,
      staffId: item.staff_id,
      staffName: item.staff_name,
      weekString: item.week_string,
      date: item.date,
      day: item.day,
      menuItemId: item.menu_item_id,
      menuTitle: item.menu_title,
      status: item.status,
      rating: item.rating,
      comment: item.comment,
    }))

    return {
      success: true,
      data: mapped,
    }
  } catch (error) {
    if (import.meta.env.VITE_USE_MOCK_ORDERS === 'true') {
      return {
        success: true,
        data: getMockOrders().filter(order => String(order.staffId) === String(staffId)),
      }
    }

    throw error
  }
}

// function of axios api to create request
export async function createOrderApi (data) {
  try {
    // Map frontend camelCase to backend snake_case schemas
    const backendData = {
      id: Math.floor(Math.random() * 1_000_000), // Backend requires an ID in body
      staff_id: data.staffId,
      staff_name: data.staffName,
      week_string: data.weekString,
      date: data.date,
      day: data.day,
      menu_item_id: data.menuItemId,
      menu_title: data.menuTitle,
      status: data.status,
    }

    const response = await api.post('/orders/create', backendData)
    const o = response.data

    return {
      success: true,
      data: {
        id: o.id,
        staffId: o.staff_id,
        staffName: o.staff_name,
        weekString: o.week_string,
        date: o.date,
        day: o.day,
        menuItemId: o.menu_item_id,
        menuTitle: o.menu_title,
        status: o.status,
        rating: o.rating,
        comment: o.comment,
      },
    }
  } catch (error) {
    if (import.meta.env.VITE_USE_MOCK_ORDERS === 'true') {
      const orders = getMockOrders()

      const order = {
        id: Date.now(),
        ...data,
      }

      orders.push(order)
      saveMockOrders(orders)

      return {
        success: true,
        data: order,
      }
    }

    throw error
  }
}

// function of axios api to update request
export async function updateOrderApi (id, data) {
  try {
    const backendData = {
      id: Number(id),
      staff_id: data.staffId,
      staff_name: data.staffName,
      week_string: data.weekString,
      date: data.date,
      day: data.day,
      menu_item_id: data.menuItemId,
      menu_title: data.menuTitle,
      status: data.status,
      rating: data.rating,
      comment: data.comment,
    }

    const response = await api.put(`/orders/edit/${id}`, backendData)
    const a = response.data

    return {
      success: true,
      data: {
        id: a.id,
        staffId: a.staff_id,
        staffName: a.staff_name,
        weekString: a.week_string,
        date: a.date,
        day: a.day,
        menuItemId: a.menu_item_id,
        menuTitle: a.menu_title,
        status: a.status,
        rating: a.rating,
        comment: a.comment,
      },
    }
  } catch (error) {
    if (import.meta.env.VITE_USE_MOCK_ORDERS === 'true') {
      const orders = getMockOrders()

      const index = orders.findIndex(r => String(r.id) === String(id))

      if (index === -1) {
        return {
          success: false,
          error: 'Order not found',
        }
      }

      orders[index] = {
        ...orders[index],
        ...data,
      }

      saveMockOrders(orders)

      return {
        success: true,
        data: orders[index],
      }
    }

    throw error
  }
}

// function of axios api to delete request
export async function deleteOrderApi (id) {
  try {
    const response = await api.delete(`/orders/delete/${id}`)
    return {
      success: true,
      data: response.data,
    }
  } catch (error) {
    if (import.meta.env.VITE_USE_MOCK_ORDERS === 'true') {
      const orders = getMockOrders()
      const filteredOrders = orders.filter(
        r => String(r.id) !== String(id),
      )

      saveMockOrders(filteredOrders)

      return {
        success: true,
      }
    }

    throw error
  }
}
