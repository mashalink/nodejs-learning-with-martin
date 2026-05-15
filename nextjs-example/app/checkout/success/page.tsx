// import { cartCleared } from "@/lib/features/cart/cartSlice";
import SuccessClient from "./SuccessClient";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  return (
    <main className="flex-1 p-8 text-center">
      <h1 className="text-3xl font-bold mb-2">Thanks!</h1>
      <p className="text-sm text-zinc-500">
        Session id: {session_id ?? "(none)"}
      </p>
      <SuccessClient />
    </main>
  );
}
