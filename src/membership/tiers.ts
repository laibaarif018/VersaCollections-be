import { MembershipTier } from '../common/enums';

export interface TierDefinition {
  tier: MembershipTier;
  name: string;
  tagline: string;
  /** Annual dues in minor units (cents); null = by invitation only. */
  dues: number | null;
  benefits: string[];
  /** The single most exclusive tier, highlighted in the storefront CTA. */
  highlighted: boolean;
}

export const MEMBERSHIP_TIERS: TierDefinition[] = [
  {
    tier: MembershipTier.Atelier,
    name: 'Atelier',
    tagline: 'An introduction to the house.',
    dues: 45000,
    benefits: [
      'First view of each seasonal release',
      'Complimentary worldwide delivery',
      'Lifetime restoration on leather goods',
      'Invitations to atelier open days',
    ],
    highlighted: false,
  },
  {
    tier: MembershipTier.Maison,
    name: 'Maison',
    tagline: 'For those who collect, not merely purchase.',
    dues: 120000,
    benefits: [
      'Everything in Atelier',
      'Access to member-reserved pieces',
      'A dedicated client advisor',
      'Two private appointments each year',
      'Priority on limited editions',
    ],
    highlighted: true,
  },
  {
    tier: MembershipTier.Prive,
    name: 'Privé',
    tagline: 'Twelve members. By invitation of the house.',
    dues: null,
    benefits: [
      'Everything in Maison',
      'Commission one-of-one pieces',
      'Direct correspondence with our master artisans',
      'The archive, opened privately',
    ],
    highlighted: false,
  },
];
