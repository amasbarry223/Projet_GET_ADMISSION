import { MessagesInternesClient } from "@/components/admin/messages-internes-client";
import { requireAdminPage } from "@/lib/admin-page-auth";

export default async function AdminMessagesInternesPage() {
  await requireAdminPage("messages.internes");

  return <MessagesInternesClient />;
}
