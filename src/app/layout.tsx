import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import ThemeProvider from '@/providers/ThemeProvider'
import NextTopLoader from 'nextjs-toploader'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import ReactQueryProvider from '@/providers/ReactQueryProvider'
import MenubarDemo from '@/components/menubar-demo'
import { Tiles } from '@/components/ui/tiles'
import { ThemeToggle } from '@/components/theme-toggle'
import AuthDropdown from '@/components/AuthDropdown'
import Image from 'next/image'
import Link from 'next/link'
import AccessibilityProvider from '@/providers/AccessibilityProvider'
import { PermissionsProvider } from '@/providers/PermissionsProvider'

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'Next.js and Supabase Starter Kit',
  description: 'The fastest way to build apps with Next.js and Supabase',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.className}`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground font-mono text-sm">
        <Tiles
          rows={200}
          cols={100}
          tileSize="lg"
          className="fixed inset-0 -z-10"
        />
        <NextTopLoader showSpinner={false} height={2} color="#2acf80" />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ReactQueryProvider>
            <PermissionsProvider>
              <AccessibilityProvider>
                <div
                  className="mx-auto w-full max-w-[95vw] px-4 md:px-8"
                  data-no-aria-hidden="true"
                  id="main-content-wrapper"
                >
                  <div className="mb-12 flex items-center justify-between py-4">
                    <div className="flex-shrink-0">
                      <Link href="/">
                        <Image
                          src="/imacx_pos.svg"
                          alt="Imacx Logo Light"
                          width={100}
                          height={38}
                          priority
                          className="block dark:hidden"
                        />
                        <Image
                          src="/imacx_neg.svg"
                          alt="Imacx Logo Dark"
                          width={100}
                          height={38}
                          priority
                          className="hidden dark:block"
                        />
                      </Link>
                    </div>
                    <div className="flex flex-grow justify-center">
                      <MenubarDemo />
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <AuthDropdown />
                    </div>
                  </div>
                  <main className="flex min-h-screen flex-col items-center">
                    {children}
                    <Analytics />{' '}
                    {/* ^^ remove this if you are not deploying to vercel. See more at https://vercel.com/docs/analytics  */}
                  </main>
                </div>
                {/* Only show ReactQueryDevtools in development */}
                {process.env.NODE_ENV === 'development' && (
                  <ReactQueryDevtools initialIsOpen={false} />
                )}
              </AccessibilityProvider>
            </PermissionsProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
