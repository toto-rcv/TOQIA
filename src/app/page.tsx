import { redirect } from "next/navigation";

// La raíz no tiene contenido propio: o vas al panel o te manda al login.
export default function Home() {
  redirect("/admin");
}
