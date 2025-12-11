import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { Provider } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import { store } from '@/app/store/store'
import { theme } from '@/shared/config/theme'
import i18n from '@/shared/config/i18n'
import type { PropsWithChildren } from 'react'

export const AppProviders = ({ children }: PropsWithChildren) => {
  return (
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <MantineProvider theme={theme} defaultColorScheme="light">
          <Notifications />
          {children}
        </MantineProvider>
      </I18nextProvider>
    </Provider>
  )
}

