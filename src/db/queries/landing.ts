import { eq } from "drizzle-orm";

import { accounts, bracelets, db, locations } from "@/db";

/**
 * Todo lo que hace falta para resolver un escaneo y armar la landing, en una
 * sola consulta. Es la única query en el camino crítico del escaneo.
 */
export type ResolvedBracelet = {
  braceletId: number;
  braceletActive: boolean;
  waiterId: number | null;
  overrideUrl: string | null;

  locationId: number;
  locationActive: boolean;

  accountId: number;
  accountActive: boolean;
  subscriptionStatus: string;

  landing: {
    name: string;
    displayName: string | null;
    tagline: string | null;
    logoUrl: string | null;
    coverImageUrl: string | null;
    googleReviewUrl: string | null;
    instagramUrl: string | null;
    whatsappPhone: string | null;
    phone: string | null;
    websiteUrl: string | null;
    menuUrl: string | null;
    reservationUrl: string | null;
    address: string | null;
    mapsUrl: string | null;
    welcomeKicker: string | null;
    welcomeTitle: string | null;
    closingMessage: string | null;
    closingImageUrl: string | null;
    menuHeaderImageUrl: string | null;
    menuMode: string;
  };
};

export async function resolveBraceletByCode(
  code: string
): Promise<ResolvedBracelet | null> {
  const rows = await db
    .select({
      braceletId: bracelets.id,
      braceletActive: bracelets.active,
      waiterId: bracelets.waiterId,
      overrideUrl: bracelets.overrideUrl,

      locationId: locations.id,
      locationActive: locations.active,

      accountId: accounts.id,
      accountActive: accounts.active,
      subscriptionStatus: accounts.subscriptionStatus,

      name: locations.name,
      displayName: locations.displayName,
      tagline: locations.tagline,
      logoUrl: locations.logoUrl,
      coverImageUrl: locations.coverImageUrl,
      googleReviewUrl: locations.googleReviewUrl,
      instagramUrl: locations.instagramUrl,
      whatsappPhone: locations.whatsappPhone,
      phone: locations.phone,
      websiteUrl: locations.websiteUrl,
      menuUrl: locations.menuUrl,
      reservationUrl: locations.reservationUrl,
      address: locations.address,
      mapsUrl: locations.mapsUrl,
      welcomeKicker: locations.welcomeKicker,
      welcomeTitle: locations.welcomeTitle,
      closingMessage: locations.closingMessage,
      closingImageUrl: locations.closingImageUrl,
      menuHeaderImageUrl: locations.menuHeaderImageUrl,
      menuMode: locations.menuMode,
    })
    .from(bracelets)
    .innerJoin(locations, eq(bracelets.locationId, locations.id))
    .innerJoin(accounts, eq(locations.accountId, accounts.id))
    .where(eq(bracelets.code, code))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    braceletId: row.braceletId,
    braceletActive: row.braceletActive,
    waiterId: row.waiterId,
    overrideUrl: row.overrideUrl,
    locationId: row.locationId,
    locationActive: row.locationActive,
    accountId: row.accountId,
    accountActive: row.accountActive,
    subscriptionStatus: row.subscriptionStatus,
    landing: {
      name: row.name,
      displayName: row.displayName,
      tagline: row.tagline,
      logoUrl: row.logoUrl,
      coverImageUrl: row.coverImageUrl,
      googleReviewUrl: row.googleReviewUrl,
      instagramUrl: row.instagramUrl,
      whatsappPhone: row.whatsappPhone,
      phone: row.phone,
      websiteUrl: row.websiteUrl,
      menuUrl: row.menuUrl,
      reservationUrl: row.reservationUrl,
      address: row.address,
      mapsUrl: row.mapsUrl,
      welcomeKicker: row.welcomeKicker,
      welcomeTitle: row.welcomeTitle,
      closingMessage: row.closingMessage,
      closingImageUrl: row.closingImageUrl,
      menuHeaderImageUrl: row.menuHeaderImageUrl,
      menuMode: row.menuMode,
    },
  };
}
