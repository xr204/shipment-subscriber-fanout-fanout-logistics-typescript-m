import { createServer, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import { ZodError } from "zod";
import { InfraiError } from "./infrai_queue";
import { shipmentRequestSchema } from "./shipment_event";
import { fanOutShipment } from "./shipment_fanout";

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

export const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/shipments/events") {
    send(response, 404, { error: "route not found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const event = shipmentRequestSchema.parse(input);
    const result = await fanOutShipment(event);
    send(response, 202, result);
  } catch (error) {
    if (error instanceof ZodError) {
      send(response, 400, { error: "invalid shipment event", issues: error.issues });
      return;
    }
    if (error instanceof SyntaxError) {
      send(response, 400, { error: "request body must be valid JSON" });
      return;
    }
    if (error instanceof InfraiError && error.status >= 400 && error.status < 500) {
      send(response, error.status, { error: error.code, message: error.message });
      return;
    }
    console.error(error);
    send(response, 502, { error: "notification queue request failed" });
  }
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`Shipment notification service listening on ${port}`));
}
