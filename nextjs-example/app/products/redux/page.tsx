"use client";
import { itemAdded } from "@/lib/features/cart/cartSlice";
import {
  fetchProducts,
  productSelected,
  type Product,
} from "@/lib/features/products/productsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useEffect } from "react";

export default function ProductsReduxPage() {
  const dispatch = useAppDispatch();
  const { items, status, error, selectedId } = useAppSelector(
    (s) => s.products,
  );
  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchProducts());
    }
  }, [status, dispatch]);
  return (
    <main className="flex-1 p-8 bg-zinc-50 dark:bg-black">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Products — Redux</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Same UI, but state lives in the Redux store. Fetch is a{" "}
            <code>createAsyncThunk</code>, selection is a sync action. Open
            Redux DevTools to watch actions flow.
          </p>
        </header>
        {status === "loading" && <p>Loading…</p>}
        {status === "failed" && <p className="text-red-600">Error: {error}</p>}
        {status === "succeeded" && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                selected={product.id === selectedId}
                onSelect={() => dispatch(productSelected(product.id))}
                onAddToCart={() => dispatch(itemAdded(product.id))}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
function ProductCard({
  product,
  selected,
  onSelect,
  onAddToCart,
}: {
  product: Product;
  selected: boolean;
  onSelect: () => void;
  onAddToCart: () => void;
}) {
  return (
    <li
      onClick={onSelect}
      className={`cursor-pointer overflow-hidden rounded-lg border bg-white dark:bg-zinc-950 transition ${
        selected
          ? "border-blue-500 ring-2 ring-blue-500/30"
          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
      }`}
    >
      {product.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image_url}
          alt={product.name}
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className="h-40 w-full bg-zinc-100 dark:bg-zinc-900" />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{product.name}</h3>
          {product.status === "archived" && (
            <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              archived
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">{product.sku}</p>
        <p className="mt-2 text-lg font-medium">
          €{Number(product.price).toFixed(2)}
        </p>
        {product.description && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {product.description}
          </p>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          Stock: {product.stock_quantity} · {product.supplier}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart();
          }}
          className="mt-3 w-full rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
        >
          Add to cart
        </button>
      </div>
    </li>
  );
}
