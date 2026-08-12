import { AppShell } from "@/components/app-shell";

// All routes in this group render inside the authenticated app shell.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
