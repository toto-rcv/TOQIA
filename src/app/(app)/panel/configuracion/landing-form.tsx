"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { FileField } from "@/components/ui/file-field";
import { Input, Label } from "@/components/ui/input";
import { updateLanding } from "../actions";

type Location = {
  id: number;
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
  menuMode: string;
  menuButtonLabel: string | null;
  currency: string;
};

/**
 * Formulario de la página pública del local.
 *
 * Los campos vacíos simplemente no muestran su botón en la landing, así que no
 * hay nada obligatorio salvo, en la práctica, el enlace de Google: sin él la
 * página pierde su razón de ser y el formulario lo avisa.
 */
export function LandingForm({
  location,
  /** ¿El local ya cargó platos en /panel/carta? Solo para avisarle si no. */
  tieneCartaToqia,
}: {
  location: Location;
  tieneCartaToqia: boolean;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [guardado, setGuardado] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!guardado) return;
    const timeout = setTimeout(() => setGuardado(false), 2500);
    return () => clearTimeout(timeout);
  }, [guardado]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    setGuardado(false);

    startTransition(async () => {
      const resultado = await updateLanding(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setGuardado(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-4">
      <input type="hidden" name="locationId" value={location.id} />

      <Seccion
        titulo="Identidad"
        descripcion="El nombre y las imágenes con las que se presenta tu local."
      >
        <Campo
          id="displayName"
          name="displayName"
          label="Nombre visible"
          defaultValue={location.displayName ?? ""}
          placeholder={location.name}
          hint="Si lo dejás vacío se usa el nombre del local."
        />
        <Campo
          id="tagline"
          name="tagline"
          label="Frase debajo del nombre"
          defaultValue={location.tagline ?? ""}
          placeholder="Cocina de autor en Palermo"
        />
        <CampoArchivo
          name="logo"
          label="Logo"
          actual={location.logoUrl}
          formato="imagen"
          hint="PNG con fondo transparente se ve mejor sobre la portada."
        />
        <CampoArchivo
          name="cover"
          label="Foto de portada"
          actual={location.coverImageUrl}
          formato="imagen"
          hint="Va detrás del logo, arriba de todo. Una foto del salón funciona bien: se oscurece automáticamente para que el logo se lea."
        />
      </Seccion>

      <Seccion
        titulo="Textos de la página"
        descripcion="Lo que lee el cliente. Si los dejás vacíos usamos los nuestros."
      >
        <Campo
          id="welcomeKicker"
          name="welcomeKicker"
          label="Línea de arriba"
          defaultValue={location.welcomeKicker ?? ""}
          placeholder="Gracias por visitarnos"
          hint="Si lo dejás vacío se usa “Gracias por visitarnos”."
        />
        <Campo
          id="welcomeTitle"
          name="welcomeTitle"
          label="Título principal"
          defaultValue={location.welcomeTitle ?? ""}
          placeholder="Tu opinión nos ayuda a seguir mejorando"
        />
        <Campo
          id="closingMessage"
          name="closingMessage"
          label="Mensaje de cierre"
          defaultValue={location.closingMessage ?? ""}
          placeholder="Gracias por ser parte de nuestra experiencia"
        />
        <CampoArchivo
          name="closing"
          label="Foto del cierre"
          actual={location.closingImageUrl}
          formato="imagen"
          hint="Acompaña al mensaje de despedida, abajo de todo."
        />
      </Seccion>

      <Seccion
        titulo="Reseñas"
        descripcion="El botón principal de la página."
      >
        <Campo
          id="googleReviewUrl"
          name="googleReviewUrl"
          label="Enlace de Google Reviews"
          defaultValue={location.googleReviewUrl ?? ""}
          placeholder="https://g.page/r/CODIGO/review"
          mono
          hint="Es el botón principal de la página. Sin esto, el cliente no tiene dónde dejar la reseña."
        />
      </Seccion>

      <Seccion
        titulo="Contacto y enlaces"
        descripcion="Cada dato cargado agrega su botón; los vacíos no aparecen."
      >
        <Campo
          id="instagramUrl"
          name="instagramUrl"
          label="Instagram"
          defaultValue={location.instagramUrl ?? ""}
          placeholder="https://instagram.com/tu-local"
          mono
        />
        <Campo
          id="whatsappPhone"
          name="whatsappPhone"
          label="WhatsApp"
          defaultValue={location.whatsappPhone ?? ""}
          placeholder="5491133334444"
          mono
          hint="Con código de país, sin + ni espacios."
        />
        <Campo
          id="phone"
          name="phone"
          label="Teléfono"
          defaultValue={location.phone ?? ""}
          placeholder="+54 11 3333-4444"
          hint="Es el del botón “Llamar”. Puede ser distinto del de WhatsApp."
        />
        <Campo
          id="reservationUrl"
          name="reservationUrl"
          label="Reservas (opcional)"
          defaultValue={location.reservationUrl ?? ""}
          placeholder="https://…/reservar"
          mono
          hint="Si lo dejás vacío, “Reservar” abre WhatsApp con el mensaje “Hola, quisiera reservar una mesa” ya escrito. Completalo solo si usás una plataforma de reservas."
        />
        <Campo
          id="currency"
          name="currency"
          label="Moneda de la carta"
          defaultValue={location.currency ?? "€"}
          placeholder="€"
          hint="El símbolo que acompaña los precios: €, $, US$…"
        />
        <Campo
          id="websiteUrl"
          name="websiteUrl"
          label="Sitio web"
          defaultValue={location.websiteUrl ?? ""}
          placeholder="https://tu-local.com"
          mono
        />
      </Seccion>

      <SelectorDeCarta
        etiquetaInicial={location.menuButtonLabel ?? ""}
        modoInicial={location.menuMode === "pdf" ? "pdf" : "toqia"}
        pdfActual={location.menuUrl}
        tieneCartaToqia={tieneCartaToqia}
      />

      <Seccion
        titulo="Ubicación"
        descripcion="Para el botón “Cómo llegar”."
      >
        <Campo
          id="address"
          name="address"
          label="Dirección"
          defaultValue={location.address ?? ""}
          placeholder="Av. Siempre Viva 742, CABA"
        />
        <Campo
          id="mapsUrl"
          name="mapsUrl"
          label="Enlace de Google Maps"
          defaultValue={location.mapsUrl ?? ""}
          placeholder="https://maps.app.goo.gl/…"
          mono
          hint="Opcional. Si lo dejás vacío pero cargaste la dirección, el botón busca esa dirección en Maps."
        />
      </Seccion>

      {error ? (
        <p
          role="alert"
          className="rounded-control border border-ex-danger/25 bg-ex-danger/10 px-3 py-2 text-xs text-ex-danger"
        >
          {error}
        </p>
      ) : null}

      {/* La barra de guardado queda pegada abajo: el formulario es largo y
          obligar a bajar hasta el final para guardar es una fuente segura de
          cambios perdidos. */}
      <div
        className="sticky bottom-[76px] z-10 flex flex-wrap items-center gap-3 rounded-card
                   border border-ex-border bg-ex-surface/95 px-4 py-3 shadow-pop
                   backdrop-blur sm:bottom-4 sm:px-5"
      >
        <Button type="submit" variant="primary" size="lg" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>

        {guardado ? (
          <span className="flex items-center gap-1.5 text-xs text-ex-success">
            <Check className="size-3.5" />
            Guardado. Los cambios ya están en tu página.
          </span>
        ) : null}
      </div>
    </form>
  );
}

/**
 * Cada bloque es su propia tarjeta.
 *
 * El formulario tiene veinte campos: en una sola tarjeta larga hay que leerlo
 * entero para encontrar uno. Separado, la persona salta directo al bloque que
 * busca y ve de un vistazo qué le falta cargar.
 */
function Seccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-ex-border bg-ex-surface shadow-card">
      <div className="border-b border-ex-border-subtle px-4 py-3.5 sm:px-5">
        <h3 className="text-[15px] font-semibold tracking-tight text-ex-text">
          {titulo}
        </h3>
        {descripcion ? (
          <p className="mt-0.5 text-[12.5px] text-ex-text-muted">{descripcion}</p>
        ) : null}
      </div>
      <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5">{children}</div>
    </section>
  );
}

/**
 * Qué carta ve el cliente al tocar "Ver menú".
 *
 * Es una elección explícita y no una deducción: antes, si el local subía su
 * PDF pero además tenía platos cargados, ganaba la carta de Toqia y no había
 * forma de entender por qué. Ahora elige el restaurante.
 */
function SelectorDeCarta({
  etiquetaInicial,
  modoInicial,
  pdfActual,
  tieneCartaToqia,
}: {
  etiquetaInicial: string;
  modoInicial: "toqia" | "pdf";
  pdfActual: string | null;
  tieneCartaToqia: boolean;
}) {
  const [modo, setModo] = React.useState(modoInicial);
  const [etiqueta, setEtiqueta] = React.useState(etiquetaInicial);

  // Lo que va a decir el botón de verdad. Se usa en todos los textos de esta
  // sección: si el local lo llamó "Catálogo", leer instrucciones que hablan de
  // “Ver menú” obliga a traducir mentalmente en cada frase.
  const comoSeLlama = etiqueta.trim() || "Ver menú";

  return (
    <section className="rounded-card border border-ex-border bg-ex-surface shadow-card">
      <div className="border-b border-ex-border-subtle px-4 py-3.5 sm:px-5">
        <h3 className="text-[15px] font-semibold tracking-tight text-ex-text">Carta</h3>
        <p className="mt-0.5 text-[12.5px] text-ex-text-muted">
          Cómo se llama el botón de tu página y qué se abre al tocarlo.
        </p>
      </div>

      <div className="border-b border-ex-border-subtle px-4 py-4 sm:px-5">
        <div className="space-y-1.5">
          <Label htmlFor="menuButtonLabel">Texto del botón</Label>
          <Input
            id="menuButtonLabel"
            name="menuButtonLabel"
            value={etiqueta}
            onChange={(event) => setEtiqueta(event.target.value)}
            maxLength={40}
            placeholder="Ver menú"
            autoComplete="off"
          />
          <p className="text-[11px] leading-relaxed text-ex-text-muted">
            Poné lo que corresponda a tu negocio: “Lista de precios”,
            “Catálogo”, “Ver servicios”. Si lo dejás vacío dice{" "}
            <span className="font-medium text-ex-text">Ver menú</span>. Entran
            hasta 40 caracteres, pero de dos o tres palabras no pasés: el botón
            es chico y el texto se parte.
          </p>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4 sm:px-5">
        <Opcion
          valor="toqia"
          elegido={modo === "toqia"}
          onChange={setModo}
          titulo="La carta de Toqia"
          detalle="La que cargás en “Mi carta”, con categorías, precios y fotos. Los cambios se ven al instante y no hay que subir nada."
          aviso={
            tieneCartaToqia
              ? null
              : `Todavía no cargaste ningún plato: hasta que lo hagas, el botón “${comoSeLlama}” no aparece en tu página.`
          }
        />

        <Opcion
          valor="pdf"
          elegido={modo === "pdf"}
          onChange={setModo}
          titulo="Mi carta en PDF"
          detalle="Tu propio archivo. Cada vez que cambien los precios hay que subir el PDF de nuevo."
          aviso={
            modo === "pdf" && !pdfActual
              ? `Subí el archivo acá abajo, o el botón “${comoSeLlama}” no va a aparecer.`
              : null
          }
        />
      </div>

      {/* El campo del PDF solo cuando hace falta: si no, invita a subir un
          archivo que después no se va a mostrar. */}
      {modo === "pdf" ? (
        <div className="px-4 pb-4 sm:px-5">
          <CampoArchivo
            name="menu"
            label="Archivo de la carta"
            actual={pdfActual}
            formato="pdf"
            hint={`Un PDF. Se abre en una pestaña nueva cuando el cliente toca “${comoSeLlama}”.`}
          />
        </div>
      ) : null}

      {/* Viaja siempre, elija lo que elija. */}
      <input type="hidden" name="menuMode" value={modo} />
    </section>
  );
}

function Opcion({
  valor,
  elegido,
  onChange,
  titulo,
  detalle,
  aviso,
}: {
  valor: "toqia" | "pdf";
  elegido: boolean;
  onChange: (valor: "toqia" | "pdf") => void;
  titulo: string;
  detalle: string;
  aviso: string | null;
}) {
  return (
    <label
      className={
        "flex cursor-pointer gap-3 rounded-control border p-3 transition-colors " +
        (elegido
          ? "border-ex-blue/50 bg-ex-surface-raised"
          : "border-ex-border hover:border-ex-blue/25")
      }
    >
      <input
        type="radio"
        name="menuModeRadio"
        value={valor}
        checked={elegido}
        onChange={() => onChange(valor)}
        className="mt-0.5 size-4 shrink-0 accent-ex-blue"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ex-text">{titulo}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-ex-text-muted">
          {detalle}
        </span>
        {aviso ? (
          <span className="mt-1.5 block text-[11px] leading-relaxed text-ex-warning">
            {aviso}
          </span>
        ) : null}
      </span>
    </label>
  );
}

/** Igual que `Campo` pero para archivos. El logo va redondo, como se ve. */
function CampoArchivo({
  name,
  label,
  actual,
  formato,
  hint,
}: {
  name: string;
  label: string;
  actual: string | null;
  formato: "imagen" | "pdf";
  hint?: string;
}) {
  return (
    <FileField
      name={name}
      label={label}
      actual={actual}
      formato={formato}
      hint={hint}
      forma={name === "logo" ? "redonda" : name === "cover" ? "ancha" : "cuadrada"}
    />
  );
}

function Campo({
  id,
  name,
  label,
  defaultValue,
  placeholder,
  hint,
  mono = false,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        spellCheck={!mono}
        className={mono ? "font-mono text-xs" : undefined}
      />
      {hint ? <p className="text-[11px] text-ex-text-muted">{hint}</p> : null}
    </div>
  );
}
