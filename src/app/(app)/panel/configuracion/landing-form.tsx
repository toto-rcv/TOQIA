"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("Configuracion");
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

      <Seccion titulo={t("secIdentidad")} descripcion={t("secIdentidadDesc")}>
        <Campo
          id="displayName"
          name="displayName"
          label={t("nombreVisible")}
          defaultValue={location.displayName ?? ""}
          placeholder={location.name}
          hint={t("nombreVisibleHint")}
        />
        <Campo
          id="tagline"
          name="tagline"
          label={t("fraseSub")}
          defaultValue={location.tagline ?? ""}
          placeholder={t("fraseSubPlaceholder")}
        />
        <CampoArchivo
          name="logo"
          label={t("logo")}
          actual={location.logoUrl}
          formato="imagen"
          hint={t("logoHint")}
        />
        <CampoArchivo
          name="cover"
          label={t("cover")}
          actual={location.coverImageUrl}
          formato="imagen"
          hint={t("coverHint")}
        />
      </Seccion>

      <Seccion titulo={t("secTextos")} descripcion={t("secTextosDesc")}>
        <Campo
          id="welcomeKicker"
          name="welcomeKicker"
          label={t("welcomeKicker")}
          defaultValue={location.welcomeKicker ?? ""}
          placeholder={t("welcomeKickerPlaceholder")}
          hint={t("welcomeKickerHint")}
        />
        <Campo
          id="welcomeTitle"
          name="welcomeTitle"
          label={t("welcomeTitle")}
          defaultValue={location.welcomeTitle ?? ""}
          placeholder={t("welcomeTitlePlaceholder")}
        />
        <Campo
          id="closingMessage"
          name="closingMessage"
          label={t("closingMessage")}
          defaultValue={location.closingMessage ?? ""}
          placeholder={t("closingMessagePlaceholder")}
        />
        <CampoArchivo
          name="closing"
          label={t("closing")}
          actual={location.closingImageUrl}
          formato="imagen"
          hint={t("closingHint")}
        />
      </Seccion>

      <Seccion titulo={t("secResenas")} descripcion={t("secResenasDesc")}>
        <Campo
          id="googleReviewUrl"
          name="googleReviewUrl"
          label={t("googleReviewUrl")}
          defaultValue={location.googleReviewUrl ?? ""}
          placeholder="https://g.page/r/CODIGO/review"
          mono
          hint={t("googleReviewUrlHint")}
        />
      </Seccion>

      <Seccion titulo={t("secContacto")} descripcion={t("secContactoDesc")}>
        <Campo
          id="instagramUrl"
          name="instagramUrl"
          label={t("instagramUrl")}
          defaultValue={location.instagramUrl ?? ""}
          placeholder="https://instagram.com/tu-local"
          mono
        />
        <Campo
          id="whatsappPhone"
          name="whatsappPhone"
          label={t("whatsappPhone")}
          defaultValue={location.whatsappPhone ?? ""}
          placeholder="5491133334444"
          mono
          hint={t("whatsappPhoneHint")}
        />
        <Campo
          id="phone"
          name="phone"
          label={t("phone")}
          defaultValue={location.phone ?? ""}
          placeholder="+54 11 3333-4444"
          hint={t("phoneHint")}
        />
        <Campo
          id="reservationUrl"
          name="reservationUrl"
          label={t("reservationUrl")}
          defaultValue={location.reservationUrl ?? ""}
          placeholder="https://…/reservar"
          mono
          hint={t("reservationUrlHint")}
        />
        <Campo
          id="currency"
          name="currency"
          label={t("currency")}
          defaultValue={location.currency ?? "€"}
          placeholder="€"
          hint={t("currencyHint")}
        />
        <Campo
          id="websiteUrl"
          name="websiteUrl"
          label={t("websiteUrl")}
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

      <Seccion titulo={t("secUbicacion")} descripcion={t("secUbicacionDesc")}>
        <Campo
          id="address"
          name="address"
          label={t("address")}
          defaultValue={location.address ?? ""}
          placeholder={t("addressPlaceholder")}
        />
        <Campo
          id="mapsUrl"
          name="mapsUrl"
          label={t("mapsUrl")}
          defaultValue={location.mapsUrl ?? ""}
          placeholder="https://maps.app.goo.gl/…"
          mono
          hint={t("mapsUrlHint")}
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
          {pending ? t("guardando") : t("guardarCambios")}
        </Button>

        {guardado ? (
          <span className="flex items-center gap-1.5 text-xs text-ex-success">
            <Check className="size-3.5" />
            {t("guardadoExito")}
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
  const t = useTranslations("Configuracion");
  const [modo, setModo] = React.useState(modoInicial);
  const [etiqueta, setEtiqueta] = React.useState(etiquetaInicial);

  // Lo que va a decir el botón de verdad. Se usa en todos los textos de esta
  // sección: si el local lo llamó "Catálogo", leer instrucciones que hablan de
  // “Ver menú” obliga a traducir mentalmente en cada frase.
  const comoSeLlama = etiqueta.trim() || t("verMenuDefecto");

  return (
    <section className="rounded-card border border-ex-border bg-ex-surface shadow-card">
      <div className="border-b border-ex-border-subtle px-4 py-3.5 sm:px-5">
        <h3 className="text-[15px] font-semibold tracking-tight text-ex-text">
          {t("secCarta")}
        </h3>
        <p className="mt-0.5 text-[12.5px] text-ex-text-muted">
          {t("secCartaDesc")}
        </p>
      </div>

      <div className="border-b border-ex-border-subtle px-4 py-4 sm:px-5">
        <div className="space-y-1.5">
          <Label htmlFor="menuButtonLabel">{t("textoBotonCarta")}</Label>
          <Input
            id="menuButtonLabel"
            name="menuButtonLabel"
            value={etiqueta}
            onChange={(event) => setEtiqueta(event.target.value)}
            maxLength={40}
            placeholder={t("verMenuDefecto")}
            autoComplete="off"
          />
          <p className="text-[11px] leading-relaxed text-ex-text-muted">
            {t.rich("textoBotonCartaHint", {
              defecto: (chunks) => (
                <span className="font-medium text-ex-text">{chunks}</span>
              ),
            })}
          </p>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4 sm:px-5">
        <Opcion
          valor="toqia"
          elegido={modo === "toqia"}
          onChange={setModo}
          titulo={t("toqiaTitulo")}
          detalle={t("toqiaDetalle")}
          aviso={
            tieneCartaToqia ? null : t("avisoSinPlatos", { boton: comoSeLlama })
          }
        />

        <Opcion
          valor="pdf"
          elegido={modo === "pdf"}
          onChange={setModo}
          titulo={t("pdfTitulo")}
          detalle={t("pdfDetalle")}
          aviso={
            modo === "pdf" && !pdfActual
              ? t("avisoSinPdf", { boton: comoSeLlama })
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
            label={t("pdfArchivo")}
            actual={pdfActual}
            formato="pdf"
            hint={t("pdfArchivoHint", { nombre: comoSeLlama })}
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
