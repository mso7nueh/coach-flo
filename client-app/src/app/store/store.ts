import { configureStore } from '@reduxjs/toolkit'
import userReducer from './slices/userSlice'
import dashboardReducer from './slices/dashboardSlice'
import calendarReducer from './slices/calendarSlice'
import programReducer from './slices/programSlice'
import metricsReducer from './slices/metricsSlice'
import notificationsReducer from './slices/notificationsSlice'

export const store = configureStore({
  reducer: {
    user: userReducer,
    dashboard: dashboardReducer,
    calendar: calendarReducer,
    program: programReducer,
    metrics: metricsReducer,
    notifications: notificationsReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

