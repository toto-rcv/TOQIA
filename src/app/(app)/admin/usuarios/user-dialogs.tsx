"use client";

import { Plus, Settings2 } from "lucide-react";
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
import { createUser, updateUser } from "../actions";

type AccountOption = { id: number; name: string };

export type UsuarioEditable = {
  id: string;
  name: string;
  email: string;
  role: string;
  accountId: number | null;
};

/* ── Campos ──────────────────────────────────────────────────────────────── */

/**
 * El cuerpo del formulario, compartido por el alta y la edición.
 *
 * Son el mismo formulario a propósito: si al agregar un campo hubiera que
 * acordarse de tocarlo en dos lados, tarde o temprano los dos dejan de estar
 * sincronizados y el de editar se queda sin algo que sí se puede crear.
 *
 * Las dos diferencias entre un modo y el otro están acá adentro, no en dos
 * copias del formulario:
 *
 *   - En el alta la contraseña es obligatoria; al editar, vacía significa
 *     "dejala como está".
 *   - Al editar, los campos vienen con lo que el usuario ya tiene.
 */
function CamposDeUsuario({
  idPrefijo,
  accounts,
  usuario,
}: {
  /** Prefijo de los `id` del DOM: puede haber varios diálogos en la página. */
  idPrefijo: string;
  accounts: AccountOption[];
  /** Si viene, el formulario es de edición. */
  usuario?: UsuarioEditable;
}) {
  const t = useTranslations("Usuarios");
  const editando = usuario !== undefined;
  const [role, setRole] = React.useState(usuario?.role ?? "restaurant");

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefijo}-name`}>{t("colNombre")}</Label>
          <Input
            id={`${idPrefijo}-name`}
            name="name"
            required
            placeholder={t("nombrePlaceholder")}
            defaultValue={usuario?.name ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefijo}-role`}>{t("colRol")}</Label>
          <Select
            id={`${idPrefijo}-role`}
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="restaurant">{t("opcionEmpresa")}</option>
            <option value="distributor">{t("opcionDistribuidor")}</option>
            <option value="admin">{t("opcionAdmin")}</option>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefijo}-email`}>{t("colEmail")}</Label>
        <Input
          id={`${idPrefijo}-email`}
          name="email"
          type="email"
          required
          spellCheck={false}
          placeholder={t("emailPlaceholder")}
          defaultValue={usuario?.email ?? ""}
        />
      </div>

      {/* La cuenta solo aplica al rol restaurante: es lo que define qué datos
          ve ese usuario. */}
      {role === "restaurant" ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefijo}-account`}>{t("colCuenta")}</Label>
          <Select
            id={`${idPrefijo}-account`}
            name="accountId"
            required
            defaultValue={usuario?.accountId ? String(usuario.accountId) : ""}
          >
            <option value="" disabled>
              {t("elegiUna")}
            </option>
            {accounts.map((cuenta) => (
              <option key={cuenta.id} value={cuenta.id}>
                {cuenta.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefijo}-password`}>
          {t("password")}
          {editando ? (
            <span className="text-ex-text-disabled"> {t("opcional")}</span>
          ) : null}
        </Label>
        <Input
          id={`${idPrefijo}-password`}
          name="password"
          type="password"
          required={!editando}
          minLength={8}
          autoComplete="new-password"
          placeholder={editando ? t("passwordPlaceholder") : undefined}
        />
        <p className="text-[11px] leading-relaxed text-ex-text-muted">
          {editando ? t("passwordHintEditar") : t("passwordHintAlta")}
        </p>
      </div>
    </>
  );
}

/* ── Alta ────────────────────────────────────────────────────────────────── */

export function NewUserDialog({ accounts }: { accounts: AccountOption[] }) {
  const t = useTranslations("Usuarios");
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const resultado = await createUser(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        {t("nuevo")}
      </Button>

      <DialogContent>
        {/* `key` fuerza a rearmar los campos al cerrar y volver a abrir: si no,
            el rol elegido en el intento anterior quedaría pegado. */}
        <form ref={formRef} onSubmit={handleSubmit} key={open ? "abierto" : "cerrado"}>
          <DialogHeader>
            <DialogTitle>{t("nuevo")}</DialogTitle>
            <DialogDescription>{t("nuevoDesc")}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <CamposDeUsuario idPrefijo="u" accounts={accounts} />
            {error ? <ErrorBox message={error} /> : null}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
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

/* ── Edición ─────────────────────────────────────────────────────────────── */

/**
 * El mismo formulario del alta, pero con los datos del usuario cargados.
 *
 * Reemplazó al botón que solo cambiaba la contraseña: ese caso sigue estando
 * —es el campo de abajo— y ahora además se puede corregir un email mal
 * tipeado, cambiarle el rol o moverlo de cuenta sin tener que tocar la base.
 */
export function EditUserDialog({
  usuario,
  accounts,
  esVos,
}: {
  usuario: UsuarioEditable;
  accounts: AccountOption[];
  /** true si es el usuario con la sesión abierta. */
  esVos: boolean;
}) {
  const t = useTranslations("Usuarios");
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const resultado = await updateUser(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("editarA", { nombre: usuario.name })}
        aria-label={t("editarA", { nombre: usuario.name })}
        className="inline-flex h-7 w-7 items-center justify-center rounded-control border
                   border-ex-border text-ex-text-muted transition-colors
                   hover:border-ex-blue/40 hover:text-ex-text active:scale-[0.98]"
      >
        <Settings2 className="size-3.5" />
      </button>

      <DialogContent>
        {/* Al reabrir, los campos vuelven a los valores guardados: si alguien
            editó, cerró sin guardar y volvió a entrar, no se encuentra con lo
            que había escrito la vez anterior. */}
        <form onSubmit={handleSubmit} key={open ? "abierto" : "cerrado"}>
          <DialogHeader>
            <DialogTitle>{t("editar")}</DialogTitle>
            <DialogDescription>{usuario.email}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <input type="hidden" name="userId" value={usuario.id} />

            <CamposDeUsuario
              idPrefijo={`e-${usuario.id}`}
              accounts={accounts}
              usuario={usuario}
            />

            {esVos ? (
              <p className="rounded-control border border-ex-warning/25 bg-ex-warning/10 px-3 py-2 text-[11px] leading-relaxed text-ex-text">
                {t("avisoEsVos")}
              </p>
            ) : null}

            {error ? <ErrorBox message={error} /> : null}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
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
