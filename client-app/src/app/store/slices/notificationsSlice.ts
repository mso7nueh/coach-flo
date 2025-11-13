import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type NotificationChannel = 'email' | 'push' | 'sms'
export type NotificationType = 'workout_reminder' | 'workout_scheduled' | 'workout_completed' | 'metrics_update' | 'trainer_note'

export interface NotificationSettings {
  channels: NotificationChannel[]
  types: NotificationType[]
  emailEnabled: boolean
  pushEnabled: boolean
  smsEnabled: boolean
  reminderBeforeMinutes: number // За сколько минут до тренировки напомнить
  workoutReminders: boolean
  workoutScheduled: boolean
  workoutCompleted: boolean
  metricsUpdate: boolean
  trainerNote: boolean
}

interface NotificationsState {
  settings: NotificationSettings
}

const initialState: NotificationsState = {
  settings: {
    channels: ['email', 'push'],
    types: ['workout_reminder', 'workout_scheduled'],
    emailEnabled: true,
    pushEnabled: true,
    smsEnabled: false,
    reminderBeforeMinutes: 30,
    workoutReminders: true,
    workoutScheduled: true,
    workoutCompleted: false,
    metricsUpdate: false,
    trainerNote: true,
  },
}

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    updateNotificationSettings(state, action: PayloadAction<Partial<NotificationSettings>>) {
      state.settings = { ...state.settings, ...action.payload }
    },
    toggleNotificationChannel(state, action: PayloadAction<NotificationChannel>) {
      const channel = action.payload
      if (channel === 'email') {
        state.settings.emailEnabled = !state.settings.emailEnabled
        if (!state.settings.emailEnabled) {
          state.settings.channels = state.settings.channels.filter((c) => c !== 'email')
        } else {
          if (!state.settings.channels.includes('email')) {
            state.settings.channels.push('email')
          }
        }
      } else if (channel === 'push') {
        state.settings.pushEnabled = !state.settings.pushEnabled
        if (!state.settings.pushEnabled) {
          state.settings.channels = state.settings.channels.filter((c) => c !== 'push')
        } else {
          if (!state.settings.channels.includes('push')) {
            state.settings.channels.push('push')
          }
        }
      } else if (channel === 'sms') {
        state.settings.smsEnabled = !state.settings.smsEnabled
        if (!state.settings.smsEnabled) {
          state.settings.channels = state.settings.channels.filter((c) => c !== 'sms')
        } else {
          if (!state.settings.channels.includes('sms')) {
            state.settings.channels.push('sms')
          }
        }
      }
    },
    toggleNotificationType(state, action: PayloadAction<NotificationType>) {
      const type = action.payload
      if (type === 'workout_reminder') {
        state.settings.workoutReminders = !state.settings.workoutReminders
      } else if (type === 'workout_scheduled') {
        state.settings.workoutScheduled = !state.settings.workoutScheduled
      } else if (type === 'workout_completed') {
        state.settings.workoutCompleted = !state.settings.workoutCompleted
      } else if (type === 'metrics_update') {
        state.settings.metricsUpdate = !state.settings.metricsUpdate
      } else if (type === 'trainer_note') {
        state.settings.trainerNote = !state.settings.trainerNote
      }

      if (state.settings.types.includes(type)) {
        state.settings.types = state.settings.types.filter((t) => t !== type)
      } else {
        state.settings.types.push(type)
      }
    },
    setReminderBeforeMinutes(state, action: PayloadAction<number>) {
      state.settings.reminderBeforeMinutes = action.payload
    },
  },
})

export const { updateNotificationSettings, toggleNotificationChannel, toggleNotificationType, setReminderBeforeMinutes } =
  notificationsSlice.actions
export default notificationsSlice.reducer

