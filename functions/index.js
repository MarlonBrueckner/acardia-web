// functions/index.js
require("dotenv").config(); // .env im functions-Ordner laden

const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const Stripe = require("stripe");

admin.initializeApp();

// ✅ Custom Token für WebView SSO
exports.createWebCustomToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Not signed in.");
  }

  const uid = context.auth.uid;
  const token = await admin.auth().createCustomToken(uid);
  return { token };
});




// Stripe-Secret aus ENV holen
const stripeSecret = process.env.STRIPE_SECRET_KEY;

if (!stripeSecret) {
  throw new Error("Missing STRIPE_SECRET_KEY in functions/.env");
}

const stripe = Stripe(stripeSecret, {
  apiVersion: "2024-06-20", // stabile Version, nicht "2025-08-27.basil"
});

// Preise + Origin aus ENV
const PRICE_PRO_WEEKLY =
  process.env.STRIPE_PRICE_PRO_WEEKLY || process.env.REACT_APP_PRICE_PRO_WEEKLY;
const PRICE_ADV_WEEKLY =
  process.env.STRIPE_PRICE_ADV_WEEKLY || process.env.REACT_APP_PRICE_ADV_WEEKLY;

const ORIGIN = process.env.ORIGIN || "https://acardia-journal.web.app";

// ---------------- createCheckoutSession ----------------
// ---------------- createCheckoutSession ----------------
exports.createCheckoutSessionV2 = functions
  .region("europe-west1")              // <--- WICHTIG
  .https.onCall(async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Not signed in"
      );
    }

    const plan = data.plan; // "adv" oder "pro"
    const priceId = plan === "pro" ? PRICE_PRO_WEEKLY : PRICE_ADV_WEEKLY;

    if (!priceId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Unknown or missing plan"
      );
    }

    const userRef = admin.firestore().doc(`users/${uid}`);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};

    let customerId = userData.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: context.auth.token.email,
        metadata: { uid },
      });
      customerId = customer.id;

      await userRef.set(
        { stripeCustomerId: customerId },
        { merge: true }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${ORIGIN}/settings?tab=subscription&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${ORIGIN}/settings?tab=subscription&cancelled=1`,
      metadata: {
        uid,
        plan, // "adv" oder "pro"
      },
    });

    return { url: session.url };
  });

// ---------------- handleStripeWebhook ----------------
exports.handleStripeWebhook = functions
  .region("europe-west1")        // optional aber sauber
  .https.onRequest(async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET in functions/.env");
      return res.status(500).send("Webhook not configured");
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        endpointSecret
      );
    } catch (err) {
      console.error("Webhook signature verification failed.", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const uid = session.metadata?.uid;
      const plan = session.metadata?.plan; // "adv" oder "pro"
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      if (uid && customerId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId
        );

        await admin.firestore().doc(`users/${uid}`).set(
          {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            plan, // "adv" oder "pro"
            subscription: {
              status: subscription.status,
              current_period_end: subscription.current_period_end * 1000,
              role: plan,
            },
          },
          { merge: true }
        );
      }
      break;
    }

const { FieldValue } = admin.firestore;

case "customer.subscription.updated":
case "customer.subscription.deleted": {
  const sub = event.data.object;
  const customerId = sub.customer;

  const users = await admin
    .firestore()
    .collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  if (!users.empty) {
    const userRef = users.docs[0].ref;

    const status = String(sub.status || "").toLowerCase();
    const isActive = status === "active" || status === "trialing";

    // plan aus metadata oder aus Preis-ID ableiten
    let plan = "";
    if (isActive) {
      if (sub.metadata?.plan) {
        plan = String(sub.metadata.plan).toLowerCase(); // "pro" | "adv"
      } else {
        const priceId = sub.items?.data?.[0]?.price?.id;
        if (priceId === process.env.STRIPE_PRICE_PRO_WEEKLY) plan = "pro";
        else if (priceId === process.env.STRIPE_PRICE_ADV_WEEKLY) plan = "adv";
      }
    }

    await userRef.set(
      {
        // Root-Plan: aktiv = "pro"/"adv", sonst löschen/leer
        plan: isActive ? plan : "",
        subscription: {
          status,                                 // z.B. "active" / "canceled"
          current_period_end: sub.current_period_end * 1000,
          role: plan,                             // gleiche Kurzform
        },
      },
      { merge: true }
    );
  }
  break;
}



    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.sendStatus(200);
});
