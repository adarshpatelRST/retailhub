import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface StoreScopedFilter {
  id?: { in: string[] };
  regionId?: { in: string[] };
  storeId?: { in: string[] };
  store?: { regionId: { in: string[] } };
}

export type DataScopeTarget =
  | 'default'
  | 'store'
  | 'inventory'
  | 'transfer'
  | 'recommendation';

/**
 * Parameter decorator extracting the computed server-side Prisma `dataScope` filter
 * (`req.dataScope`) populated by `DataScopeGuard`.
 *
 * When `@DataScope()` or `@DataScope('inventory')` is called (for child tables with `storeId` FK):
 * - `STORE_MANAGER`     -> `{ storeId: { in: storeIds } }`
 * - `REGIONAL_MANAGER`  -> `{ store: { regionId: { in: regionIds } } }`
 * - `EXECUTIVE`/`ADMIN` -> `{}`
 *
 * When `@DataScope('store')` is called (for direct queries on the `Store` model):
 * - `STORE_MANAGER`     -> `{ id: { in: storeIds } }`
 * - `REGIONAL_MANAGER`  -> `{ regionId: { in: regionIds } }`
 * - `EXECUTIVE`/`ADMIN` -> `{}`
 */
export const DataScope = createParamDecorator(
  (
    target: DataScopeTarget | undefined,
    ctx: ExecutionContext,
  ): StoreScopedFilter => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { dataScope?: StoreScopedFilter }>();
    const rawScope = request.dataScope ?? {};

    if (target === 'store') {
      if (rawScope.storeId?.in) {
        return { id: { in: rawScope.storeId.in } };
      }
      if (rawScope.store?.regionId?.in) {
        return { regionId: { in: rawScope.store.regionId.in } };
      }
      return {};
    }

    return rawScope;
  },
);
