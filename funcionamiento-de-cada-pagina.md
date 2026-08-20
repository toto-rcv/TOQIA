# Funcionamiento de cada página

Manual de uso de Toqia. Hay **tres paneles distintos** según quién entra, más
la página pública que ve el cliente del restaurante.

| Rol | Entra a | Ve |
|---|---|---|
| **Admin** (vos) | `/admin` | Todo el sistema |
| **Distribuidor** | `/distribuidor` | Solo las cuentas que le asignaste |
| **Restaurante** | `/panel` | Solo su cuenta |

Todos usan el mismo `/login`. Después de ingresar, cada uno cae en su sección
automáticamente.

---

## Índice

- [Cómo se relacionan las cosas](#cómo-se-relacionan-las-cosas)
- [La página que ve el cliente](#la-página-que-ve-el-cliente--rcodigo)
- [Panel del restaurante](#panel-del-restaurante--panel)
- [Panel de administración](#panel-de-administración--admin)
- [Panel del distribuidor](#panel-del-distribuidor--distribuidor)
- [El flujo completo de alta](#el-flujo-completo-de-alta)
- [Preguntas frecuentes](#preguntas-frecuentes)

---

## Cómo se relacionan las cosas

```
Cuenta            ← el cliente, lo que se factura
 └── Local        ← cada sucursal, con su propia página pública
      ├── Camarero
      └── Pulsera ← opcionalmente asignada a un camarero
           └── Escaneo → ¿tocó el botón de Google?
```

Una cuenta puede tener varios locales. Un local tiene sus camareros y sus
pulseras. Cada pulsera puede estar asignada a un camarero, y cada escaneo queda
atribuido al camarero que tenía esa pulsera **en ese momento**.

Esa cadena es lo que permite responder: *restaurante → local → camarero →
pulsera → escaneo → fecha/hora → si terminó en reseña*.

---

## La página que ve el cliente — `/r/CODIGO`

Cuando alguien apoya el celular en una pulsera se abre esta página. Fondo
negro, bordes dorados, el logo del local arriba de todo. Está pensada para
celular: una columna, un botón por fila.

**Qué muestra:**

- El logo del local (o su inicial, si todavía no cargaron uno)
- El nombre y la frase que hayan configurado
- **Dejar reseña en Google** — el botón principal, el único con el dorado
  encendido
- Debajo, solo los botones que el restaurante haya cargado: menú, Instagram,
  WhatsApp, cómo llegar, sitio web
- La dirección al pie

**Lo importante:** al tocar el botón de Google se registra ese clic antes de
irse. De ahí sale la **tasa de conversión** que ve el restaurante. Si el
JavaScript falla, el link funciona igual — la métrica es secundaria, que el
cliente llegue a la reseña no lo es.

### Cuando algo no está bien

| Situación | Qué ve el cliente |
|---|---|
| El código no existe | "Pulsera no reconocida" |
| La pulsera está desactivada | "Esta pulsera no está activa" |
| El local está desactivado | "Esta pulsera no está activa" |
| La cuenta está de baja o cancelada | "Esta pulsera no está activa" |

Nunca ve un error técnico. Y abajo aparece el código, así te dice exactamente
qué pulsera revisar.

---

## Panel del restaurante — `/panel`

### Estadísticas — `/panel`

Es la pantalla que le sirve al dueño para saber si esto funciona y para armar
el concurso mensual entre camareros.

**Arriba, cuatro números:** escaneos del período, cuántos fueron a dejar
reseña, la tasa de conversión y el histórico. Los dos primeros muestran la
variación **contra el período anterior** del mismo largo.

**Los filtros de arriba** cambian el período (7 días, 30, 90, un año), la
granularidad del gráfico (día, semana, mes) y el local, si tienen más de uno.
Todo queda en la URL, así que el link se puede guardar o compartir.

**El gráfico** muestra dos barras por período: escaneos y reseñas. Están una al
lado de la otra y no apiladas a propósito — las reseñas son un subconjunto de
los escaneos, apilarlas contaría a la misma gente dos veces.

**Ranking de camareros:** quién generó más escaneos, con su tasa de conversión.
Solo entran las pulseras que tienen camarero asignado. Este es el número para
el premio del mes.

**Pulseras más escaneadas** y, si tienen varios locales, **comparación entre
locales**.

### Pulseras — `/panel/pulseras`

Lista de sus pulseras con la URL del chip y el botón de copiar.

**Lo que se hace acá es asignar cada pulsera a un camarero**, desde el
desplegable de la propia fila. Es la operación de todos los días cuando
arranca un turno.

Reasignar una pulsera **no reescribe el pasado**: los escaneos viejos siguen
contando para el camarero que la tenía antes. Si no fuera así, cambiar una
pulsera a mitad de mes arruinaría el ranking.

El alta y baja de pulseras la hace el equipo de Toqia, no el restaurante.

### Camareros — `/panel/camareros`

Alta, edición y activación de camareros. Desactivar a alguien **no borra sus
escaneos**: el historial se conserva y sigue apareciendo en los rankings de los
períodos en que trabajó.

### Escaneos — `/panel/escaneos`

El detalle crudo, uno por fila. Se filtra por local, pulsera, camarero, rango
de fechas y "solo con reseña". La columna de reseña marca con un tilde los que
terminaron en Google.

**Exportar CSV** baja exactamente lo que se está viendo, con los filtros
puestos. Incluye la fecha en UTC y en hora local, el camarero y si dejó reseña.

Las IPs nunca se guardan en claro: se guarda un hash. Alcanza para distinguir
si diez escaneos vinieron del mismo teléfono, sin almacenar el dato personal.

### Mi página — `/panel/configuracion`

Acá el restaurante edita **lo que ve el cliente**: nombre visible, frase, logo,
enlace de Google Reviews, Instagram, WhatsApp, menú, sitio web, dirección y
enlace de Maps.

Los campos vacíos simplemente no muestran su botón. El único que importa de
verdad es el de Google: sin él, la página pierde su razón de ser.

**Ver cómo queda** abre la página tal cual la ve un cliente, sin registrar
ningún escaneo.

Si tienen varios locales, arriba hay un selector: cada local tiene su propia
página.

---

## Panel de administración — `/admin`

### Dashboard — `/admin`

Lo mismo que ve un restaurante pero de todo el sistema, más el ranking de
cuentas por escaneos y un aviso cuando hay suscripciones vencidas.

### Cuentas — `/admin/cuentas`

El alta de clientes. Cada cuenta tiene nombre, slug, **estado de suscripción**
(prueba / activa / impaga / cancelada), precio, fecha de vencimiento y
distribuidor asignado.

Dos cosas cortan el servicio de una cuenta entera:

- **Dar de baja** la cuenta con el botón de encendido
- Poner la suscripción en **cancelada**

Cualquiera de las dos deja todas sus pulseras mostrando "Esta pulsera no está
activa", sin importar el estado de cada local o pulsera.

> **La fecha de vencimiento no corta nada sola.** Solo pinta la fila de rojo y
> avisa en el dashboard. El corte es siempre una decisión tuya, explícita. Se
> hizo así a propósito: un cliente que se queda sin servicio porque venció una
> fecha que nadie miró es una llamada enojada un viernes a la noche.

### Locales — `/admin/locales`

Los locales de cada cuenta. Se crean acá; el resto de los datos de la página
pública los completa el propio restaurante.

La columna **Reseñas** avisa si al local le falta cargar el enlace de Google —
sin eso su página no muestra el botón principal.

El ícono del ojo abre la página pública tal cual la ve un cliente.

### Pulseras — `/admin/pulseras`

Alta individual y **alta masiva** (prefijo + numeración correlativa, con
preview del rango antes de crear nada). Asignación a local y a camarero, y la
URL lista para grabar con botón de copiar.

**Destino directo** es la excepción: si lo cargás, esa pulsera saltea la página
del local y va derecho a donde vos digas. El escaneo se registra igual. Sirve
para una campaña puntual o para una pulsera que tiene que ir a otro lado que el
resto.

### Camareros — `/admin/camareros`

Vista global, de solo lectura. Los administra cada restaurante desde su panel.
Sirve para diagnosticar sin tener que entrar con las credenciales del cliente.

### Escaneos — `/admin/escaneos`

Igual que el del restaurante pero de todo el sistema, con filtro por cuenta.

### Usuarios — `/admin/usuarios`

Los accesos. Se crea el usuario, se elige el rol y —si es de restaurante— la
cuenta que va a ver. También se cambia la contraseña de cualquiera.

**No hay registro público.** El endpoint está deshabilitado del lado del
servidor: todos los accesos salen de acá.

---

## Panel del distribuidor — `/distribuidor`

Por ahora es solo lectura: las cuentas que le asignaste, con sus locales,
pulseras y escaneos. El módulo de ventas y comisiones llega en la etapa
siguiente.

---

## El flujo completo de alta

1. **Admin → Cuentas:** creás la cuenta del cliente y le ponés la suscripción.
2. **Admin → Locales:** le agregás su local (o sus locales).
3. **Admin → Usuarios:** creás el usuario del restaurante y le asignás la cuenta.
4. **Admin → Pulseras:** alta masiva del lote, elegís el local.
5. Copiás cada URL del chip y **grabás los tags** (ver [PULSERAS.md](./PULSERAS.md)).
6. **El restaurante entra a `/panel/configuracion`** y carga su logo, su enlace
   de Google y sus redes.
7. **El restaurante carga sus camareros** y les asigna pulseras.
8. Escaneás una para verificar que aparece en Escaneos.

---

## Preguntas frecuentes

**¿Cuánto tarda en verse un cambio de la página del local?**
Al instante si se hizo desde un panel: al guardar se limpia la copia en memoria
de todas las pulseras de ese local. Si se toca la base directamente por fuera,
puede tardar hasta 60 segundos.

**Si un cliente recarga la página, ¿cuenta dos escaneos?**
No. Escaneos repetidos de la misma pulsera desde el mismo dispositivo dentro de
30 segundos cuentan como uno solo.

**¿Por qué el ranking de camareros no coincide con el total de escaneos?**
Porque solo entran los escaneos de pulseras que tenían camarero asignado. Las
pulseras de mesa, sin dueño, quedan afuera del ranking a propósito: mezclarlas
ensuciaría el número que se usa para premiar gente.

**¿Qué pasa si borro una cuenta?**
Se borran en cascada sus locales, camareros, pulseras y escaneos. Si solo
querés frenarla, **dala de baja** en vez de borrarla: conservás el historial.

**¿Un restaurante puede ver datos de otro?**
No. El identificador de cuenta sale siempre de la sesión, nunca de la URL. Si
alguien edita el número de local en la dirección, el sistema lo ignora y le
muestra lo suyo.

**¿Se pierden escaneos alguna vez?**
Puede pasar y es a propósito. Si la base falla justo en ese momento, se pierde
el registro pero la página igual se muestra y el cliente llega a Google.
Preferimos perder un dato antes que dejar a alguien mirando un error al lado de
la caja.

**¿Por qué la pulsera no lleva directo a Google?**
Porque entonces cambiar el destino sería regrabar cada chip a mano, no
tendrías ninguna estadística, y el cliente no vería la marca del local ni sus
redes.
