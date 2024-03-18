import Stripe from "stripe";
import getRawBody from "raw-body";
import { NextApiRequest, NextApiResponse } from "next";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16",
});

const endpointKey = process.env.WEBHOOK_KEY as string;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log("headers:", req.headers);
    if (req.method !== "POST") {
      return res.status(405).send("POST method is not allowed");
    }

    const sig: any = req.headers["stripe-signature"];
    const rawBody = await getRawBody(req);
    let event: any;

    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointKey);
    } catch (error: any) {
      res.status(500).send(`Webhook error: ${error.message}`);
    }

    console.log("event type: ", JSON.stringify(event.type));
    if (event.type === "checkout.session.completed") {
      const sessionWithLineItem = await stripe.checkout.sessions.retrieve(
        (event.data.object as any).id,
        { expand: ["line_items"] }
      );
      const lineItems: any = sessionWithLineItem.line_items;
      if (!lineItems) {
        res.status(400).send("Internal server error");
      }

      // * can be handled the after method to save data or anything the you want
      console.log("Order Fulfilled");
      console.log("items", lineItems.data);
      console.log("customer", (event.data.object as any).customer_details.email);
      console.log(`created: `, (event.data.object as any).created);
    }

    res.status(200).end();
  } catch (error: any) {
    console.log(error);
    res.status(500).send(error.message);
  }
}
