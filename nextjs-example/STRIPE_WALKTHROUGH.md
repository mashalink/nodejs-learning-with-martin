# Stripe Payments — Student Walkthrough

A guided tour of wiring up Stripe Checkout in this Next.js app. The goal is for
students to **understand** the moving parts of a payment flow without typing a
mountain of boilerplate. Every step has a "drop this in" snippet, then a few
lines on what it does and why.

> **Important:** Use Stripe **test mode** keys throughout. Never paste a live
> secret key into the repo, into a screenshot, or into a chat message.

---

## What we are building

```
[Product page]
   │  user clicks "Add to cart"
   ▼
[Redux cart slice]   ◄── existing /api/products feeds the products
   │  user clicks "Checkout"
   ▼
[POST /api/checkout]
   │  builds Stripe Checkout Session
   ▼
[Stripe-hosted payment page]   ←── Stripe handles the card UI, PCI, 3DS, etc.
   │  redirects after success
   ▼
[/checkout/success]   (also: [/checkout/cancel])

         (optional, server-only)
[POST /api/stripe/webhook] ◄── Stripe pings us when payment is *really* done.
                                 We log a fake "order" to the console. No DB.
```

**Why this shape?**

- **Stripe Checkout (hosted)** means we don't build a card form, don't touch
  card numbers, and don't worry about PCI compliance.
- **Cart in Redux** matches what real stores do and uses the slot already
  reserved in `lib/store.ts`.
- **Mocked orders** keep the focus on the payment flow, not on database design.
- **Webhook is the optional epilogue** — it teaches the most important
  production concept ("never trust the redirect, trust the webhook") in ~30
  lines of code.

---

## Concepts cheat sheet (read once, 3 min)

| Term | What it is |
|------|------------|
| **Publishable key** (`pk_test_…`) | Safe to ship to the browser. Identifies your account. |
| **Secret key** (`sk_test_…`) | Server-only. Can charge cards. Treat like a password. |
| **Checkout Session** | A short-lived object Stripe creates for one purchase attempt. Has a `url` you redirect the user to. |
| **Webhook secret** (`whsec_…`) | Used to verify that an incoming webhook actually came from Stripe. |
| **Smallest currency unit** | Stripe takes amounts as integers. €10.00 → `1000`. €0.99 → `99`. |
| **Test cards** | e.g. `4242 4242 4242 4242` with any future expiry + any CVC + any postcode. |

---

## Prerequisites

1. Node + npm already installed (the repo runs).
2. A Stripe account in **test mode** (you have this).
3. Ask the instructor (Martin) for:
   - `STRIPE_SECRET_KEY` (looks like `sk_test_…`)
   - `STRIPE_PUBLISHABLE_KEY` (looks like `pk_test_…`)
   - `STRIPE_WEBHOOK_SECRET` (only needed for step 9 — `whsec_…`)

---

## Step 1 — Install the Stripe SDK

```bash
npm install stripe
```

That's it. One package, server-side. We don't need `@stripe/stripe-js` because
the hosted Checkout page does the redirect for us.

> **Why only one package?** We're using **redirect to Stripe-hosted Checkout**,
> not embedded Stripe Elements. The browser never holds a Stripe client.

---

## Step 2 — Add environment variables

Create a file `.env.local` at the repo root:

```bash
# .env.local  (DO NOT COMMIT — this file is already gitignored by Next.js)
STRIPE_SECRET_KEY=sk_test_replace_me
STRIPE_PUBLISHABLE_KEY=pk_test_replace_me

# Used by the Stripe SDK to build redirect URLs. Change for production.
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Step 9 only. Leave blank for now.
STRIPE_WEBHOOK_SECRET=
```

Notes for students:
- `NEXT_PUBLIC_*` variables are exposed to the browser. Everything else is
  server-only.
- Restart `npm run dev` after editing `.env.local` — Next picks up env files at
  startup.
- Confirm `.env.local` is gitignored (`git status` should not list it).

---

## Step 3 — Add a `cart` slice to Redux

Create `lib/features/cart/cartSlice.ts`:

```ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../store";

export type CartItem = {
  productId: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
};

const initialState: CartState = { items: [] };

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    itemAdded(state, action: PayloadAction<string>) {
      const existing = state.items.find((i) => i.productId === action.payload);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.items.push({ productId: action.payload, quantity: 1 });
      }
    },
    itemRemoved(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.productId !== action.payload);
    },
    cartCleared(state) {
      state.items = [];
    },
  },
});

// Selectors — keep "derived data" out of the slice itself.
export const selectCartItems = (s: RootState) => s.cart.items;
export const selectCartCount = (s: RootState) =>
  s.cart.items.reduce((n, i) => n + i.quantity, 0);

export const { itemAdded, itemRemoved, cartCleared } = cartSlice.actions;
export default cartSlice.reducer;
```

Wire it into the store — edit `lib/store.ts`:

```ts
import { configureStore } from "@reduxjs/toolkit";
import productsReducer from "../lib/features/products/productsSlice";
import cartReducer from "../lib/features/cart/cartSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      products: productsReducer,
      cart: cartReducer,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
```

**Discussion point:** Notice the cart only stores `productId` + `quantity`. The
full product (name, price, image) lives in the `products` slice. Storing the
same data twice is the classic state bug — we look it up by id when we need it.

---

## Step 4 — Add an "Add to cart" button to the Redux products page

Edit `app/products/redux/page.tsx`. Inside `ProductCard`, after the stock line,
add a button that dispatches `itemAdded`:

```tsx
// near the top of the file
import { itemAdded } from "@/lib/features/cart/cartSlice";

// inside the redux page component, get dispatch (already in scope as `dispatch`)
// inside ProductCard's render, after the stock <p>:
<button
  onClick={(e) => {
    e.stopPropagation();
    onAddToCart();
  }}
  className="mt-3 w-full rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
>
  Add to cart
</button>
```

Pass `onAddToCart={() => dispatch(itemAdded(product.id))}` from the parent into
`ProductCard`, alongside the existing `onSelect` prop.

> **Why `e.stopPropagation()`?** The `<li>` already has an `onClick` that
> selects the card. Without `stopPropagation`, clicking the button would also
> select the card. This is a teachable React event-bubbling moment.

> **Why only the redux page?** The basic page uses local state and isn't aware
> of the cart slice. Leaving it untouched is a nice contrast for students:
> *"Look how much easier this is when state is shared."*

---

## Step 5 — Show the cart in the header

Edit `app/components/Header.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useAppSelector } from "@/lib/hooks";
import { selectCartCount } from "@/lib/features/cart/cartSlice";

const Header = () => {
  const count = useAppSelector(selectCartCount);
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
        <Link href="/" className="text-lg font-bold">NextJS Example</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/products/basic" className="hover:text-blue-600">Products (basic)</Link>
          <Link href="/products/redux" className="hover:text-blue-600">Products (redux)</Link>
          <Link href="/cart" className="hover:text-blue-600">
            Cart ({count})
          </Link>
        </nav>
      </div>
    </header>
  );
};
export default Header;
```

The header is now a client component (`"use client"`) because it subscribes to
Redux. That's fine — it's tiny.

---

## Step 6 — Build the cart / checkout page

Create `app/cart/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  fetchProducts,
  type Product,
} from "@/lib/features/products/productsSlice";
import {
  selectCartItems,
  itemRemoved,
} from "@/lib/features/cart/cartSlice";

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
            <li key={product.id} className="flex items-center justify-between py-3">
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
```

**Things to point out to students:**

- The cart only stores ids; we *join* against the products in render.
- We send `items` (just ids + quantities) to the server. **Do not** send the
  price — the server must look that up itself. Otherwise a malicious user could
  POST `{price: 0.01}` and buy anything for a penny. This is the single most
  important security idea in payments.

---

## Step 7 — Create the Checkout Session API route

Create `app/api/checkout/route.ts`:

```ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

type IncomingItem = { productId: string; quantity: number };

export async function POST(request: Request) {
  const { items } = (await request.json()) as { items: IncomingItem[] };

  // Look up product data on the server — trust nothing from the client.
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
  const productsRes = await fetch(`${supabaseUrl}/rest/v1/products`, {
    headers: { Authorization: `Bearer ${supabaseAnonKey}`, apikey: supabaseAnonKey },
  });
  const products = (await productsRes.json()) as Array<{
    id: string;
    name: string;
    price: string; // numeric-as-string from Supabase
  }>;

  const line_items = items.map((i) => {
    const product = products.find((p) => p.id === i.productId);
    if (!product) throw new Error(`Unknown product ${i.productId}`);
    return {
      price_data: {
        currency: "eur",
        product_data: { name: product.name },
        // Stripe expects the smallest currency unit (cents).
        unit_amount: Math.round(Number(product.price) * 100),
      },
      quantity: i.quantity,
    };
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items,
    success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/checkout/cancel`,
  });

  return Response.json({ url: session.url });
}
```

**Discussion points:**

- `unit_amount: Math.round(Number(product.price) * 100)` — Stripe wants
  integer cents. Get this wrong and you charge 100× too much. Live demo
  invitation: console.log it.
- `{CHECKOUT_SESSION_ID}` is a literal Stripe template — Stripe substitutes the
  real id when redirecting.
- The whole flow is one Stripe API call. That's the entire integration.

---

## Step 8 — Success and cancel pages

Create `app/checkout/success/page.tsx`:

```tsx
import { cartCleared } from "@/lib/features/cart/cartSlice";
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
      <p className="text-sm text-zinc-500">Session id: {session_id ?? "(none)"}</p>
      <SuccessClient />
    </main>
  );
}
```

And `app/checkout/success/SuccessClient.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks";
import { cartCleared } from "@/lib/features/cart/cartSlice";

export default function SuccessClient() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(cartCleared());
  }, [dispatch]);
  return null;
}
```

And `app/checkout/cancel/page.tsx`:

```tsx
export default function CancelPage() {
  return (
    <main className="flex-1 p-8 text-center">
      <h1 className="text-3xl font-bold mb-2">Payment cancelled</h1>
      <p>No charge was made. Your cart is still here.</p>
    </main>
  );
}
```

> **Why split the success page into server + client?** In Next 16 `searchParams`
> is an awaited Promise on the server. Dispatching to Redux needs a client
> component. So we read `session_id` server-side, render the message, and let a
> small client child clear the cart. This is a nice teaching example of the
> server/client split.

---

## Step 9 — Run it end-to-end

1. `npm run dev`
2. Open http://localhost:3000/products/redux
3. Click **Add to cart** on a few products.
4. Click **Cart (N)** in the header → **Checkout**.
5. You're on Stripe's hosted page. Use test card:
   - Number: `4242 4242 4242 4242`
   - Expiry: anything in the future (`12/34`)
   - CVC: any 3 digits
   - Postcode: any 5 digits
6. You'll land back on `/checkout/success?session_id=cs_test_…` and the cart
   will be empty.

If it fails, the most common reasons are:
- `.env.local` not picked up (you forgot to restart `npm run dev`).
- Wrong key pasted (publishable vs secret swapped).
- Product price is `0` in the DB → Stripe rejects amounts below 50 cents.

---

## Step 10 — (Optional) Add the webhook

This is the most important production concept and is also the most fragile
locally. Skip it on first run-through if time is short.

### 10a. Install the Stripe CLI

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

### 10b. Create the webhook route

`app/api/stripe/webhook/route.ts`:

```ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text(); // must be the raw body for signature check
  const signature = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Bad signature: ${(err as Error).message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    // ── This is where a real app saves an Order row to the DB. ──
    // For the demo we just log it.
    console.log("[stripe] paid", {
      id: session.id,
      amount_total: session.amount_total,
      customer_email: session.customer_details?.email,
    });
  }

  return new Response("ok");
}
```

### 10c. Run the listener

In a separate terminal:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

It prints a `whsec_…`. Paste that into `.env.local` as `STRIPE_WEBHOOK_SECRET`
and restart `npm run dev`.

### 10d. Pay again, watch the log

Do another test purchase. You'll see the `[stripe] paid` line in your
`npm run dev` terminal. **That** is the moment money actually moved — not the
redirect to `/checkout/success`. The redirect can be faked by anyone typing
the URL.

**Teaching beat:** ask the students: *"Why don't we just create the order on
the success page?"* Answer: because the user can close the tab before the
redirect, lose their connection, or simply type the URL by hand. The webhook
is Stripe telling your server, server-to-server, that the money moved.

---

## Step 11 — Moving to production (what changes)

When you eventually deploy this (Vercel, Fly, etc.):

| Local (`.env.local`) | Production (host's env var UI) |
|----------------------|--------------------------------|
| `STRIPE_SECRET_KEY=sk_test_…` | `STRIPE_SECRET_KEY=sk_live_…` |
| `STRIPE_PUBLISHABLE_KEY=pk_test_…` | `STRIPE_PUBLISHABLE_KEY=pk_live_…` |
| `NEXT_PUBLIC_SITE_URL=http://localhost:3000` | `NEXT_PUBLIC_SITE_URL=https://yourdomain.com` |
| `STRIPE_WEBHOOK_SECRET=whsec_…` (from `stripe listen`) | `STRIPE_WEBHOOK_SECRET=whsec_…` (from the Stripe Dashboard → Webhooks → your endpoint) |

**Checklist before flipping to live keys:**

- [ ] All `sk_test_…` and `pk_test_…` replaced with `sk_live_…` / `pk_live_…`.
- [ ] `NEXT_PUBLIC_SITE_URL` points at your real domain (Stripe will refuse
      `http://localhost` `success_url`s in live mode).
- [ ] A live webhook endpoint is registered in the Stripe Dashboard pointing
      at `https://yourdomain.com/api/stripe/webhook`. Its signing secret
      replaces the local `whsec_…`.
- [ ] You actually persist the order somewhere (a database row, an email,
      anything). Console-logging it in production is not enough.
- [ ] Your `.env.local` is **not** committed.

---

## Common pitfalls (FAQ)

**"Stripe says no such price."**
You sent `price_data` with `unit_amount: 0`. Check the product price in the
DB.

**"Signature verification failed."**
Either the `STRIPE_WEBHOOK_SECRET` is wrong, or you didn't read the raw body
with `request.text()` (parsing as JSON breaks the signature).

**"My cart is empty after I refresh the page."**
Correct — the Redux store lives in memory and is recreated per page load.
That's deliberate for this lesson. A real app would persist it to
`localStorage` or a backend.

**"The success page doesn't show anything."**
Check the URL. If `session_id` is missing, the `success_url` in step 7 is
malformed.

---

## Where to go next (stretch goals)

Once the base flow works, optional extensions for keen students:

1. **Persist the cart** to `localStorage` so it survives refresh.
2. **Quantity controls** in the cart line items.
3. **Stripe Tax** — flip on tax calculation in the Checkout Session.
4. **Real orders table** — replace the `console.log` in the webhook with an
   `INSERT` into a Supabase `orders` table.
5. **Email receipts** — Stripe sends them automatically if you set
   `customer_email` on the session.
