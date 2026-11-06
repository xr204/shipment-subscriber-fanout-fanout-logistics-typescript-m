import { z } from "zod";

const proofOfDeliverySchema = z.object({
  objectKey: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/)
});

const subscriberSchema = z.object({
  subscriberId: z.string().min(1),
  role: z.enum(["customer", "operations"]),
  endpoint: z.string().url(),
  eventTypes: z.array(z.enum(["picked_up", "in_transit", "delivered", "exception"])).min(1)
});

export const shipmentRequestSchema = z.object({
  eventId: z.string().uuid(),
  orderId: z.string().min(1),
  shipmentId: z.string().min(1),
  occurredAt: z.string().datetime(),
  type: z.enum(["picked_up", "in_transit", "delivered", "exception"]),
  trackingNumber: z.string().min(1),
  proofOfDelivery: z.array(proofOfDeliverySchema).default([]),
  exception: z.object({
    reason: z.string().min(1),
    nextAction: z.string().min(1)
  }).optional(),
  subscribers: z.array(subscriberSchema).min(1)
}).superRefine((event, context) => {
  if (event.type === "exception" && !event.exception) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["exception"],
      message: "exception details are required for an exception event"
    });
  }
});

export type ShipmentRequest = z.infer<typeof shipmentRequestSchema>;
export type Subscriber = ShipmentRequest["subscribers"][number];

export function subscribersFor(event: ShipmentRequest): Subscriber[] {
  return event.subscribers.filter((subscriber) =>
    subscriber.eventTypes.includes(event.type) ||
    (event.type === "exception" && subscriber.role === "operations")
  );
}
