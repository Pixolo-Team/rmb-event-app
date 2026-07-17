import { AdminGate } from "../components/AdminGate";

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return <AdminGate>{children}</AdminGate>;
}
