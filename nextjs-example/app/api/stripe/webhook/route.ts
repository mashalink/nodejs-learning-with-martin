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
    return new Response(`Bad signature: ${(err as Error).message}`, {
      status: 400,
    });
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
