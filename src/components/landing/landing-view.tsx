import {
  ExternalLink,
  Globe,
  Instagram,
  MapPin,
  MessageCircle,
  UtensilsCrossed,
} from "lucide-react";

import { ReviewButton } from "@/app/r/[code]/review-button";
import { mapsUrlFor, safeUrl, whatsappUrl } from "@/lib/url";

export type LandingData = {
  name: string;
  displayName: string | null;
  tagline: string | null;
  logoUrl: string | null;
  googleReviewUrl: string | null;
  instagramUrl: string | null;
  whatsappPhone: string | null;
  websiteUrl: string | null;
  menuUrl: string | null;
  address: string | null;
  mapsUrl: string | null;
};

/**
 * La página que ve el cliente del restaurante.
 *
 * Se usa en dos lados: el escaneo real (`/r/[code]`) y la vista previa del
 * panel. La única diferencia es el `token`: en la vista previa es null y el
 * clic no se contabiliza.
 *
 * Diseño mobile-first: una columna de 440px máximo, un botón por fila, área de
 * toque de 56px para arriba. El botón de reseña es el único con el dorado
 * encendido; el resto queda un escalón por debajo a propósito, para que la
 * acción principal no compita con nada.
 */
export function LandingView({
  landing,
  token,
}: {
  landing: LandingData;
  token: string | null;
}) {
  const nombre = landing.displayName?.trim() || landing.name;
  const reviewUrl = safeUrl(landing.googleReviewUrl);

  const enlaces = [
    { href: safeUrl(landing.menuUrl), label: "Ver el menú", Icon: UtensilsCrossed },
    { href: safeUrl(landing.instagramUrl), label: "Instagram", Icon: Instagram },
    { href: whatsappUrl(landing.whatsappPhone), label: "WhatsApp", Icon: MessageCircle },
    { href: mapsUrlFor(landing.mapsUrl, landing.address), label: "Cómo llegar", Icon: MapPin },
    { href: safeUrl(landing.websiteUrl), label: "Sitio web", Icon: Globe },
  ].filter(
    (enlace): enlace is { href: string; label: string; Icon: typeof Globe } =>
      Boolean(enlace.href)
  );

  return (
    <main className="tq-page flex flex-col items-center px-5 pb-10 pt-12">
      <div className="w-full max-w-[440px]">
        {/* El logo va arriba de todo. */}
        <header className="flex flex-col items-center text-center">
          {landing.logoUrl ? (
            // Logo remoto y distinto por local: un <img> plano evita tener que
            // declarar cada dominio en la configuración de next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={landing.logoUrl}
              alt={nombre}
              className="mb-6 h-24 w-auto max-w-[220px] object-contain"
            />
          ) : (
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-tq-gold/50 text-3xl font-semibold text-tq-gold">
              {nombre.charAt(0).toUpperCase()}
            </div>
          )}

          <h1 className="text-2xl font-semibold tracking-tight text-tq-text">
            {nombre}
          </h1>

          {landing.tagline ? (
            <p className="mt-2 text-sm text-tq-text-muted">{landing.tagline}</p>
          ) : null}
        </header>

        <div className="tq-divider my-8" />

        {reviewUrl ? (
          <>
            <p className="mb-4 text-center text-[15px] text-tq-text-muted">
              ¿Cómo la pasaste? Contanos en Google, nos ayuda muchísimo.
            </p>
            <ReviewButton href={reviewUrl} token={token} />
          </>
        ) : (
          <p className="rounded-xl border border-tq-border bg-tq-surface px-5 py-4 text-center text-sm text-tq-text-muted">
            Este local todavía no configuró su enlace de reseñas.
          </p>
        )}

        {enlaces.length > 0 ? (
          <nav className="mt-8 flex flex-col gap-3">
            {enlaces.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="tq-btn"
              >
                <Icon className="tq-icon" aria-hidden />
                <span className="flex-1 text-left">{label}</span>
                <ExternalLink className="size-4 shrink-0 text-tq-text-muted" aria-hidden />
              </a>
            ))}
          </nav>
        ) : null}

        {landing.address ? (
          <p className="mt-8 text-center text-xs leading-relaxed text-tq-text-muted">
            {landing.address}
          </p>
        ) : null}

        <p className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-tq-text-muted/60">
          Toqia
        </p>
      </div>
    </main>
  );
}
