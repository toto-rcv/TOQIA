# Grabar y probar las pulseras NFC

Guía práctica del lado físico: qué comprar, cómo grabar el chip y cómo verificar
que el circuito completo funciona.

---

## Qué comprar

Pedí **tags NFC NTAG213** (o NTAG215 / NTAG216, que son iguales pero con más
memoria). Es el chip estándar y lo lee cualquier celular con NFC.

| Chip | Memoria usable | Alcanza para |
|---|---|---|
| NTAG213 | 144 bytes | ~130 caracteres de URL — más que suficiente |
| NTAG215 | 504 bytes | de sobra |
| NTAG216 | 888 bytes | de sobra |

Nuestra URL es corta (`https://pulseras.midominio.com/r/B001`, unos 38
caracteres), así que **el NTAG213 sobra** y es el más barato. No pagues de más
por memoria que no vas a usar.

Formato físico: pulsera de silicona, tarjeta, sticker o llavero, da igual. Lo
único que cambia es la comodidad.

> **Cuanto más corto el dominio, mejor.** No por la memoria, sino porque un
> dominio corto es más fácil de leer si algún día tenés que diagnosticar un tag
> a mano.

---

## Antes de grabar nada: probá con UNA

No compres 200 pulseras y las grabes todas de una. El orden correcto es:

1. Comprá **5 tags sueltos** para probar.
2. Grabá **uno** con la URL de tu entorno local.
3. Escaneá con el celular y verificá que el escaneo llegó al panel.
4. Recién ahí encargá el lote y grabá en serie.

---

## Prueba local (antes de tener el dominio)

Sirve para validar el circuito completo sin haber desplegado nada.

**1.** Averiguá la IP de tu máquina en la red WiFi:

```powershell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' }).IPAddress
```

**2.** Poné esa IP en el `.env`:

```env
NEXT_PUBLIC_APP_URL="http://192.168.0.15:3000"
BETTER_AUTH_URL="http://192.168.0.15:3000"
```

**3.** Arrancá escuchando en toda la red y permitilo en el firewall:

```powershell
npm run dev:lan
```

La primera vez Windows Defender muestra un cartel: marcá **Redes privadas** y
aceptá.

**4.** Desde el navegador **del celular**, abrí
`http://192.168.0.15:3000/r/B001`. Tiene que redirigirte a Google. Si esto no
funciona, no sigas: el problema es de red, no del tag.

**5.** Grabá el tag (sección siguiente) con esa URL.

> **Limitación conocida:** algunos iPhone no abren automáticamente tags con URL
> `http` (sin la ese). Si el escaneo no dispara solo, es esto — no está mal
> grabado. Probá con un Android, o usá un túnel con HTTPS
> (`cloudflared tunnel --url http://localhost:3000`), o esperá a tener el
> dominio de producción.

---

## Cómo grabar el chip

### Con el celular (lo más práctico)

Instalá **NFC Tools** (Android o iOS) o **NXP TagWriter** (Android).

Con NFC Tools:

1. Pestaña **Escribir** (*Write*)
2. **Añadir un registro** → **URL / URI**
3. Pegá la URL completa, tal cual la copiás del panel:
   `https://pulseras.midominio.com/r/B001`
4. **Escribir** (*Write*)
5. Apoyá el celular sobre la pulsera y esperá el aviso de confirmación

La URL exacta la sacás del panel: **Pulseras → columna "URL del chip" → botón de
copiar**. No la escribas a mano, es la forma más fácil de equivocarse en un
código.

### Dónde apoyar el celular

La antena NFC no está en el mismo lugar en todos los teléfonos:

- **Android**: en general en la parte de arriba de la espalda, cerca de la cámara
- **iPhone**: en el borde superior, del lado de la pantalla

Si no engancha, movelo despacio en círculos por la espalda del teléfono hasta
que vibre.

### ¿Bloquear el tag?

Las apps ofrecen **bloquear** (*lock*) el tag para que no se pueda reescribir.

- **Durante las pruebas: NO lo bloquees.** Es irreversible: un tag bloqueado no
  se puede volver a grabar nunca más. Si te equivocaste de código, lo tirás.
- **En producción: opcional.** Protege contra que un cliente reescriba la
  pulsera con su propio link. Si las pulseras quedan en las mesas al alcance de
  cualquiera, vale la pena. Si están en la caja o las maneja el personal, no
  hace falta.

Recordá que **el destino no vive en el chip**: bloquearlo no te impide cambiar a
dónde lleva la pulsera. Eso se cambia siempre desde el panel.

---

## Grabar un lote en serie

Cuando ya validaste el circuito:

1. En el panel: **Pulseras → Alta masiva**. Poné prefijo, desde, cantidad y
   dígitos. El diálogo te muestra el rango que va a generar (`B001 → B020`)
   antes de crear nada.
2. Cargá el destino inicial: el link de reseña de Google del restaurante.
3. Grabá los tags uno por uno con NFC Tools, copiando cada URL del panel.
4. Etiquetá físicamente cada pulsera con su código (una etiqueta chica, un
   marcador indeleble). Cuando tengas 40 pulseras iguales y una falle, vas a
   agradecer poder saber cuál es sin escanearla.

Para lotes grandes conviene un **grabador NFC de escritorio** (ACR122U y
similares) con software de escritura en serie: escribís la lista de URLs y vas
apoyando tags. Para menos de 50, el celular alcanza.

---

## De dónde sacar el link de reseña de Google

El destino que ponés en cada pulsera es el link que abre el cuadro de reseña del
local:

1. Entrá a tu **Perfil de Empresa de Google** (Google Business Profile).
2. Buscá la opción de **pedir reseñas** / *Ask for reviews*. Te da un link corto
   tipo `https://g.page/r/CODIGO/review`.

Si no tenés acceso al perfil, la alternativa es armar la URL con el Place ID del
local:

```
https://search.google.com/local/writereview?placeid=EL_PLACE_ID
```

El Place ID se saca del buscador de Place ID de Google Maps Platform.

> Los destinos que trae el seed son **de ejemplo**. Cambialos por los reales
> antes de grabar pulseras de producción.

---

## Verificar que funcionó

Después de escanear con el celular:

1. Se abre el navegador solo y redirige al cuadro de reseña de Google.
2. Entrá al panel → **Escaneos**. El escaneo tiene que estar arriba de todo, con
   la fecha y hora, el código de la pulsera y el user agent del celular.
3. En **Pulseras**, la columna "Escaneos" de esa pulsera subió en uno y "Último"
   muestra el momento del escaneo.

Si el redirect funciona pero el escaneo no aparece, esperá unos segundos y
recargá: el registro se escribe **después** de mandar la redirección, a
propósito, para que el cliente no espere a la base de datos.

---

## Cambiar el destino después

Esta es la razón de ser de todo el sistema:

**Pulseras → columna "Destino" → ícono de lápiz → pegás la URL nueva → Enter.**

El cambio se aplica al instante. Las pulseras físicas no se tocan. Podés hacerlo
todos los días si querés.

Casos donde lo vas a usar:

- El restaurante cambia de local y le cambia el Place ID
- Querés mandar a una encuesta propia durante una semana y después volver a Google
- Una pulsera puntual (la de la caja) va a un link distinto que las de las mesas

---

## Problemas frecuentes

**El celular no detecta el tag.** Verificá que el NFC esté activado (Ajustes →
Conexiones → NFC en Android; en iPhone está siempre activo en modelos recientes).
Probá mover el teléfono despacio por la espalda del tag.

**Detecta el tag pero no abre nada.** El tag está grabado pero probablemente sin
formato URL — si se grabó como texto plano, el celular lo lee y no hace nada.
Regrabalo eligiendo el tipo **URL/URI**, no *Text*.

**Abre el navegador y dice "Pulsera no reconocida".** El código grabado no existe
en la base. Suele ser un error de tipeo en el código, o que grabaste con el
dominio correcto pero un código que después borraste. Copiá la URL del panel en
vez de escribirla.

**Abre pero dice "Esta pulsera no está activa".** La pulsera o el restaurante
están desactivados en el panel. Activalos desde ahí.

**Funciona en Android pero no en iPhone.** Casi siempre es que la URL grabada es
`http` en vez de `https`. En producción con dominio propio esto no pasa.

**El escaneo redirige pero no queda registrado.** Mirá los logs del contenedor
en Coolify: el registro es asíncrono y, si falla, deja un error
`[scan-logger]` sin romper la redirección. Lo más probable es un problema de
conexión con la base.
