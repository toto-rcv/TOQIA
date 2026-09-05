"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, Power, Settings2, Trash2 } from "lucide-react";
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
import {
  createAccount,
  deleteAccount,
  entrarAlPanelDe,
  toggleAccount,
  updateAccount,
} from "../actions";

type Distributor = { id: string; name: string; email: string };

type AccountRow = {
  id: number;
  name: string;
  slug: string;
  businessType: string | null;
  active: boolean;
  subscriptionStatus: string;
  subscriptionPrice: string | null;
  subscriptionExpiresAt: Date | null;
  distributorId: string | null;
  locationCount: number;
  braceletCount: number;
};

/** El valor va a la base; el nombre visible sale de las traducciones. */
const ESTADOS = [
  { value: "trial", clave: "estadoPrueba" },
  { value: "active", clave: "estadoActiva" },
  { value: "past_due", clave: "estadoImpaga" },
  { value: "cancelled", clave: "estadoCancelada" },
];

export function NewAccountDialog() {
  const t = useTranslations("Cuentas");
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugTocado, setSlugTocado] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  // El slug sigue al nombre hasta que el usuario lo edita a mano.
  React.useEffect(() => {
    if (!slugTocado) setSlug(slugify(name));
  }, [name, slugTocado]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const resultado = await createAccount(formData);
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
        {t("nueva")}
      </Button>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("nueva")}</DialogTitle>
            <DialogDescription>{t("nuevaDesc")}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="account-name">{t("nombre")}</Label>
              <Input
                id="account-name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder={t("nombrePlaceholder")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="account-business-type">{t("rubro")}</Label>
              <Input
                id="account-business-type"
                name="businessType"
                maxLength={60}
                placeholder={t("rubroPlaceholder")}
              />
              <p className="text-[12px] text-ex-text-muted">{t("rubroAyuda")}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="account-slug">{t("slug")}</Label>
              <Input
                id="account-slug"
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

export function AccountRowActions({
  account,
  distributors,
}: {
  account: AccountRow;
  distributors: Distributor[];
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <AbrirPanelButton account={account} />
      <EditAccountDialog account={account} distributors={distributors} />
      <ToggleAccountButton account={account} />
      <DeleteAccountDialog account={account} />
    </div>
  );
}

/**
 * Entra al panel de este restaurante.
 *
 * Es lo que permite configurarle la página o cargarle la carta a un cliente
 * que recién arranca, sin pedirle la contraseña. Al volver, el panel muestra
 * una franja arriba avisando de quién es lo que se está viendo.
 */
function AbrirPanelButton({ account }: { account: AccountRow }) {
  const t = useTranslations("Cuentas");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function abrir() {
    startTransition(async () => {
      const resultado = await entrarAlPanelDe(account.id);
      // Si falla, lo natural es que sea porque la cuenta ya no existe; la
      // lista se recarga y deja de mostrarla.
      if (!resultado.ok) {
        router.refresh();
        return;
      }
      router.push("/panel");
    });
  }

  return (
    <button
      type="button"
      onClick={abrir}
      disabled={pending}
      title={t("abrirPanelDe", { nombre: account.name })}
      aria-label={t("abrirPanelDe", { nombre: account.name })}
      className="inline-flex h-7 w-7 items-center justify-center rounded-control border
                 border-ex-border text-ex-text-muted transition-colors
                 hover:border-ex-blue/40 hover:text-ex-text active:scale-[0.98]
                 disabled:opacity-40"
    >
      <ExternalLink className="size-3.5" />
    </button>
  );
}

function EditAccountDialog({
  account,
  distributors,
}: {
  account: AccountRow;
  distributors: Distributor[];
}) {
  const t = useTranslations("Cuentas");
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const resultado = await updateAccount(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setOpen(false);
    });
  }

  const vence = account.subscriptionExpiresAt
    ? new Date(account.subscriptionExpiresAt).toISOString().slice(0, 10)
    : "";

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
            <DialogDescription>{t("editarDesc")}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <input type="hidden" name="id" value={account.id} />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`a-name-${account.id}`}>{t("nombre")}</Label>
                <Input
                  id={`a-name-${account.id}`}
                  name="name"
                  defaultValue={account.name}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`a-slug-${account.id}`}>{t("slug")}</Label>
                <Input
                  id={`a-slug-${account.id}`}
                  name="slug"
                  defaultValue={account.slug}
                  required
                  spellCheck={false}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`a-rubro-${account.id}`}>{t("rubro")}</Label>
              <Input
                id={`a-rubro-${account.id}`}
                name="businessType"
                defaultValue={account.businessType ?? ""}
                maxLength={60}
                placeholder={t("rubroPlaceholder")}
              />
              <p className="text-[12px] text-ex-text-muted">{t("rubroAyuda")}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`a-status-${account.id}`}>{t("colSuscripcion")}</Label>
                <Select
                  id={`a-status-${account.id}`}
                  name="subscriptionStatus"
                  defaultValue={account.subscriptionStatus}
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado.value} value={estado.value}>
                      {t(estado.clave)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`a-price-${account.id}`}>{t("precio")}</Label>
                <Input
                  id={`a-price-${account.id}`}
                  name="subscriptionPrice"
                  defaultValue={account.subscriptionPrice ?? ""}
                  placeholder="0.00"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`a-expires-${account.id}`}>{t("colVence")}</Label>
                <Input
                  id={`a-expires-${account.id}`}
                  name="subscriptionExpiresAt"
                  type="date"
                  defaultValue={vence}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`a-dist-${account.id}`}>{t("colDistribuidor")}</Label>
              <Select
                id={`a-dist-${account.id}`}
                name="distributorId"
                defaultValue={account.distributorId ?? ""}
              >
                <option value="">{t("sinAsignar")}</option>
                {distributors.map((dist) => (
                  <option key={dist.id} value={dist.id}>
                    {dist.name} · {dist.email}
                  </option>
                ))}
              </Select>
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

function ToggleAccountButton({ account }: { account: AccountRow }) {
  const t = useTranslations("Cuentas");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const resultado = await toggleAccount(account.id, !account.active);
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
        (account.active ? t("darDeBajaHint") : t("reactivar"))
      }
      aria-label={account.active ? t("darDeBaja") : t("reactivar")}
      className={
        "inline-flex h-7 w-7 items-center justify-center rounded-control border transition-colors " +
        "active:scale-[0.98] disabled:opacity-40 " +
        (error
          ? "border-ex-danger/40 text-ex-danger"
          : account.active
            ? "border-ex-border text-ex-text-muted hover:border-ex-danger/40 hover:text-ex-danger"
            : "border-ex-border text-ex-text-muted hover:border-ex-success/40 hover:text-ex-success")
      }
    >
      <Power className="size-3.5" />
    </button>
  );
}

function DeleteAccountDialog({ account }: { account: AccountRow }) {
  const t = useTranslations("Cuentas");
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("borrar")}
        aria-label={t("borrar")}
        className="inline-flex h-7 w-7 items-center justify-center rounded-control border
                   border-ex-border text-ex-text-muted transition-colors
                   hover:border-ex-danger/40 hover:text-ex-danger active:scale-[0.98]"
      >
        <Trash2 className="size-3.5" />
      </button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("borrarNombre", { nombre: account.name })}</DialogTitle>
          <DialogDescription>
            {t("borrarCuentaDesc", {
              locales: account.locationCount,
              pulseras: account.braceletCount,
            })}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>{error ? <ErrorBox message={error} /> : null}</DialogBody>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            {t("cancelar")}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const resultado = await deleteAccount(account.id);
                if (!resultado.ok) {
                  setError(resultado.error);
                  return;
                }
                setOpen(false);
              });
            }}
          >
            {pending ? t("borrando") : t("borrarIgual")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
