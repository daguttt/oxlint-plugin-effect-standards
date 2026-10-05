import * as HelpersRouteFeat from '#routes/orgs/$subdomain/shelter/-helpers/-feat';
import * as RootRouteFeat from '#routes/-feat';
import * as ShelterRouteFeat from '#routes/orgs/$subdomain/shelter/-feat';

// ShelterRouteFeat.single is only mentioned here, never used.
export const mention = 'ShelterRouteFeat.single';
export const quotedMention = "ShelterRouteFeat['single']";
export const pattern = /ShelterRouteFeat.single/;
export const text = <div>ShelterRouteFeat.single</div>;
export const room: ShelterRouteFeat.Shared = String(ShelterRouteFeat.parked);
export const panel = <ShelterRouteFeat.Panel />;
export const internal = ShelterRouteFeat.internal;
export const flatOwned = ShelterRouteFeat.flatOwned;
export const { destructured } = ShelterRouteFeat;
export const optional = ShelterRouteFeat?.optional;
export const escaped = ShelterRouteFeat['escaped'];
export const helper = HelpersRouteFeat.helper;
export const rootOwned = RootRouteFeat.rootOwned;
const single = 'owned' as const;
export const computed = ShelterRouteFeat[single];
export const wrapped = (ShelterRouteFeat).wrapped;
export const { ['computedKey']: computedKey } = ShelterRouteFeat;
let assigned;
({ assigned } = ShelterRouteFeat);
export { assigned };
export const lazyOwned = ShelterRouteFeat.lazyOwned;
export const componentOwned = ShelterRouteFeat.componentOwned;
