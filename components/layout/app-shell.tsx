import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";
import { SidebarStatus } from "./sidebar-status";
import { TopBar } from "./top-bar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar/80 p-4 lg:flex">
        <div className="px-1 pt-1">
          <Brand />
        </div>
        <SidebarNav />
        <div className="mt-auto">
          <SidebarStatus />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
        <footer className="border-t px-4 py-4 text-xs text-muted-foreground lg:px-8">
          SecureMessage Lab is an academic learning prototype. Do not use it for real private communication.
        </footer>
      </div>
    </div>
  );
}
