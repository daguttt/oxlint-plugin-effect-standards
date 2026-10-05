import * as RootRouteFeat from '#routes/-feat';
import * as ShelterRouteFeat from '#routes/orgs/$subdomain/shelter/-feat';

export const values = [
  ShelterRouteFeat.owned,
  ShelterRouteFeat.parked,
  ShelterRouteFeat.single,
  ShelterRouteFeat.nestedOnly,
  ShelterRouteFeat.internal,
  ShelterRouteFeat.flatOwned,
  ShelterRouteFeat.flatShared,
];
export type Count = ShelterRouteFeat.TypeOnly;
export const rootOwned = RootRouteFeat.rootOwned;
export const lazyOwned = ShelterRouteFeat.lazyOwned;
export const componentOwned = ShelterRouteFeat.componentOwned;
