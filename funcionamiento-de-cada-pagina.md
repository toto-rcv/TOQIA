# Funcionamiento de cada página

Manual de uso del panel. Está escrito en el orden en que se usan las pantallas,
que no es el orden del menú.

---

## Índice

- [Ingresar](#ingresar--login)
- [Restaurantes](#restaurantes--adminrestaurants)
- [Pulseras](#pulseras--adminbracelets)
- [Escaneos](#escaneos--adminscans)
- [Dashboard](#dashboard--admin)
- [Las páginas que ve el cliente](#las-páginas-que-ve-el-cliente--pulsera)
- [El flujo completo](#el-flujo-completo)
- [Preguntas frecuentes](#preguntas-frecuentes)

---

## Ingresar — `/login`

Email y contraseña. **No hay registro público**: no existe pantalla de "crear
cuenta" y el endpoint está deshabilitado del lado del servidor. Los usuarios se
crean con el script de seed o directamente contra la base.

Si te equivocás, el mensaje siempre dice "Email o contraseña incorrectos", sin
aclarar cuál de los dos falló. Es a propósito: distinguirlos le diría a un
atacante qué emails existen en el sistema.

La sesión dura 7 días. Cualquier ruta de `/admin` sin sesión te manda acá.

---

## Restaurantes — `/admin/restaurants`

Es lo primero que cargás. Una pulsera no puede existir sin un restaurante dueño.

### Qué muestra la tabla

| Columna | Qué es |
|---|---|
| **Nombre** | Clic para entrar al detalle |
| **Slug** | Identificador interno. No lo ve el cliente en ningún lado |
| **Pulseras** | Cuántas tiene cargadas |
| **Escaneos** | Total histórico del restaurante |
| **Alta** | Cuándo se creó |
| **Estado** | Activo / inactivo |

### Crear uno

Botón **Nuevo restaurante**. Escribís el nombre y el slug se arma solo:

```
"La Parrilla del Centro"  →  la-parrilla-del-centro
```

Si lo editás a mano, deja de seguir al nombre. El slug solo admite minúsculas,
números y guiones, y no se puede repetir.

### Editar y desactivar

El ícono de engranaje edita nombre y slug. El de encendido activa o desactiva.

> **Desactivar un restaurante corta la redirección de TODAS sus pulseras**, sin
> importar que cada pulsera esté activa individualmente. Sirve para cuando un
> cliente deja de pagar o el local cierra por refacción: apagás uno y se apagan
> las cuarenta pulseras de golpe. Los clientes que escaneen van a ver la página
> "Esta pulsera no está activa".

### Detalle del restaurante — `/admin/restaurants/[id]`

Hacés clic en el nombre y entrás. Vas a ver:

- Cuatro métricas: escaneos totales, pulseras, activas, inactivas
- La lista de sus pulseras con destino, URL del chip, escaneos y último escaneo

Esta vista es **de solo lectura**. Para editar destinos se va a Pulseras. El
botón *Ver en pulseras* te lleva directo, ya filtrado por este restaurante.

---

## Pulseras — `/admin/bracelets`

**Es la pantalla central del sistema.** Acá vas a pasar el 90% del tiempo.

Cada fila es una pulsera física que existe en el mundo real.

### Qué muestra la tabla

| Columna | Qué es |
|---|---|
| **Código** | El que va grabado en el chip (`B001`). Único en todo el sistema |
| **Etiqueta** | Texto libre tuyo: "Mesa 4", "Barra", "Caja". Interno |
| **Restaurante** | Clic para ir al detalle del restaurante |
| **Destino** | A dónde manda la pulsera. **Se edita acá mismo** |
| **URL del chip** | Lo que grabás en el tag, con botón de copiar |
| **Escaneos** | Cuántas veces se escaneó |
| **Último** | Cuándo fue el último escaneo |

### Los avisos al lado del código

- **`off`** → la pulsera está desactivada
- **`rest. off`** → la pulsera está bien, pero **su restaurante** está apagado

Son cosas distintas y se arreglan en lugares distintos, por eso son dos avisos
separados. En los dos casos el cliente que escanea ve la misma página.

### Cambiar el destino — la función central

Clic en el **lápiz** de la columna Destino → pegás la URL nueva → **Enter**.
**Esc** cancela.

Se aplica al instante. No hay que tocar la pulsera física, ni regrabar el chip,
ni avisarle a nadie. Esta es la razón de ser de todo el sistema: la pulsera
nunca apunta directo a Google, apunta al servidor, y el servidor decide en ese
momento a dónde mandarla.

Solo se aceptan URLs `http` o `https`. Si pegás cualquier otra cosa, te lo
rechaza con un mensaje.

**Cuándo lo vas a usar:**

- El restaurante se mudó y le cambió el link de Google
- Querés mandar a una encuesta propia durante una semana y después volver
- La pulsera de la caja va a un link distinto que las de las mesas

### Copiar la URL para grabar

Botón de copiar de la columna **URL del chip**. **Usalo siempre.** Escribir el
código a mano en la app de NFC es la forma más fácil de grabar veinte pulseras
inservibles.

### Nueva pulsera

Alta de a una: código, restaurante, etiqueta opcional y destino. Si el código ya
existe, te avisa.

### Alta masiva

Lo que usás cuando llega un lote de tags.

Elegís restaurante, **prefijo**, **desde** qué número, **cuántas** y cuántos
**dígitos**. Te muestra el rango antes de crear nada:

```
B001 → B020
```

Todas nacen con el mismo destino inicial. Después las diferenciás una por una si
hace falta.

**Si algún código del rango ya existía, lo saltea y te dice cuáles.** Eso te deja
ampliar una tanda sin tener que acordarte dónde quedaste: pedís B001 a B040, ya
tenías hasta B020, y crea solo los veinte nuevos.

Límite: 500 pulseras por lote.

### El filtro por restaurante

Vive en la URL, así que podés guardarte el link de "las pulseras del restaurante
X" en favoritos o mandárselo a alguien.

---

## Escaneos — `/admin/scans`

El registro crudo. Cada fila es una persona que apoyó el celular en una pulsera.

### Filtros

Restaurante, pulsera, desde y hasta. El selector de pulseras **se limita solo a
las del restaurante que elegiste**, así no tenés que buscar entre doscientos
códigos. Los filtros también van en la URL.

Botón **Limpiar** para volver a ver todo.

### Qué muestra

| Columna | Qué es |
|---|---|
| **Fecha y hora** | En tu hora local |
| **Pulsera** | Código |
| **Etiqueta** | La que le pusiste |
| **Restaurante** | A quién pertenece |
| **User agent** | Qué celular y navegador era |
| **IP (hash)** | Los primeros caracteres del hash |

**Las IPs nunca se guardan en claro.** Se guarda `SHA-256(salt + IP)`. Eso te
deja ver si diez escaneos vinieron del mismo teléfono, sin almacenar un dato
personal que no necesitás.

Paginado de 50 en 50.

### Exportar CSV

Baja **exactamente lo que estás viendo**, con los filtros aplicados. Abre bien en
Excel con los acentos, e incluye la fecha en UTC y en hora local en columnas
separadas.

---

## Dashboard — `/admin`

Es la pantalla de "cómo viene la cosa", no la de trabajar.

**Arriba, cuatro números:** hoy, últimos 7 días, últimos 30, histórico. El de hoy
va destacado en azul.

**Abajo a la izquierda, el gráfico** de escaneos por día de los últimos 30 días.
Pasás el mouse por una barra y te dice el día y la cantidad exacta.

**Abajo a la derecha, el ranking** de las 8 pulseras más escaneadas, con una
barra de proporción para comparar de un vistazo sin leer cada número.

**Para qué sirve en la práctica:**

- Responder rápido "¿esto está funcionando?"
- Detectar que una pulsera dejó de registrar escaneos — casi siempre significa
  que se rompió, se la llevaron, o quedó guardada en un cajón
- Ver si el fin de semana mueve más que los días de semana y ajustar dónde
  poner las pulseras

> **Ojo con "hoy":** cuenta el día en **UTC**, no en hora argentina. En la
> práctica, a partir de las 21:00 los escaneos empiezan a contar como del día
> siguiente. Para un restaurante que factura de noche esto molesta. Es un cambio
> chico de corregir.

---

## Las páginas que ve el cliente — `/pulsera/*`

Son las únicas pantallas del sistema que ve alguien que no sos vos, y las ve
parado con el celular en la mano. Nunca muestran un error técnico: dicen qué
pasó y a quién avisar.

| Cuándo aparece | Qué dice |
|---|---|
| El código no existe en la base | "Pulsera no reconocida" |
| La pulsera está desactivada | "Esta pulsera no está activa" |
| El restaurante está desactivado | "Esta pulsera no está activa" |
| El destino está vacío o es inválido | "Destino no configurado" |

Si un cliente te muestra una de estas pantallas, el código que aparece abajo te
dice exactamente qué pulsera revisar.

**En el 99% de los casos nadie ve estas páginas**: la redirección a Google es
instantánea y el cliente ni se entera de que pasó por un servidor tuyo.

---

## El flujo completo

1. **Creás el restaurante** en `/admin/restaurants`
2. **Alta masiva de pulseras** en `/admin/bracelets`, con el link de reseña de
   Google como destino inicial
3. **Copiás cada URL del chip** y grabás los tags (ver
   [PULSERAS.md](./PULSERAS.md))
4. **Escaneás una** para verificar → tiene que aparecer en `/admin/scans`
5. **Repartís las pulseras** en el local
6. Cuando haga falta cambiar a dónde van, **editás el destino** desde
   `/admin/bracelets`. Nunca más tocás el chip.

---

## Preguntas frecuentes

**¿Cuánto tarda en aplicarse un cambio de destino?**
Al instante, si lo hacés desde el panel. El sistema guarda en memoria la
relación código → destino para responder rápido, pero al editar desde el panel
borra esa copia a mano. Si tocás la base de datos directamente por fuera del
panel, puede tardar hasta 60 segundos.

**¿Puedo tener dos pulseras con el mismo código?**
No. El código es único en todo el sistema, no por restaurante. Por eso conviene
usar prefijos distintos por local (`B` para uno, `S` para otro).

**¿Qué pasa si borro un restaurante?**
Se borran también sus pulseras y todos sus escaneos, en cascada. Si solo querés
frenarlo, **desactivalo** en vez de borrarlo: conservás el historial.

**¿Se pierden escaneos alguna vez?**
Puede pasar, y es a propósito. La redirección se manda **primero** y el registro
se escribe **después**. Si la base falla justo en ese momento, se pierde ese
registro pero el cliente igual llega a Google. Preferimos perder un dato antes
que dejar a alguien mirando una pantalla en blanco al lado de la caja.

**¿Por qué la pulsera no apunta directo a Google?**
Porque entonces cambiar el destino significaría regrabar cada chip a mano, uno
por uno. Y no tendrías ningún dato de cuántas veces se usó.
