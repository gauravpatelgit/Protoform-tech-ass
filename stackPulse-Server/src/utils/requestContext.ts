import { AsyncLocalStorage } from "async_hooks";

interface RequestContext {
  correlationId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const getCorrelationId = (): string | undefined => requestContext.getStore()?.correlationId;
