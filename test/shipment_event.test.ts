import { describe, expect, it } from "vitest";
import { shipmentRequestSchema, subscribersFor } from "../src/shipment_event";

describe("shipment subscriber decision", () => {
  it("adds operations to an exception fanout while skipping an unsubscribed customer", () => {
    const event = shipmentRequestSchema.parse({
      eventId: "9d282a52-c09c-4a21-a830-c98908958b50",
      orderId: "ORDER-77",
      shipmentId: "SHIP-77-A",
      occurredAt: "2026-09-18T09:15:00.000Z",
      type: "exception",
      trackingNumber: "TRACK-77",
      proofOfDelivery: [],
      exception: { reason: "address mismatch", nextAction: "contact shopper" },
      subscribers: [
        {
          subscriberId: "shopper-sms",
          role: "customer",
          endpoint: "https://store.example.com/hooks/sms",
          eventTypes: ["delivered"]
        },
        {
          subscriberId: "fulfillment-desk",
          role: "operations",
          endpoint: "https://ops.example.com/hooks/exceptions",
          eventTypes: ["delivered"]
        }
      ]
    });

    expect(subscribersFor(event).map((subscriber) => subscriber.subscriberId))
      .toEqual(["fulfillment-desk"]);
  });
});
