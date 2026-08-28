import { x402ResourceServer, type RoutesConfig } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware } from "@x402/express";
import type { CashflowConfig } from "../config.js";
import { resolveFacilitator } from "./facilitator.js";

export type ChargeRoutes = RoutesConfig;

/**
 * `x402 in`: Express middleware that charges per request for the given
 * routes, settling through the configured facilitator. Drop it in front of
 * any route the agent wants to sell access to.
 *
 * ```ts
 * app.use(charge({
 *   "GET /premium": { accepts: { scheme: "exact", price: "$0.01", network: config.network.caip2, payTo: config.address! } },
 * }, config));
 * ```
 */
export function charge(routes: ChargeRoutes, config: CashflowConfig) {
  const facilitator = resolveFacilitator(config);
  const resourceServer = new x402ResourceServer(facilitator).register(
    "eip155:*",
    new ExactEvmScheme(),
  );
  return paymentMiddleware(routes, resourceServer);
}
