"use client";

import { itemRemoved, selectCartItems } from "@/lib/features/cart/cartSlice";
import {
  fetchProducts,
  type Product,
} from "@/lib/features/products/productsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useEffect } from "react";

export default function CartPage() {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCartItems);
  const products = useAppSelector((s) => s.products.items);
  const productStatus = useAppSelector((s) => s.products.status);

  useEffect(() => {
    if (productStatus === "idle") dispatch(fetchProducts());
  }, [productStatus, dispatch]);

  // Join cart items with their product data
  const lines = items
    .map((i) => {
      const product = products.find((p) => p.id === i.productId);
      return product ? { product, quantity: i.quantity } : null;
    })
    .filter((x): x is { product: Product; quantity: number } => x !== null);

  const total = lines.reduce(
    (sum, l) => sum + Number(l.product.price) * l.quantity,
    0,
  );

  async function handleCheckout() {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const { url } = await res.json();
    window.location.href = url; // redirect to Stripe
  }

  return (
    <main className="flex-1 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Cart</h1>

        {lines.length === 0 && <p>Your cart is empty.</p>}

        <ul className="divide-y">
          {lines.map(({ product, quantity }) => (
            <li
              key={product.id}
              className="flex items-center justify-between py-3"
            >
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-zinc-500">
                  €{Number(product.price).toFixed(2)} × {quantity}
                </p>
              </div>
              <button
                onClick={() => dispatch(itemRemoved(product.id))}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        {lines.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-lg font-semibold">Total: €{total.toFixed(2)}</p>
            <button
              onClick={handleCheckout}
              className="rounded bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
