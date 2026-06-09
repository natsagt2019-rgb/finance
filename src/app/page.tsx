import { redirect } from "next/navigation";

// Нүүр хуудас — middleware нэвтрэлтийг шалгана. Энд шууд dashboard руу чиглүүлнэ.
export default function Home() {
  redirect("/dashboard");
}
