"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateLanding } from "../actions";

type Location = {
  id: number;
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
 * Formulario de la página pública del local.
 *
 * Los campos vacíos simplemente no muestran su botón en la landing, así que no
 * hay nada obligatorio salvo, en la práctica, el enlace de Google: sin él la
 * página pierde su razón de ser y el formulario lo avisa.
 */
export function LandingForm({ location }: { location: Location }) {
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="locationId" value={location.id} />

      <Seccion titulo="Identidad">
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
        <Campo
          id="logoUrl"
          name="logoUrl"
          label="URL del logo"
          defaultValue={location.logoUrl ?? ""}
          placeholder="https://…/logo.png"
          mono
          hint="Tiene que ser una imagen accesible públicamente. PNG con fondo transparente se ve mejor sobre el negro."
        />
      </Seccion>

      <Seccion titulo="Reseñas">
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

      <Seccion titulo="Contacto y enlaces">
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
          id="menuUrl"
          name="menuUrl"
          label="Menú"
          defaultValue={location.menuUrl ?? ""}
          placeholder="https://…/menu.pdf"
          mono
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

      <Seccion titulo="Ubicación">
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

      <div className="flex items-center gap-3 border-t border-ex-border-subtle pt-4">
        <Button type="submit" variant="primary" disabled={pending}>
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

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ex-text-muted">
        {titulo}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
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
