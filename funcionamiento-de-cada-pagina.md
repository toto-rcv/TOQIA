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
- Debajo, solo los botones que el restaurante haya cargado:

  | Botón | A dónde va | Aparece si… |
  |---|---|---|
  | **Ver menú** | la carta de Toqia o el PDF, según lo que hayan elegido | está cargada la carta que eligieron |
  | **Cómo llegar** | Google Maps | hay dirección o enlace de Maps |
  | **Llamar** | marca el teléfono | hay teléfono |
  | **WhatsApp** | chat con el local | hay número de WhatsApp |
  | **Instagram** | el perfil del local | hay enlace de Instagram |
  | **Reservar** | WhatsApp con “Hola, quisiera reservar una mesa” ya escrito | hay número de WhatsApp |
  | **Sitio web** | la web del local | hay sitio web cargado |

  WhatsApp e Instagram llevan su logo de verdad, en su color. El resto usa
  iconos de línea, que es lo que corresponde: son acciones, no marcas.

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

### Cómo se mueve el panel

En la **computadora** las secciones están en una barra lateral fija a la
izquierda. En el **celular** están abajo, en una barra fija: las cuatro que se
usan todos los días (Resumen, Pulseras, Mi carta, Escaneos) siempre a la vista,
y el resto en el botón **Más**. El pulgar llega a la parte de abajo de la
pantalla; a la de arriba, no.

Las tablas también cambian de forma. En el celular no hay tabla: cada fila se
muestra como una tarjeta con lo importante arriba y el resto debajo. Es más
código, pero es la única manera de que una tabla de ocho columnas se pueda leer
en 360 píxeles sin arrastrar el dedo a los costados.

**Los listados vienen de a 10.** Pulseras, camareros y escaneos se piden a la
base de a diez por página. Al pasar de página se hace un pedido nuevo y la base
devuelve solo esas diez: aunque una cuenta llegue a tener cien mil escaneos, lo
que viaja por la red y lo que se dibuja en la pantalla es siempre lo mismo. El
número de página va en la dirección (`?page=3`), así que se puede compartir el
link, funciona el botón de atrás del navegador y anda aunque el JavaScript
falle.

### Resumen — `/panel`

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

Acá el restaurante edita **lo que ve el cliente**: nombre visible, frase,
enlace de Google Reviews, Instagram, WhatsApp, teléfono, sitio web, dirección
y enlace de Maps.

Los campos vacíos simplemente no muestran su botón. El único que importa de
verdad es el de Google: sin él, la página pierde su razón de ser.

**Las imágenes se suben, no se pegan como enlace.** El logo, la foto de
portada, la foto del cierre y la carta en PDF tienen un botón para elegir el
archivo desde la computadora o el celular. Al lado se ve lo que hay cargado
hoy, con un **Quitar** para dejarlo vacío.

Cuando suben una imagen nueva, la anterior se borra sola. No hay que limpiar
nada a mano ni queda ocupando lugar. Los archivos se guardan dentro de la base
de datos, así que sobreviven a cada deploy y entran en el backup junto con el
resto de los datos.

Límites: **6 MB por imagen** y **12 MB por PDF**. Si se pasan, el formulario
lo dice con el peso exacto en vez de fallar en silencio. Se aceptan JPG, PNG,
WebP, GIF y AVIF.

**La carta** se elige, no se adivina. Hay dos opciones:

- **La carta de Toqia** — la que cargan en *Mi carta*. Se actualiza al
  instante, no hay que subir nada, y el cliente la ve dentro de la misma
  página con un botón de volver.
- **Mi carta en PDF** — su propio archivo. Cada vez que cambian los precios
  hay que subir el PDF de nuevo. Se abre en una pestaña aparte.

El campo del archivo solo aparece si eligieron el PDF. Si eligen una opción
que todavía no tiene contenido — la carta de Toqia sin platos, o el PDF sin
subir — el panel lo avisa ahí mismo, y el botón “Ver menú” no aparece en la
página del cliente hasta que la completen.

Cambiar de opción **no borra** el PDF que ya estaba: pueden volver a él cuando
quieran.

**Reservas** está vacío a propósito: si no cargan nada, el botón “Reservar”
abre WhatsApp con el mensaje “Hola, quisiera reservar una mesa” ya escrito.
Solo hay que completarlo si el local usa una plataforma de reservas propia.

**Ver cómo queda** abre la página tal cual la ve un cliente, sin registrar
ningún escaneo.

Si tienen varios locales, arriba hay un selector: cada local tiene su propia
página.

### Mi carta — `/panel/carta`

La carta que ve el cliente al tocar **Ver menú**. Se organiza en categorías
(Entradas, Principales, Postres…) y dentro de cada una, los platos.

De cada plato se carga nombre, precio, descripción y, si quieren, **una foto**
— se sube igual que las demás imágenes, y al cambiarla la anterior se borra.

Cada categoría puede llevar un **ícono**: hamburguesa, empanadas, carne,
postres, café, cerveza y unos veinte más. Se elige de una grilla al crear o
editar la categoría, y aparece al lado del nombre en la carta del cliente. Es
opcional: sin ícono la categoría se muestra solo con su nombre.

Arriba de todo hay una **imagen de la carta**, opcional, que encabeza la
página del cliente. Se guarda con su propio botón, sin tener que tocar el
resto.

Un plato que se acabó se marca como **no disponible**: en vez de desaparecer
se muestra tachado, así el cliente sabe que existe y puede preguntarlo mañana.

Los cambios se ven al instante: no hay que avisarle a nadie ni regrabar las
pulseras.

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

**El ingreso tiene freno.** Después de **7 contraseñas mal seguidas**, ese
cliente no puede volver a intentar durante **un minuto**: el servidor le
responde 429 y el formulario deshabilita los campos con una cuenta regresiva.
Sin eso, `/api/auth/sign-in/email` acepta todos los pedidos que le manden y un
script prueba miles de contraseñas por minuto contra una cuenta.

El contador es por **IP + email**, no por una sola de las dos. Contar solo por
IP dejaría afuera a todo un restaurante que sale por el mismo router cuando un
empleado se equivoca siete veces; contar solo por email dejaría que cualquiera
bloquee la cuenta ajena a propósito. Un ingreso correcto borra el contador, y
los fallos sueltos se olvidan a los 15 minutos.

### Mantenimiento — `/admin/mantenimiento`

Dos herramientas que antes solo existían por consola y que en producción no se
podían usar.

**Esquema de la base.** Dice si la base está al día con el código y, si no lo
está, lista exactamente qué columnas o tablas faltan. El botón las aplica. Es
la misma rutina que `npm run migrate`, así que no borra nada y se puede correr
las veces que haga falta.

Cuando la base no está migrada, la página que usa la columna nueva no muestra
un error entendible: muestra `Application error: a server-side exception has
occurred`. Si aparece eso después de un deploy, el primer lugar donde mirar es
acá.

**Vaciar la base.** Borra todo —cuentas, locales, pulseras, camareros,
escaneos, cartas, archivos subidos y los demás usuarios— y deja únicamente al
admin que aprieta el botón, con su sesión abierta. Sirve para pasar de los
datos de prueba a los reales.

Es irreversible y no hay deshacer: pide escribir `BORRAR TODO`, el servidor
vuelve a verificar el rol y la frase, y todo el borrado va en una transacción
para que no pueda quedar media base vacía.

---

## Panel del distribuidor — `/distribuidor`

El distribuidor ve y opera únicamente sobre lo suyo. "Lo suyo" son las cuentas
que tienen su `distributor_id` y las pulseras que Toqia le entregó. Esa lista
sale siempre de su sesión y nunca de la URL: es la única barrera entre un
distribuidor y los datos de otro.

### Resumen — `/distribuidor`

Escaneos, reseñas y conversión de todas sus cuentas juntas, con el gráfico de
evolución y el ranking de sus locales. Abajo, el estado del inventario:
cuántas pulseras le entregaron, cuántas colocó y cuántas le quedan.

### Restaurantes — `/distribuidor/restaurantes`

Sus clientes, con locales, pulseras y escaneos de cada uno.

**Nuevo restaurante** da de alta las tres cosas de una vez: la cuenta, su
primer local y el usuario que entra al panel. Queda asociado al distribuidor
automáticamente. Al terminar muestra el email y la contraseña juntos para
copiar y pasárselos al cliente — es el único momento en que la contraseña está
a la vista, porque después queda hasheada y no hay forma de recuperarla.

Lo único opcional pero importante es el enlace de reseñas de Google: sin eso
las pulseras funcionan pero no llevan a ningún lado. Si no lo tiene a mano, el
restaurante lo carga después desde su panel.

### Pulseras — `/distribuidor/pulseras`

Las que Toqia le entregó. El desplegable de cada fila decide en qué local está,
y guarda al soltarlo: colocar veinte pulseras es la tarea repetitiva del
distribuidor y un botón de confirmar por pulsera se siente enseguida.

**El distribuidor no crea códigos.** Los códigos existen porque alguien grabó
un chip físico; inventarlos desde el panel rompería la correspondencia entre lo
que hay en la base y lo que hay en la caja. Las pulseras las da de alta el
admin y elige a qué stock van.

---

## El stock de pulseras

Una pulsera puede estar parada en tres lugares, y el recorrido es siempre el
mismo:

```
STOCK DE TOQIA  →  STOCK DEL DISTRIBUIDOR  →  LOCAL
```

En la base son dos columnas de `bracelets`:

| Dónde está | `location_id` | `distributor_id` |
|---|---|---|
| Stock de Toqia | NULL | NULL |
| Entregada a un distribuidor | NULL | el distribuidor |
| Puesta en un local | el local | el distribuidor que la colocó |

`distributor_id` no se borra al colocarla: es lo que después permite saber
quién vendió qué.

En `/admin/pulseras`, el alta —individual y masiva— tiene un solo desplegable
de **destino** con las tres opciones. Un solo campo y no dos excluyentes: así
no existe el estado imposible de "en un local y en un stock a la vez".

Si alguien escanea una pulsera que todavía está en un stock, la página le dice
que la pulsera existe pero no está en uso, en vez del cartel de "no
reconocida" que corresponde a un chip mal grabado.

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
