import Link from "next/link";
import {
  CalendarDays,
  Globe,
  MapPin,
  Phone,
  Star,
  UtensilsCrossed,
} from "lucide-react";

import { ReviewButton } from "@/app/r/[code]/review-button";
import {
  mapsUrlFor,
  reservationUrlFor,
  safeUrl,
  telUrl,
  whatsappUrl,
} from "@/lib/url";
import { InstagramIcon, WhatsAppIcon } from "./brand-icons";

export type LandingData = {
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
  /** Imagen que encabeza la carta. No se usa en la landing, sí en /carta. */
  menuHeaderImageUrl: string | null;
  /** "toqia" (la carta del panel) o "pdf" (el archivo que subió el local). */
  menuMode: string;
};

/** Un botón de la grilla de accesos rápidos. */
type Acceso = {
  href: string | null;
  /** true = navegación dentro de Toqia (la carta propia). */
  interno: boolean;
  title: string;
  sub: string;
  icon: React.ReactNode;
};

/**
 * La página que ve el cliente del restaurante al apoyar el celular.
 *
 * Se usa en tres lados: el escaneo real (`/r/[code]`), la carta (que comparte
 * la cabecera) y la vista previa del panel. La única diferencia funcional es
 * el `token`: en la vista previa es null y el clic no se contabiliza.
 *
 * Estructura, de arriba hacia abajo:
 *   portada con foto y logo → tarjeta crema con la reseña → accesos rápidos
 *   → cierre → firma de Toqia
 *
 * Todo lo que el local no cargó simplemente no aparece. Un restaurante recién
 * dado de alta con solo el enlace de Google ya tiene una página presentable.
 */
export function LandingView({
  landing,
  token,
  /** Código de la pulsera. Se usa para armar el link a la carta propia. */
  code,
  /** Si el local cargó platos, el botón del menú va a la carta de Toqia. */
  hasMenu = false,
}: {
  landing: LandingData;
  token: string | null;
  code?: string;
  hasMenu?: boolean;
}) {
  const nombre = landing.displayName?.trim() || landing.name;
  const reviewUrl = safeUrl(landing.googleReviewUrl);

  // Cuál de las dos cartas se muestra lo decide el restaurante en su panel.
  // Antes se adivinaba (si había platos cargados ganaba la de Toqia) y era
  // imposible de explicar: el local subía su PDF y el botón seguía llevando a
  // otro lado.
  const usaPdf = landing.menuMode === "pdf";
  const menuHref = usaPdf
    ? safeUrl(landing.menuUrl)
    : hasMenu && code
      ? `/r/${encodeURIComponent(code)}/carta`
      : null;

  // El orden es deliberado: primero lo que el cliente busca sentado a la mesa
  // (carta), después lo de llegar y contactar, y al final lo opcional.
  // Un acceso sin dato cargado no se muestra: seis botones vivos se leen mejor
  // que siete con uno que no lleva a ninguna parte.
  const accesos: Acceso[] = [
    {
      href: menuHref,
      // El PDF abre en una pestaña nueva; la carta de Toqia navega dentro de
      // la misma página, así el botón "Volver" trae de vuelta a la reseña.
      interno: !usaPdf && Boolean(menuHref),
      title: "Ver menú",
      sub: "Nuestra carta",
      icon: <UtensilsCrossed className="size-6 text-tq-ink" aria-hidden />,
    },
    {
      href: mapsUrlFor(landing.mapsUrl, landing.address),
      interno: false,
      title: "Cómo llegar",
      sub: "Abrir mapa",
      icon: <MapPin className="size-6 text-tq-ink" aria-hidden />,
    },
    {
      href: telUrl(landing.phone),
      interno: false,
      title: "Llamar",
      sub: "Contactanos",
      icon: <Phone className="size-6 text-tq-ink" aria-hidden />,
    },
    {
      href: whatsappUrl(landing.whatsappPhone),
      interno: false,
      title: "WhatsApp",
      sub: "Escribinos",
      icon: <WhatsAppIcon className="size-6" />,
    },
    {
      href: safeUrl(landing.instagramUrl),
      interno: false,
      title: "Instagram",
      sub: "Seguinos",
      icon: <InstagramIcon className="size-6" />,
    },
    {
      // Sin plataforma de reservas propia, va a WhatsApp con el mensaje ya
      // escrito. Es lo que hace un restaurante chico en la práctica.
      href: reservationUrlFor(landing.reservationUrl, landing.whatsappPhone),
      interno: false,
      title: "Reservar",
      sub: "Reservá tu mesa",
      icon: <CalendarDays className="size-6 text-tq-ink" aria-hidden />,
    },
    {
      href: safeUrl(landing.websiteUrl),
      interno: false,
      title: "Sitio web",
      sub: "Conocenos",
      icon: <Globe className="size-6 text-tq-ink" aria-hidden />,
    },
  ].filter((acceso) => Boolean(acceso.href));

  return (
    <main className="tq-page">
      <div className="mx-auto w-full max-w-[460px]">
        <LandingHeader landing={landing} nombre={nombre} />

        {/* ── Tarjeta crema: todo el contenido útil ──────────────────────── */}
        <div className="relative -mt-10 rounded-t-[28px] bg-tq-cream px-5 pb-8 pt-8">
          {/* Reseña */}
          <section className="rounded-2xl bg-tq-cream-alt px-5 py-7 text-center">
            <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-tq-gold">
              {landing.welcomeKicker?.trim() || "Gracias por visitarnos"}
            </p>

            <h1 className="font-serif text-[26px] font-semibold leading-tight text-tq-ink">
              {landing.welcomeTitle?.trim() ||
                "Tu opinión nos ayuda a seguir mejorando"}
            </h1>

            {reviewUrl ? (
              <>
                <p className="mt-4 text-[15px] text-tq-ink-soft">
                  Dejanos tu reseña en Google
                </p>

                {/* Las estrellas son decorativas: no son una calificación real
                    ni un control. Se ocultan de los lectores de pantalla. */}
                <div
                  aria-hidden
                  className="mt-4 flex items-center justify-center gap-2"
                >
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="size-7 fill-tq-gold text-tq-gold" />
                  ))}
                </div>

                <div className="mt-6">
                  <ReviewButton href={reviewUrl} token={token} />
                </div>

                <p className="mt-3 text-[12px] text-tq-muted">
                  Te va a llevar a Google para dejar tu reseña
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-tq-muted">
                Este local todavía no configuró su enlace de reseñas.
              </p>
            )}
          </section>

          {/* Accesos rápidos */}
          {accesos.length > 0 ? (
            <>
              <p className="tq-rule my-7">Descubrí más</p>

              <nav className="grid grid-cols-3 gap-3">
                {accesos.map(({ href, interno, title, sub, icon }) =>
                  interno ? (
                    <Link key={title} href={href!} className="tq-tile">
                      {icon}
                      <span className="tq-tile-title">{title}</span>
                      <span className="tq-tile-sub">{sub}</span>
                    </Link>
                  ) : (
                    <a
                      key={title}
                      href={href!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tq-tile"
                    >
                      {icon}
                      <span className="tq-tile-title">{title}</span>
                      <span className="tq-tile-sub">{sub}</span>
                    </a>
                  )
                )}
              </nav>
            </>
          ) : null}

          {/* Cierre */}
          <Cierre landing={landing} />

          {landing.address ? (
            <p className="mt-6 text-center text-[12px] leading-relaxed text-tq-muted">
              {landing.address}
            </p>
          ) : null}

          <p className="mt-7 text-center text-[11px] tracking-[0.14em] text-tq-muted">
            POWERED BY{" "}
            <span className="font-semibold tracking-[0.18em] text-tq-ink">
              TOQIA
            </span>
          </p>
        </div>
      </div>
    </main>
  );
}

/* ── Cierre ───────────────────────────────────────────────────────────────── */

/**
 * El saludo final, abajo de todo.
 *
 * Antes era una fila de dos columnas: el texto a la izquierda y la foto en el
 * 42% de la derecha. Cuando el local no cargaba foto —que es el caso normal—
 * la columna derecha desaparecía y quedaba el texto pegado a la izquierda con
 * una estrella suelta debajo, en medio de una franja negra vacía. Parecía un
 * bloque a medio cargar.
 *
 * Ahora es una sola pieza centrada que se ve igual de terminada con foto y sin
 * foto: la foto, cuando está, pasa a ser el fondo con un velo encima en vez de
 * pelear por la mitad del ancho. Eso además la libera de tener que venir en
 * una proporción determinada — `object-cover` la recorta y siempre llena.
 */
function Cierre({ landing }: { landing: LandingData }) {
  const mensaje =
    landing.closingMessage?.trim() ||
    "Gracias por ser parte de nuestra experiencia";

  return (
    <section className="relative mt-7 overflow-hidden rounded-2xl bg-tq-black">
      {landing.closingImageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={landing.closingImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Velo: el mensaje tiene que leerse sobre cualquier foto, clara u
              oscura, sin depender de la suerte. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-tq-black/85 via-tq-black/70 to-tq-black/90"
          />
        </>
      ) : null}

      <div className="relative flex min-h-[160px] flex-col items-center justify-center px-7 py-9 text-center">
        {/* Ornamento: la estrella entre dos filetes dorados. Es el mismo
            recurso que el separador "Descubrí más", así el dorado se lee como
            un sistema y no como un adorno suelto. */}
        <div aria-hidden className="flex w-full max-w-[190px] items-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-tq-gold/70" />
          <Star className="size-[15px] shrink-0 fill-tq-gold text-tq-gold" />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-tq-gold/70" />
        </div>

        <p className="mt-4 text-balance font-serif text-[20px] leading-snug text-tq-text">
          {mensaje}
        </p>
      </div>
    </section>
  );
}

/** Portada: foto de fondo, logo circular y nombre del local. */
export function LandingHeader({
  landing,
  nombre,
}: {
  landing: Pick<LandingData, "coverImageUrl" | "logoUrl" | "tagline">;
  nombre: string;
}) {
  return (
    <header className="relative flex min-h-[300px] flex-col items-center justify-center px-6 pb-14 pt-12 text-center">
      {landing.coverImageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={landing.coverImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Velo oscuro: sin esto, el logo y el nombre se pierden sobre una
              foto clara del salón. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/80"
          />
        </>
      ) : (
        <div aria-hidden className="absolute inset-0 bg-tq-surface" />
      )}

      <div className="relative flex flex-col items-center">
        {landing.logoUrl ? (
          <div className="mb-5 flex size-[132px] items-center justify-center rounded-full border border-tq-gold/70 bg-black/55 p-4">
            {/* Logo remoto y distinto por local: un <img> plano evita tener que
                declarar cada dominio en la configuración de next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={landing.logoUrl}
              alt={nombre}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="mb-5 flex size-[132px] items-center justify-center rounded-full border border-tq-gold/70 bg-black/55 font-serif text-4xl text-tq-gold-soft">
            {nombre.charAt(0).toUpperCase()}
          </div>
        )}

        <h2 className="font-serif text-[30px] uppercase leading-none tracking-[0.06em] text-white">
          {nombre}
        </h2>

        {landing.tagline ? (
          <p className="mt-3 text-[12px] uppercase tracking-[0.28em] text-tq-gold-soft">
            {landing.tagline}
          </p>
        ) : null}
      </div>
    </header>
  );
}
