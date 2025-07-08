import { ThemeToggle } from '@/components/theme-toggle'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">
        {children}
      </div>
      
      <footer className="border-t border-t-foreground/10 p-6 text-center text-xs">
        <p className="mb-4">
          Powered by{' '}
          <a
            href="https://supabase.com"
            target="_blank"
            className="font-bold hover:underline"
            rel="noreferrer"
          >
            Supabase
          </a>
        </p>
        <ThemeToggle />
      </footer>
    </div>
  )
} 