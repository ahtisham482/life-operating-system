import { redirect } from "next/navigation";

// Redirect to the unified Settings page (Notifications tab)
export default function NotificationsPage() {
  redirect("/settings");
}
