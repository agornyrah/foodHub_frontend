import { defineStore } from 'pinia'
import { createMenuApi, createBulkMenuApi, deleteMenuApi, getAllMenuItemsApi, getWeekDeadlineApi, setWeekDeadlineApi, updateMenuApi } from '../api/menu.api.js'

export const useMenuStore = defineStore('menu', {
  state: () => ({
    // Read from local storage
    allMenuItems: [],
    weekDeadlines: JSON.parse(localStorage.getItem('foodhub:weekDeadlines') || '{}'),
    isLoading: false,
    error: null,

    // WebSocket state
    socket: null,
  }),

  getters: {
    // Get deadline for a given week
    deadlineByWeek: state => weekString =>
      state.weekDeadlines[weekString] || null,

    menuByWeek: state => weekString =>
      state.allMenuItems.filter(item => item.weekString === weekString),

    menuByDate: state => date =>
      state.allMenuItems.filter(item => item.date === date),
  },

  actions: {
    // function to get all menu items
    async getAllMenuItems (params = {}) {
      this.isLoading = true
      this.error = null
      try {
        const response = await getAllMenuItemsApi(params)
        if (response.success) {
          this.allMenuItems = response.data
        } else {
          this.error = response.error
          return false
        }
        return true
      } catch (error) {
        console.error(error)
        this.error = error
        return false
      } finally {
        this.isLoading = false
      }
    },

    // function to create a menu
    async createMenu (data) {
      this.isLoading = true
      this.error = null
      try {
        const response = await createMenuApi(data)
        if (response.success) {
          
          //Add the menu directly without calling the whole list
          this.allMenuItems.push(response.data)
          //await this.getAllMenuItems() // Pulls the updated list immediately
          this.error = null
        } else {
          this.error = response.error
          return false
        }
        return true
      } catch (error) {
        this.error = error
        return false
      } finally {
        this.isLoading = false
      }
    },

    // function to create a BULK menu
    async createBulkMenu (items) {
      this.isLoading = true
      this.error = null
      try {
        const response = await createBulkMenuApi(items)
        if (response.success) {
          
          //Add the menu directly without calling the whole list
          this.allMenuItems.push(...response.data)
          //await this.getAllMenuItems() // Pulls the updated list immediately
          this.error = null
          return true
        } else {
          this.error = response.error
          return false
        }
      } catch (error) {
        this.error = error
        return false
      } finally {
        this.isLoading = false
      }
    },

    // function to update a menu
    async updateMenu (id, data) {
      this.isLoading = true
      this.error = null
      try {
        const response = await updateMenuApi(id, data)
        if (response.success) {

          //Update the menu directly without calling the whole list
          const index = this.allMenuItems.findIndex(s => s.id === id)
          if (index !== -1) {
            this.allMenuItems[index] = response.data
          }
          //await this.getAllMenuItems() // Pulls the updated list immediately
          this.error = null
        } else {
          this.error = response.error
          return false
        }
        return true
      } catch (error) {
        this.error = error
        return false
      } finally {
        this.isLoading = false
      }
    },

    // function to delete a menu
    async deleteMenu (id) {
      this.isLoading = true
      this.error = null
      try {
        const response = await deleteMenuApi(id)
        if (response.success) {

          // Remove the menu by referencing its exact id, directly without calling the whole list
          this.allMenuItems = this.allMenuItems.filter(o => o.id !== id)
          //await this.getAllMenuItems() // Pulls the updated list immediately
          this.error = null
        } else {
          this.error = response.error
          return false
        }
        return true
      } catch (error) {
        this.error = error
        return false
      } finally {
        this.isLoading = false
      }
    },

    // HR calls this to set/extend the deadline
    async setWeekDeadline (weekString, isoDatetime) {
      this.isLoading = true
      this.error = null
      try {
        const response = await setWeekDeadlineApi(weekString, isoDatetime)
        if (response.success) {
          // Update local state
          this.weekDeadlines[weekString] = isoDatetime
          // Persist locally so staff see it immediately on the same browser
          localStorage.setItem('foodhub:weekDeadlines', JSON.stringify(this.weekDeadlines))
          this.error = null
        } else {
          this.error = response.error
          return false
        }
        return true
      } catch (error) {
        this.error = error
        return false
      } finally {
        this.isLoading = false
      }
    },

    // Fetch deadline for a specific week from backend/mock
    async getWeekDeadline (weekString) {
      this.isLoading = true
      this.error = null
      try {
        const response = await getWeekDeadlineApi(weekString)
        if (response.success) {
          this.weekDeadlines[weekString] = response.data && response.data.deadline ? response.data.deadline : null
          localStorage.setItem('foodhub:weekDeadlines', JSON.stringify(this.weekDeadlines))
          this.error = null
        } else {
          this.error = response.error
          return false
        }
        return true
      } catch (error) {
        this.error = error
        return false
      } finally {
        this.isLoading = false
      }
    },

    // WebSocket Actions
    connectWebSocket (){
      if (this.socket) return

      const token = window.sessionStorage.getItem('token')
      if (!token) return

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      const wsProtocol = window.location.protocol === 'https' ? 'wss' : 'ws'

      // Points to /menu/ws endpoint in the menu-router backend
      const wsUrl = `${wsProtocol}://${baseUrl.replace(/https?:\/\//, '')}/menu/ws?token=${token}`

      this.socket = new WebSocket(wsUrl)

      this.socket.onmessage = async (event) => {
        const data = JSON.parse(event.data)
        
        if (data.type === 'menu_updated') {
          // Trigger a silent refresh of menu items in the background
          await this.getAllMenuItems()
          
          // Optionally trigger window event if specific pages need local alerts
          window.dispatchEvent(new CustomEvent('foodhub:menu-updated', { detail: data }))
        } else if (data.type === 'deadline_updated') {
          // Refetch deadline for that week
          await this.getWeekDeadline(data.week_string)
          window.dispatchEvent(new CustomEvent('foodhub:deadline-updated', { detail: data }))
        }
      }
      this.socket.onclose = () => {
        this.socket = null
        // Reconnect every 5 seconds if authenticated
        setTimeout(() => {
          if (window.sessionStorage.getItem('token')) {
            this.connectWebSocket()
          }
        }, 5000)
      }
    },
    
    disconnectWebSocket () {
      if (this.socket) {
        this.socket.close()
        this.socket = null
      }
    }
  },
})
