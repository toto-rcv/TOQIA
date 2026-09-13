import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  CalendarDays,
  Clock,
  Globe,
  Info,
  Lock,
  MapPin,
  Phone,
  Star,
  Wifi,
} from "lucide-react";

import { MenuIcon } from "./menu-icons";
import { ReviewButton } from "./review-button";
import {
  mapsUrlFor,
  reservationUrlFor,
  safeUrl,
  telUrl,
  whatsappUrl,
} from "@/lib/url";
import {
  normalizarBloquesDeHorario,
  renglonesDelBloque,
  type BloqueDeHorario,
} from "@/lib/horarios";
import { InstagramIcon, WhatsAppIcon } from "./brand-icons";
import { AccesoConPanel, BotonCopiar, CabeceraDePanel } from "./panel-de-acceso";
import { SelectorIdioma } from "./selector-idioma";

// Los textos por defecto en castellano, para poder reconocerlos. Ver
// `textoDelLocal` acá abajo.
import mensajesEs from "../../../messages/es.json";

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
  /** Qué dice el botón que abre la carta. Vacío = "Ver menú". */
  menuButtonLabel: string | null;
  /** Id del catálogo de íconos (`lib/menu-icons.ts`). Nulo = cubiertos cruzados. */
  menuButtonIcon: string | null;
  /** Bloques de horarios. Sin ninguno, el botón de horarios no aparece. */
  hoursBlocks: BloqueDeHorario[] | null;
  /** La aclaración al pie del panel de horarios ("pueden variar en feriados"). */
  hoursNote: string | null;
  /** Sin red cargada, el botón de Wi-Fi no aparece. */
  wifiSsid: string | null;
  wifiPassword: string | null;
  wifiNote: string | null;
};

/**
 * Elige entre el texto que escribió el local y el genérico traducido.
 *
 * La sutileza: el formulario del panel viene precargado con los textos por
 * defecto en castellano, así que en la base casi todos los locales tienen
 * guardado "Gracias por visitarnos" sin haberlo elegido nunca. Si nos guiamos
 * solo por "¿hay algo cargado?", un turista inglés ve la página entera en
 * inglés con el saludo en castellano en el medio.
 *
 * Por eso, un valor idéntico al default en castellano se lee como "no lo
 * tocó" y se traduce. El local que sí escribió lo suyo lo conserva tal cual:
 * el nombre de su carta o su saludo propio no son nuestros para traducirlos —
 * eso llega cuando pueda cargar sus versiones desde el panel.
 */
function textoDelLocal(
  valor: string | null | undefined,
  porDefectoEnCastellano: string,
  traducido: string
): string {
  const propio = valor?.trim();
  if (!propio || propio === porDefectoEnCastellano) return traducido;
  return propio;
}

/** Un botón de la grilla de accesos rápidos. */
type Acceso = {
  href: string | null;
  /** true = navegación dentro de Toqia (la carta propia). */
  interno: boolean;
  title: string;
  sub: string;
  icon: React.ReactNode;
  /**
   * Lo que se abre al tocarlo, para los accesos que no llevan a ningún lado
   * (horarios, Wi-Fi). Nulo cuando el local no cargó nada: entonces el acceso
   * se descarta igual que uno sin `href`.
   */
  panel?: React.ReactNode;
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
export async function LandingView({
  landing,
  token,
  /** Código de la pulsera. Se usa para armar el link a la carta propia. */
  code,
  /** Si el local cargó platos, el botón del menú va a la carta de Toqia. */
  hasMenu = false,
  /**
   * A dónde vuelve el selector de idioma después de cambiar. Sin esto no se
   * dibuja el selector: la vista previa del panel lo pasa igual, así el local
   * puede ver cómo queda su página en cada idioma.
   */
  volverA,
}: {
  landing: LandingData;
  token: string | null;
  code?: string;
  hasMenu?: boolean;
  volverA?: string;
}) {
  const [idioma, t, ta, th, tw] = await Promise.all([
    getLocale(),
    getTranslations("Landing"),
    getTranslations("Accesos"),
    getTranslations("Horarios"),
    getTranslations("Wifi"),
  ]);

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

  // Los dos accesos que abren un panel en vez de navegar. Se arman acá y no
  // dentro del array para que quede a la vista la única regla que los
  // gobierna: sin datos cargados no hay panel, y sin panel no hay botón.
  const bloques = normalizarBloquesDeHorario(landing.hoursBlocks);
  const hoursNote = landing.hoursNote?.trim() || null;

  const panelDeHorarios =
    bloques.length > 0 ? (
      <PanelDeHorarios
        bloques={bloques}
        nota={hoursNote}
        titulo={th("titulo")}
        sub={th("subtitulo")}
      />
    ) : null;

  const wifiSsid = landing.wifiSsid?.trim() || null;
  const wifiPassword = landing.wifiPassword?.trim() || null;

  const panelDeWifi = wifiSsid ? (
    <PanelDeWifi
      ssid={wifiSsid}
      clave={wifiPassword}
      nota={landing.wifiNote?.trim() || null}
      textos={{
        titulo: tw("titulo"),
        sub: tw("subtitulo"),
        red: tw("red"),
        clave: tw("clave"),
        copiar: tw("copiar"),
        copiarClave: tw("copiarClave"),
        copiado: tw("copiado"),
        sinClave: tw("sinClave"),
      }}
    />
  ) : null;

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
      // El local puede llamarlo como quiera: "Catálogo", "Lista de precios",
      // "Ver servicios". Ese texto lo escribió él y queda tal cual.
      title: textoDelLocal(
        landing.menuButtonLabel,
        mensajesEs.Accesos.menu,
        ta("menu")
      ),
      sub: ta("menuSub"),
      icon: (
        <MenuIcon
          name={landing.menuButtonIcon ?? "cubiertos"}
          className="size-6 text-tq-ink"
        />
      ),
    },
    {
      // Horarios y Wi-Fi van pegados a la carta y antes que los contactos: son
      // lo que se pregunta estando adentro del local, y los demás accesos son
      // para irse a otro lado.
      href: null,
      interno: false,
      title: ta("horarios"),
      sub: ta("horariosSub"),
      icon: <Clock className="size-6 text-tq-ink" aria-hidden />,
      panel: panelDeHorarios,
    },
    {
      href: null,
      interno: false,
      title: ta("wifi"),
      sub: ta("wifiSub"),
      icon: <Wifi className="size-6 text-tq-ink" aria-hidden />,
      panel: panelDeWifi,
    },
    {
      href: mapsUrlFor(landing.mapsUrl, landing.address),
      interno: false,
      title: ta("comoLlegar"),
      sub: ta("comoLlegarSub"),
      icon: <MapPin className="size-6 text-tq-ink" aria-hidden />,
    },
    {
      href: telUrl(landing.phone),
      interno: false,
      title: ta("llamar"),
      sub: ta("llamarSub"),
      icon: <Phone className="size-6 text-tq-ink" aria-hidden />,
    },
    {
      href: whatsappUrl(landing.whatsappPhone),
      interno: false,
      title: ta("whatsapp"),
      sub: ta("whatsappSub"),
      icon: <WhatsAppIcon className="size-6" />,
    },
    {
      href: safeUrl(landing.instagramUrl),
      interno: false,
      title: ta("instagram"),
      sub: ta("instagramSub"),
      icon: <InstagramIcon className="size-6" />,
    },
    {
      // Sin plataforma de reservas propia, va a WhatsApp con el mensaje ya
      // escrito. Es lo que hace un restaurante chico en la práctica.
      href: reservationUrlFor(
        landing.reservationUrl,
        landing.whatsappPhone,
        ta("mensajeReserva")
      ),
      interno: false,
      title: ta("reservar"),
      sub: ta("reservarSub"),
      icon: <CalendarDays className="size-6 text-tq-ink" aria-hidden />,
    },
    {
      href: safeUrl(landing.websiteUrl),
      interno: false,
      title: ta("sitioWeb"),
      sub: ta("sitioWebSub"),
      icon: <Globe className="size-6 text-tq-ink" aria-hidden />,
    },
  ].filter((acceso) => Boolean(acceso.href) || Boolean(acceso.panel));

  return (
    /* `lang` va acá y no en el <html> del layout raíz: ese layout lo comparten
       el panel y el sitio comercial, y leer el idioma ahí volvería dinámica la
       home, que hoy se prerenderiza estática. El atributo más cercano es el
       que vale, y para un lector de pantalla esto es igual de correcto. */
    <main className="tq-page" lang={idioma}>
      <div className="relative mx-auto w-full max-w-[460px]">
        {volverA ? (
          <div className="absolute right-4 top-4 z-10">
            <SelectorIdioma volverA={volverA} />
          </div>
        ) : null}

        <LandingHeader landing={landing} nombre={nombre} />

        {/* ── Tarjeta crema: todo el contenido útil ──────────────────────── */}
        <div className="relative -mt-10 rounded-t-[28px] bg-tq-cream px-5 pb-8 pt-8">
          {/* Reseña */}
          <section className="rounded-2xl bg-tq-cream-alt px-5 py-7 text-center">
            <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-tq-gold">
              {textoDelLocal(landing.welcomeKicker, mensajesEs.Landing.kicker, t("kicker"))}
            </p>

            <h1 className="font-serif text-[26px] font-semibold leading-tight text-tq-ink">
{textoDelLocal(
                landing.welcomeTitle,
                mensajesEs.Landing.titulo,
                t("titulo")
              )}
            </h1>

            {reviewUrl ? (
              <>
                <p className="mt-4 text-[15px] text-tq-ink-soft">
                  {t("invitacion")}
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
                  <ReviewButton href={reviewUrl} token={token} label={t("boton")} />
                </div>

                <p className="mt-3 text-[12px] text-tq-muted">{t("aviso")}</p>
              </>
            ) : (
              <p className="mt-4 text-sm text-tq-muted">{t("sinEnlace")}</p>
            )}
          </section>

          {/* Accesos rápidos */}
          {accesos.length > 0 ? (
            <>
              <p className="tq-rule my-7">{t("descubrirMas")}</p>

              <nav className="grid grid-cols-3 gap-3">
                {accesos.map(({ href, interno, title, sub, icon, panel }) =>
                  panel ? (
                    <AccesoConPanel
                      key={title}
                      titulo={title}
                      sub={sub}
                      icono={icon}
                      cerrar={t("cerrar")}
                    >
                      {panel}
                    </AccesoConPanel>
                  ) : interno ? (
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
          <Cierre landing={landing} porDefecto={t("cierre")} />

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

/* ── Horarios ─────────────────────────────────────────────────────────────── */

/**
 * Lo que se ve al tocar "Horarios".
 *
 * Recibe los textos ya traducidos en vez de pedirlos por su cuenta. No es
 * capricho: un componente hoja de esta página que se vuelve `async` para
 * buscar sus propias traducciones tiró el servidor entero en producción, y el
 * build local no lo detectaba. Las hojas se quedan sincrónicas.
 */
function PanelDeHorarios({
  bloques,
  nota,
  titulo,
  sub,
}: {
  bloques: BloqueDeHorario[];
  nota: string | null;
  titulo: string;
  sub: string;
}) {
  return (
    <>
      <CabeceraDePanel
        icono={<Clock className="size-8 text-tq-ink" aria-hidden />}
        titulo={titulo}
        sub={sub}
      />

      <div className="space-y-3 px-5">
        {bloques.map((bloque, indice) => {
          const renglones = renglonesDelBloque(bloque.text);

          return (
            <section
              key={indice}
              className="rounded-2xl bg-tq-cream-alt px-4 py-4"
            >
              {bloque.title ? (
                <div className="flex items-center gap-2.5">
                  {bloque.icon ? (
                    <MenuIcon
                      name={bloque.icon}
                      className="size-[22px] shrink-0 text-tq-ink"
                    />
                  ) : null}
                  <h3 className="font-serif text-[17px] font-semibold text-tq-ink">
                    {bloque.title}
                  </h3>
                </div>
              ) : null}

              {renglones.length > 0 ? (
                <ul className={bloque.title ? "mt-2.5" : ""}>
                  {renglones.map((renglon, fila) => (
                    <li
                      key={fila}
                      /* `flex-wrap` y no una grilla de dos columnas: un día
                         largo con dos turnos no entra en 460px y, forzado,
                         partiría el horario en el medio. Así baja entero. */
                      className="flex flex-wrap items-baseline justify-between gap-x-4
                                 border-b border-tq-cream-border/60 py-2
                                 last:border-0 last:pb-0"
                    >
                      <span className="text-[14px] text-tq-ink-soft">
                        {renglon.izquierda}
                      </span>
                      {renglon.derecha ? (
                        <span className="text-[14px] font-semibold tabular-nums text-tq-ink">
                          {renglon.derecha}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}

        {nota ? <Aclaracion texto={nota} /> : null}
      </div>
    </>
  );
}

/* ── Wi-Fi ────────────────────────────────────────────────────────────────── */

function PanelDeWifi({
  ssid,
  clave,
  nota,
  textos,
}: {
  ssid: string;
  clave: string | null;
  nota: string | null;
  textos: {
    titulo: string;
    sub: string;
    red: string;
    clave: string;
    copiar: string;
    copiarClave: string;
    copiado: string;
    sinClave: string;
  };
}) {
  return (
    <>
      <CabeceraDePanel
        icono={<Wifi className="size-8 text-tq-ink" aria-hidden />}
        titulo={textos.titulo}
        sub={textos.sub}
      />

      <div className="space-y-3 px-5">
        <div className="rounded-2xl bg-tq-cream-alt px-4">
          <FilaDeWifi
            icono={<Wifi className="size-[18px] text-tq-muted" aria-hidden />}
            etiqueta={textos.red}
            valor={ssid}
            copiar={textos.copiar}
            copiado={textos.copiado}
          />

          {clave ? (
            <FilaDeWifi
              icono={<Lock className="size-[18px] text-tq-muted" aria-hidden />}
              etiqueta={textos.clave}
              valor={clave}
              copiar={textos.copiar}
              copiado={textos.copiado}
            />
          ) : null}
        </div>

        {/* El botón ancho repite lo que ya hace el ícono de la fila, y está
            bien que lo repita: es el gesto que viene a hacer el 90% de la
            gente que abre esto, y buscarlo en un ícono de 18px con el celular
            en una mano no es lo mismo que tenerlo servido. */}
        {clave ? (
          <BotonCopiar
            valor={clave}
            etiqueta={textos.copiarClave}
            copiado={textos.copiado}
            ancho
          />
        ) : (
          <Aclaracion texto={textos.sinClave} />
        )}

        {nota ? <Aclaracion texto={nota} /> : null}
      </div>
    </>
  );
}

function FilaDeWifi({
  icono,
  etiqueta,
  valor,
  copiar,
  copiado,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  valor: string;
  copiar: string;
  copiado: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-tq-cream-border/60 py-3 last:border-0">
      {icono}

      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-[0.08em] text-tq-muted">
          {etiqueta}
        </p>
        {/* `break-all` y monoespaciada: una clave de Wi-Fi se copia con el ojo
            cuando el botón no funciona, y ahí la diferencia entre l, 1 e I
            decide si la persona entra o no. */}
        <p className="break-all font-mono text-[15px] font-semibold text-tq-ink">
          {valor}
        </p>
      </div>

      <BotonCopiar valor={valor} etiqueta={copiar} copiado={copiado} />
    </div>
  );
}

/** La nota al pie de un panel, con su ícono. */
function Aclaracion({ texto }: { texto: string }) {
  return (
    <p className="flex gap-2.5 rounded-2xl bg-tq-cream-alt/60 px-4 py-3.5 text-[12.5px] leading-relaxed text-tq-ink-soft">
      <Info className="mt-0.5 size-4 shrink-0 text-tq-muted" aria-hidden />
      {texto}
    </p>
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
function Cierre({
  landing,
  porDefecto,
}: {
  landing: LandingData;
  /** El saludo genérico, ya traducido. El del local, si lo cargó, gana. */
  porDefecto: string;
}) {
  const mensaje = textoDelLocal(
    landing.closingMessage,
    mensajesEs.Landing.cierre,
    porDefecto
  );

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
