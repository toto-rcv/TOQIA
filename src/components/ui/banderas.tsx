import type { Idioma } from "@/i18n/locales";

/**
 * Las banderas del selector de idioma, dibujadas a mano en SVG.
 *
 * No son emoji (🇪🇸 🇬🇧 🇮🇹) a propósito: Windows no trae los glifos de bandera
 * y los muestra como las dos letras del país — "ES", "GB", "IT" — que es
 * exactamente lo que estas banderas vienen a reemplazar. En SVG se ven igual
 * en todos lados y se escalan sin perder nitidez.
 *
 * Van dentro de un rectángulo de 3:2 con `slice`: España e Italia entran
 * exactas, y la del Reino Unido —que es 2:1— se recorta un pelo arriba y
 * abajo en vez de deformarse. Estirar una bandera se nota.
 *
 * Nota de accesibilidad: una bandera es un país, no un idioma (el inglés no es
 * solo del Reino Unido). Por eso el dibujo va como decorativo y el nombre del
 * idioma viaja en el `aria-label` del botón: un lector de pantalla dice
 * "English", no "bandera del Reino Unido".
 */

const marco = "h-[15px] w-[22px] shrink-0 rounded-[3px] ring-1 ring-inset ring-black/25";

function Bandera({
  children,
  viewBox,
}: {
  children: React.ReactNode;
  viewBox: string;
}) {
  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid slice"
      className={marco}
      aria-hidden
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** España, en su versión civil: sin el escudo, que a 22px sería una mancha. */
function BanderaEs() {
  return (
    <Bandera viewBox="0 0 60 40">
      <rect width="60" height="40" fill="#AA151B" />
      <rect y="10" width="60" height="20" fill="#F1BF00" />
    </Bandera>
  );
}

/** Italia: tres franjas verticales iguales. */
function BanderaIt() {
  return (
    <Bandera viewBox="0 0 60 40">
      <rect width="20" height="40" fill="#008C45" />
      <rect x="20" width="20" height="40" fill="#F4F5F0" />
      <rect x="40" width="20" height="40" fill="#CD212A" />
    </Bandera>
  );
}

/**
 * Reino Unido. El detalle que la hace reconocible es que las diagonales rojas
 * están corridas respecto de las blancas —no centradas— y por eso hace falta
 * el recorte: cada mitad de cada brazo se dibuja de un lado distinto del eje.
 *
 * El `id` del clip se repite si el selector aparece dos veces en la misma
 * página (la carta lo dibuja en la cabecera del celular y en el hero de
 * escritorio). No molesta: las dos definiciones son idénticas, así que las dos
 * banderas se recortan igual.
 */
function BanderaEn() {
  return (
    <Bandera viewBox="0 0 60 30">
      <clipPath id="toqia-union-jack">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>

      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
      <path
        d="M0,0 L60,30 M60,0 L0,30"
        clipPath="url(#toqia-union-jack)"
        stroke="#C8102E"
        strokeWidth="4"
      />
      <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </Bandera>
  );
}

/** Francia: tres franjas verticales. */
function BanderaFr() {
  return (
    <Bandera viewBox="0 0 60 40">
      <rect width="20" height="40" fill="#002654" />
      <rect x="20" width="20" height="40" fill="#FFFFFF" />
      <rect x="40" width="20" height="40" fill="#ED2939" />
    </Bandera>
  );
}

/** Alemania: negro, rojo y oro, horizontales. */
function BanderaDe() {
  return (
    <Bandera viewBox="0 0 60 40">
      <rect width="60" height="40" fill="#000000" />
      <rect y="13.33" width="60" height="13.33" fill="#DD0000" />
      <rect y="26.66" width="60" height="13.34" fill="#FFCE00" />
    </Bandera>
  );
}

/** Países Bajos: rojo, blanco y azul. No confundir con la de Rusia. */
function BanderaNl() {
  return (
    <Bandera viewBox="0 0 60 40">
      <rect width="60" height="40" fill="#AE1C28" />
      <rect y="13.33" width="60" height="13.33" fill="#FFFFFF" />
      <rect y="26.66" width="60" height="13.34" fill="#21468B" />
    </Bandera>
  );
}

/** Rusia: blanco, azul y rojo. El orden invertido respecto de la neerlandesa. */
function BanderaRu() {
  return (
    <Bandera viewBox="0 0 60 40">
      <rect width="60" height="40" fill="#FFFFFF" />
      <rect y="13.33" width="60" height="13.33" fill="#0039A6" />
      <rect y="26.66" width="60" height="13.34" fill="#D52B1E" />
    </Bandera>
  );
}

export const BANDERAS: Record<Idioma, () => React.ReactElement> = {
  es: BanderaEs,
  en: BanderaEn,
  it: BanderaIt,
  fr: BanderaFr,
  de: BanderaDe,
  nl: BanderaNl,
  ru: BanderaRu,
};
