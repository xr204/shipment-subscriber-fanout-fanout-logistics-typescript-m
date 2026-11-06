import { infrai } from "./infrai_queue";
import { subscribersFor, type ShipmentRequest } from "./shipment_event";

export type FanoutResult = {
  eventId: string;
  queued: number;
  skipped: number;
};

export async function fanOutShipment(event: ShipmentRequest): Promise<FanoutResult> {
  const recipients = subscribersFor(event);

  await Promise.all(recipients.map((subscriber) =>
    infrai.queue.publish({
      queue: process.env.INFRAI_QUEUE ?? "shipment-notifications",
      payload: {
        event: {
          eventId: event.eventId,
          orderId: event.orderId,
          shipmentId: event.shipmentId,
          occurredAt: event.occurredAt,
          type: event.type,
          trackingNumber: event.trackingNumber,
          proofOfDelivery: event.proofOfDelivery,
          exception: event.exception
        },
        delivery: {
          subscriberId: subscriber.subscriberId,
          endpoint: subscriber.endpoint
        }
      }
    }, `${event.eventId}:${subscriber.subscriberId}`)
  ));

  return {
    eventId: event.eventId,
    queued: recipients.length,
    skipped: event.subscribers.length - recipients.length
  };
}
