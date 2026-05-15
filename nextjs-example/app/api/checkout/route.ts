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
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
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
