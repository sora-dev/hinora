import { redirect } from "next/navigation";

export default function AdminBranchesRedirectPage() {
  redirect("/admin/locations");
}
