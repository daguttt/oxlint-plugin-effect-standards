// fixture: expect 1 route-feat-public-api (deep import); the barrel imports are fine
import * as CustomersRouteFeat from '#routes/orgs/$subdomain/customers/-feat';
import { helper as deep } from '#routes/orgs/$subdomain/customers/-feat/helper';

export const used = [deep, CustomersRouteFeat];
