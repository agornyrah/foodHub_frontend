import { defineStore } from 'pinia'
import { createOrderApi, deleteOrderApi, getAllOrdersApi, getMyOrdersApi, updateOrderApi } from '../api/orders.api.js'

export const useOrderStore = defineStore('order', {
  state: () => ({
    // Read from local storage
    allOrders: [],
    myOrders: [],
    isLoading: false,
    error: null,
  }),

  getters: {
    ordersByStaff: state => staffId =>
      state.allOrders.filter(order => String(order.staffId) === String(staffId)),

    ordersByWeek: state => weekString =>
      state.allOrders.filter(order => order.weekString === weekString),

  },

  actions: {
    // function to get all orders
    async getAllOrders (params = {}) {
      this.isLoading = true
      this.error = null
      try {
        const response = await getAllOrdersApi(params)
        if (response.success) {
          this.allOrders = response.data
        } else {
          this.error = response.error
          return false
        }
        this.isLoading = false
        return true
      } catch (error) {
        console.error(error)
        this.error = error
        this.isLoading = false
        return false
      } finally {
        this.isLoading = false
      }
    },

    // function to get my orders
    async getMyOrders (staffId) {
      this.isLoading = true
      this.error = null
      try {
        const response = await getMyOrdersApi(staffId)
        if (response.success) {
          this.myOrders = response.data
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

    // function to create an order
    async createOrder (data) {
      this.isLoading = true
      this.error = null
      try {
        const response = await createOrderApi(data)
        if (response.success) {
          
          //Add the order directly without calling the whole list
          this.allOrders.push(response.data)
          this.myOrders.push(response.data)
          //await this.getAllOrders() // Pulls the updated list immediately
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

    // function to update an order
    async updateOrder (id, data) {
      this.isLoading = true
      this.error = null
      try {
        const response = await updateOrderApi(id, data)
        if (response.success) {

          //Update the order directly without calling the whole list
          const index = this.allOrders.findIndex(s => s.id === id)
          if (index !== -1) {
            this.allOrders[index] = response.data
          }

          const myIndex = this.myOrders.findIndex(s => s.id === id)
          if (myIndex !== -1) {
            this.myOrders[myIndex] = response.data
          }
          //await this.getAllOrders() // Pulls the updated list immediately
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

    // function to delete an order
    async deleteOrder (id) {
      this.isLoading = true
      this.error = null
      try {
        const response = await deleteOrderApi(id)
        if (response.success) {

          // Remove the order by referencing its exact id, directly without calling the whole list
          this.allOrders = this.allOrders.filter(o => o.id !== id)
          this.myOrders = this.myOrders.filter(o => o.id !== id)
          //await this.getAllOrders() // Pulls the updated list immediately
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
  },
})
