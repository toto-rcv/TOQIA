"use client";

import { Plus, Power, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { slugify } from "@/lib/validation";
import { createLocation, toggleLocation, updateLocation } from "../actions";

type AccountOption = { id: number; name: string; active: boolean };
type LocationRow = {
  id: number;
  accountId: number;
  name: string;
  slug: string;
  active: boolean;
};

export function NewLocationDialog({
  accounts,
  defaultAccountId,
}: {
  accounts: AccountOption[];
  defaultAccountId?: number;
}) {
  const t = useTranslations("Locales");
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugTocado, setSlugTocado] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!slugTocado) setSlug(slugify(name));
  }, [name, slugTocado]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const resultado = await createLocation(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setName("");
      setSlug("");
      setSlugTocado(false);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        {t("nuevo")}
      </Button>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("nuevo")}</DialogTitle>
            <DialogDescription>{t("nuevoDesc")}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="loc-account">{t("colCuenta")}</Label>
              <Select
                id="loc-account"
                name="accountId"
                required
                defaultValue={defaultAccountId ? String(defaultAccountId) : ""}
              >
                <option value="" disabled>
                  {t("elegiUna")}
                </option>
                {accounts.map((cuenta) => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuenta.name}
                    {cuenta.active ? "" : ` ${t("cuentaDeBaja")}`}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="loc-name">{t("nombre")}</Label>
                <Input
                  id="loc-name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  placeholder={t("nombrePlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loc-slug">{t("slug")}</Label>
                <Input
                  id="loc-slug"
                  name="slug"
                  value={slug}
                  onChange={(event) => {
                    setSlugTocado(true);
                    setSlug(event.target.value);
                  }}
                  required
                  spellCheck={false}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="loc-review">
                {t("googleReviewUrl")}{" "}
                <span className="text-ex-text-disabled">{t("opcional")}</span>
              </Label>
              <Input
                id="loc-review"
                name="googleReviewUrl"
                spellCheck={false}
                placeholder="https://g.page/r/CODIGO/review"
                className="font-mono text-xs"
              />
            </div>

            {error ? <ErrorBox message={error} /> : null}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t("cancelar")}
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? t("creando") : t("crear")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LocationRowActions({
  location,
  accounts,
}: {
  location: LocationRow;
  accounts: AccountOption[];
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <EditLocationDialog location={location} accounts={accounts} />
      <ToggleLocationButton location={location} />
    </div>
  );
}

function EditLocationDialog({
  location,
  accounts,
}: {
  location: LocationRow;
  accounts: AccountOption[];
}) {
  const t = useTranslations("Locales");
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const resultado = await updateLocation(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("editar")}
        aria-label={t("editar")}
        className="inline-flex h-7 w-7 items-center justify-center rounded-control border
                   border-ex-border text-ex-text-muted transition-colors
                   hover:border-ex-blue/40 hover:text-ex-text active:scale-[0.98]"
      >
        <Settings2 className="size-3.5" />
      </button>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("editar")}</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <input type="hidden" name="id" value={location.id} />

            <div className="space-y-1.5">
              <Label htmlFor={`l-account-${location.id}`}>{t("colCuenta")}</Label>
              <Select
                id={`l-account-${location.id}`}
                name="accountId"
                defaultValue={String(location.accountId)}
              >
                {accounts.map((cuenta) => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuenta.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`l-name-${location.id}`}>{t("nombre")}</Label>
                <Input
                  id={`l-name-${location.id}`}
                  name="name"
                  defaultValue={location.name}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`l-slug-${location.id}`}>{t("slug")}</Label>
                <Input
                  id={`l-slug-${location.id}`}
                  name="slug"
                  defaultValue={location.slug}
                  required
                  spellCheck={false}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            {error ? <ErrorBox message={error} /> : null}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t("cancelar")}
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? t("guardando") : t("guardar")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToggleLocationButton({ location }: { location: LocationRow }) {
  const t = useTranslations("Locales");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const resultado = await toggleLocation(location.id, !location.active);
      if (!resultado.ok) setError(resultado.error);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      title={
        error ??
        (location.active ? t("desactivarHint") : t("activar"))
      }
      aria-label={location.active ? t("desactivar") : t("activar")}
      className={
        "inline-flex h-7 w-7 items-center justify-center rounded-control border transition-colors " +
        "active:scale-[0.98] disabled:opacity-40 " +
        (error
          ? "border-ex-danger/40 text-ex-danger"
          : location.active
            ? "border-ex-border text-ex-text-muted hover:border-ex-danger/40 hover:text-ex-danger"
            : "border-ex-border text-ex-text-muted hover:border-ex-success/40 hover:text-ex-success")
      }
    >
      <Power className="size-3.5" />
    </button>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-control border border-ex-danger/25 bg-ex-danger/10 px-3 py-2 text-xs text-ex-danger"
    >
      {message}
    </p>
  );
}
