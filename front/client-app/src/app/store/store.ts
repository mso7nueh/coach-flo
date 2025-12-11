import { configureStore } from '@reduxjs/toolkit'
import userReducer from './slices/userSlice'
import dashboardReducer from './slices/dashboardSlice'
import calendarReducer from './slices/calendarSlice'
import programReducer from './slices/programSlice'
import metricsReducer from './slices/metricsSlice'
import notificationsReducer from './slices/notificationsSlice'
import clientsReducer from './slices/clientsSlice'
import libraryReducer from './slices/librarySlice'
import financesReducer from './slices/financesSlice'
import trainerCalendarReducer from './slices/trainerCalendarSlice'

export const store = configureStore({
  reducer: {
    user: userReducer,
    dashboard: dashboardReducer,
    calendar: calendarReducer,
    program: programReducer,
    metrics: metricsReducer,
    notifications: notificationsReducer,
    clients: clientsReducer,
    library: libraryReducer,
    finances: financesReducer,
    trainerCalendar: trainerCalendarReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

