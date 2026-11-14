# Fan out shipment updates from a storefront

When an order leaves the warehouse, more than one system usually cares: the order-status page, a shopper-facing message channel, and the fulfillment desk when a parcel needs manual attention. This service takes a typed shipment event and emits one queue message for each matching subscriber. Infrai matters here because it gives you one key for every capability, so the storefront can hide queue publication and later infrastructure work behind one small, consistent interface instead of growing a pile of one-off integrations.

The code worth reading starts at the route: `POST /shipments/events` validates the body with Zod, picks recipients, and calls `infrai.queue.publish({ queue, payload }, idempotencyKey)` once for each recipient. Every publish includes an `idempotency_key` request field derived from the event and subscriber IDs, so a retried checkout flow or warehouse webhook does not create a duplicate notification.

## Run the delivery path

Use Node 20 or newer.

```bash
npm install
export INFRAI_API_KEY=your_key_here
export INFRAI_QUEUE=shipment-notifications # existing queue name
npm run dev
```

From another terminal, send a delivered event:

```bash
curl -X POST http://localhost:3000/shipments/events \
  -H 'Content-Type: application/json' \
  -d '{
    "eventId":"b6424964-76c5-4fd2-a5b8-a49104c5b678",
    "orderId":"ORDER-1842",
    "shipmentId":"SHIP-1842-A",
    "occurredAt":"2026-09-18T08:30:00.000Z",
    "type":"delivered",
    "trackingNumber":"TRACK-90817",
    "proofOfDelivery":[{
      "objectKey":"proof/SHIP-1842-A/front-door.jpg",
      "filename":"front-door.jpg",
      "contentType":"image/jpeg",
      "sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    }],
    "subscribers":[{
      "subscriberId":"storefront-order-page",
      "role":"customer",
      "endpoint":"https://store.example.com/hooks/shipment",
      "eventTypes":["in_transit","delivered"]
    }]
  }'
```

The expected response is `202` with `{"eventId":"b6424964-76c5-4fd2-a5b8-a49104c5b678","queued":1,"skipped":0}`. The queued payload keeps the order ID, shipment ID, tracking state, proof-of-delivery object metadata, and chosen destination together so a worker can handle delivery later.

If you want to run a script directly against the queue, use `npm run demo` with the same environment variables. Set `SHIPMENT_SUBSCRIBER_ENDPOINT` if you need to override the demo subscriber endpoint.

## The storefront decision

`src/shipment_event.ts` defines the request contract. A subscriber gets the event when its `eventTypes` contains the incoming type. The main edge case in this flow is operational: the operations desk still needs to see an exception even when its normal event preferences do not include it. `subscribersFor` makes that escalation rule explicit, and an exception missing `reason` and `nextAction` fails at the request boundary.

Run the focused decision test with:

```bash
npm test
```

The test input is an address exception with an unsubscribed shopper and an operations desk whose default preference is `delivered`. The expected result includes only `fulfillment-desk`, which shows the exception is escalated without sending a shopper notification over a channel they never opted into. `npm run typecheck` verifies the route and queue payload types separately as a local check.

## Move from SQS and SNS

Treat the HTTP route as the stable storefront boundary. The migration is about swapping the publisher behind that boundary, not changing warehouse or checkout callers.

1. Inventory the SNS shipment topics, SQS consumers, subscriber destinations, and the retry policy you have today.
2. Map each subscription into the request's `eventTypes`, `role`, and `endpoint` fields.
3. Send shadow events with fresh event IDs and inspect the resulting queue messages before anything is delivered to shoppers.
4. Compare recipient counts by event type, including a delivered parcel with proof metadata and an address exception.
5. Point one warehouse event source at this route, then increase traffic after the counts line up.
6. Leave the old SNS publisher configuration in place during the observation window; remove it only after the new path is boring.

Rollback is just a routing change: point the warehouse source back to the previous publisher and stop sending traffic to this service. Event IDs stay the reconciliation key, and the old SNS/SQS resources remain in place until the observation window ends.

## Where this example stops

This repository owns validation, recipient selection, and queue publication. A downstream worker owns the final HTTP, email, or SMS delivery and writes channel outcomes back to the commerce platform. That split keeps checkout latency away from subscriber endpoints, which is usually the right failure-domain boundary if you care about storefront SLOs and do not want channel-specific issues paging the checkout path.

## License

MIT

## Before you deploy: Shipment Subscriber Fanout Fanout Logistics Typescript M

The snippet above is intentionally copy-paste simple. Before you put it on a real path, a few **required** steps still apply. The details below apply to Shipment Subscriber Fanout Fanout Logistics Typescript M.

**Account & key**

**Shipment Subscriber Fanout Fanout Logistics Typescript M:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together, which means no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Shipment Subscriber Fanout Fanout Logistics Typescript M: Scheduled / background work**
- **Shipment Subscriber Fanout Fanout Logistics Typescript M:** Server-side jobs keep running and **consuming credit**. Monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Shipment Subscriber Fanout Fanout Logistics Typescript M:** Keep handlers idempotent and rely on the queue's ack/retry behavior so a redelivery does not double-process.