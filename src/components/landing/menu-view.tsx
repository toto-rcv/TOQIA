import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { MenuCategoryRow, MenuItemRow } from "@/db/queries/menu";
import { MenuIcon } from "./menu-icons";
import type { LandingData } from "./landing-view";

/**
 * La carta del local, tal como la ve el cliente.
 *
 * Es una carta de pizarra: fondo casi negro, títulos y precios en champagne,
 * y nada de cajas. Cada plato es una fila separada de la siguiente por un
 * filete fino — el mismo recurso que usa una carta impresa para que el ojo
 * salte del nombre al precio sin perderse.
 *
 * Jerarquía, de más a menos peso visual:
 *   categoría (champagne, condensada) → nombre del plato → precio → descripción
 *
 * Una sola columna que se ensancha con la pantalla:
 *
 *  - **Celular**: cabecera con el nombre, la foto y las categorías debajo.
 *  - **Escritorio (≥1024px)**: la foto pasa a ser un hero a todo el ancho de
 *    la ventana, y los platos se acomodan de a dos por fila.
 *
 * No hay estado ni eventos: es un componente de servidor, así que la página
 * no le manda JavaScript de la carta al celular del cliente.
 */
export function MenuView({
  landing,
  categories,
  currency,
  backHref,
}: {
  landing: LandingData;
  categories: MenuCategoryRow[];
  currency: string;
  /** A dónde vuelve el botón de atrás: siempre la página de esa pulsera. */
  backHref: string;
}) {
  const nombre = landing.displayName?.trim() || landing.name;

  // Una categoría sin platos visibles no aporta nada y deja un título huérfano.
  const conPlatos = categories.filter((categoria) => categoria.items.length > 0);

  return (
    <main className="tq-menu-page tq-menu">
      {/* El hero va fuera del contenedor centrado para poder ocupar todo el
          ancho de la ventana, de borde a borde. */}
      <Hero landing={landing} nombre={nombre} backHref={backHref} />

      {/* ── Cabecera (celular) ─────────────────────────────────────────
          Va con su propio padding, fuera del contenedor de la carta: la foto
          de abajo tiene que llegar a los bordes de la pantalla y no podía
          compartir el `px-8`. */}
      <header className="mx-auto flex w-full max-w-[560px] items-center gap-2 px-8 py-2 md:max-w-[680px] lg:hidden">
        <Link
          href={backHref}
          aria-label="Volver"
          className="grid size-10 shrink-0 place-items-center rounded-full
                     text-tq-night-ink transition-colors active:bg-tq-night-raised"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>

        {/* A 20px un nombre largo ya no entra en una línea. Antes que cortarlo
            con puntos suspensivos —el nombre del local es lo último que se
            recorta— pasa a dos líneas. */}
        <h1 className="min-w-0 flex-1 text-balance tq-display text-center text-[20px] uppercase leading-tight tracking-[0.03em] text-tq-night-ink">
          {nombre}
        </h1>

        {/* Contrapeso de la flecha, para que el nombre quede centrado de
            verdad y no corrido hacia la derecha. */}
        <span className="size-10 shrink-0" aria-hidden />
      </header>

      {/* ── Imagen de cabecera ───────────────────────────────────────────
          Solo en celular: en escritorio la misma foto es el hero de arriba y
          repetirla sería mostrarla dos veces. De borde a borde, sin esquinas
          redondeadas; el tope de alto evita que en una tablet la foto se coma
          la pantalla entera antes de que se vea un solo plato. */}
      {landing.menuHeaderImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={landing.menuHeaderImageUrl}
          alt=""
          className="aspect-[16/9] max-h-[46vh] w-full object-cover lg:hidden"
        />
      ) : null}

      {/* Una sola columna, que se ensancha con la pantalla. El tope de 920px
          en escritorio no es capricho: más ancho que eso, cada plato queda tan
          estirado que el ojo pierde de vista el precio al llegar al nombre. */}
      <div className="mx-auto w-full max-w-[560px] px-8 pb-12 pt-5 md:max-w-[680px] lg:max-w-[920px] lg:pb-16 lg:pt-9">
        {/* ── Categorías y platos ──────────────────────────────────────── */}
        {conPlatos.length === 0 ? (
          <p className="py-16 text-center text-[14px] font-medium text-tq-night-muted">
            La carta todavía no está cargada.
          </p>
        ) : (
          <div className="space-y-9">
            {conPlatos.map((categoria) => (
              <Categoria
                key={categoria.id}
                categoria={categoria}
                currency={currency}
              />
            ))}
          </div>
        )}

        <p className="mt-12 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-tq-night-muted">
          Powered by <span className="text-tq-champagne">Toqia</span>
        </p>
      </div>
    </main>
  );
}

/* ── Hero (solo escritorio) ───────────────────────────────────────────────── */

/**
 * La foto del local a todo el ancho, arriba de todo.
 *
 * El degradado de abajo termina en el mismo negro del fondo: la foto no corta
 * con una línea dura, se funde con la página. Y como esa franja inferior queda
 * casi opaca, el nombre encima se lee con cualquier foto, clara u oscura, sin
 * depender de la suerte.
 *
 * Si el local no cargó imagen no se inventa un bloque de color vacío: queda
 * una cabecera simple con el nombre, que es lo único que hacía falta.
 */
function Hero({
  landing,
  nombre,
  backHref,
}: {
  landing: LandingData;
  nombre: string;
  backHref: string;
}) {
  const foto = landing.menuHeaderImageUrl;

  if (!foto) {
    return (
      <div className="mx-auto hidden w-full max-w-[1140px] px-8 pt-9 lg:block">
        <BotonVolver backHref={backHref} />
        <h1 className="tq-display mt-5 text-[38px] uppercase leading-none tracking-[0.04em] text-tq-night-ink">
          {nombre}
        </h1>
        {landing.tagline ? (
          <p className="mt-2.5 text-[15px] font-medium text-tq-night-soft">
            {landing.tagline}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative hidden w-full overflow-hidden lg:block lg:h-[min(42vh,420px)] lg:min-h-[320px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={foto}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Velo: transparente arriba, negro sólido abajo. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-tq-night from-[6%] via-tq-night/45 via-52% to-transparent"
      />

      <div className="relative mx-auto flex h-full max-w-[1140px] flex-col justify-between px-8 pb-8 pt-7">
        <BotonVolver backHref={backHref} sobreFoto />

        <div>
          <h1 className="tq-display text-[38px] uppercase leading-none tracking-[0.04em] text-tq-night-ink">
            {nombre}
          </h1>
          {landing.tagline ? (
            <p className="mt-2.5 text-[15px] font-semibold text-tq-night-soft">
              {landing.tagline}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BotonVolver({
  backHref,
  sobreFoto = false,
}: {
  backHref: string;
  sobreFoto?: boolean;
}) {
  return (
    <Link
      href={backHref}
      className={
        "inline-flex w-fit items-center gap-2 text-[13px] font-semibold transition-colors " +
        (sobreFoto
          ? // Píldora champagne: sobre una foto cualquiera, un texto suelto
            // puede quedar ilegible.
            "rounded-pill bg-tq-champagne px-4 py-2 text-tq-night shadow-sm hover:bg-tq-champagne-light"
          : "text-tq-night-soft hover:text-tq-night-ink")
      }
    >
      <ArrowLeft className="size-4" aria-hidden />
      Volver
    </Link>
  );
}

/* ── Categoría ────────────────────────────────────────────────────────────── */

function Categoria({
  categoria,
  currency,
}: {
  categoria: MenuCategoryRow;
  currency: string;
}) {
  return (
    <section>
      {/* Título suelto sobre el fondo, sin caja: el color y la tipografía
          condensada ya lo separan de los platos. El ícono va antes del nombre
          porque se reconoce de un vistazo, incluso antes de leer. */}
      <div className="flex items-center gap-2.5">
        <MenuIcon
          name={categoria.icon}
          className="size-[26px] shrink-0 text-tq-champagne lg:size-[28px]"
        />
        <h2 className="tq-cat-title">{categoria.name}</h2>
      </div>

      {categoria.description ? (
        <p className="mt-1.5 text-[12.5px] font-medium text-tq-night-soft">
          {categoria.description}
        </p>
      ) : null}

      {/* Dos platos por fila en escritorio: con el ancho de la columna, uno
          solo por fila deja media pantalla vacía a la derecha de cada plato.
          `gap-x-10` separa las dos columnas lo suficiente para que no se lea
          el precio de la izquierda como si fuera del plato de la derecha. */}
      <ul className="mt-3.5 lg:grid lg:grid-cols-2 lg:gap-x-10">
        {categoria.items.map((plato) => (
          <li key={plato.id}>
            <Plato plato={plato} currency={currency} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Plato ────────────────────────────────────────────────────────────────── */

function Plato({ plato, currency }: { plato: MenuItemRow; currency: string }) {
  return (
    <div className={"tq-dish " + (plato.available ? "" : "opacity-55")}>
      <div className="min-w-0 flex-1">
        <h3 className={"tq-dish-name " + (plato.available ? "" : "line-through")}>
          {plato.name}
        </h3>

        {plato.description ? (
          <p className="tq-dish-desc">{plato.description}</p>
        ) : null}

        {!plato.available ? (
          <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-tq-night-muted">
            Hoy no disponible
          </p>
        ) : null}
      </div>

      {/* Sin precio no se dibuja nada: mejor un renglón sin número que un
          hueco vacío que parece un error de carga. */}
      {plato.price ? (
        <span className="tq-price">{formatPrice(plato.price, currency)}</span>
      ) : null}
    </div>
  );
}

/* ── Auxiliares ───────────────────────────────────────────────────────────── */

/**
 * El precio llega como string desde MySQL (columna decimal) para no perder
 * centavos en el camino. Se le saca el ".00" cuando es redondo, que es como lo
 * escribe una carta de verdad.
 */
function formatPrice(price: string, currency: string): string {
  const numero = Number(price);
  if (!Number.isFinite(numero)) return `${price} ${currency}`;

  const texto = Number.isInteger(numero)
    ? String(numero)
    : numero.toFixed(2).replace(".", ",");

  return `${currency}${texto}`;
}
