import { shipmentRequestSchema } from "./shipment_event";
import { fanOutShipment } from "./shipment_fanout";

const event = shipmentRequestSchema.parse({
  eventId: "b6424964-76c5-4fd2-a5b8-a49104c5b678",
  orderId: "ORDER-1842",
  shipmentId: "SHIP-1842-A",
  occurredAt: "2026-09-18T08:30:00.000Z",
  type: "delivered",
  trackingNumber: "TRACK-90817",
  proofOfDelivery: [{
    objectKey: "proof/SHIP-1842-A/front-door.jpg",
    filename: "front-door.jpg",
    contentType: "image/jpeg",
    sha256: "a".repeat(64)
  }],
  subscribers: [{
    subscriberId: "storefront-order-page",
    role: "customer",
    endpoint: process.env.SHIPMENT_SUBSCRIBER_ENDPOINT ?? "https://store.example.com/hooks/shipment",
    eventTypes: ["in_transit", "delivered"]
  }]
});

console.log(await fanOutShipment(event));
