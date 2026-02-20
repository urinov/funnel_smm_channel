// Type Imports
import type { ChildrenType } from '@core/types'

// Component Imports
import Providers from '@components/Providers'
import { DashboardLayout } from '@/components/layout'

const Layout = async ({ children }: ChildrenType) => {
  const direction = 'ltr'

  return (
    <Providers direction={direction}>
      <DashboardLayout>{children}</DashboardLayout>
    </Providers>
  )
}

export default Layout
