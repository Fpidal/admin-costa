# Mails de invitación y cambio de clave

**Estado:** pendiente. Es el plan escrito; todavía no se hizo nada de esto.

**Objetivo:** que las invitaciones de usuarios y los mails de "elegir clave nueva" salgan desde
`@costadirecto.ar` con el nombre **Costa Directo**, y no desde Supabase.

**Referencia:** el mismo procedimiento que en recetas-tero (Gajo), `~/Proyectos/recetas-tero`.

**Dominios:**
- `costadirecto.ar` es el principal.
- `costadirecto.com.ar` solo redirige al `.ar`: la web y, si se quiere, los mails como alias de dominio.

> **Por qué hace falta.** Hoy los mails los manda el servicio de mails que trae Supabase. Ese
> servicio solo entrega a direcciones del equipo del proyecto en Supabase: a cualquier otra le
> contesta `Email address not authorized`. Además tiene un tope de pocos mails por hora, sale
> en inglés y desde una dirección genérica.
>
> Mientras no esté esto, invitar con **"Copiar link para WhatsApp"** (Usuarios). Ese botón no
> manda mail.

Cuando lo retomemos, se arranca por el paso 1. Antes de tocar el código o crear tablas, mostrar
la propuesta a Francisco.

---

## 1. Casilla del dominio (Google Workspace)

- Dar de alta `costadirecto.ar` en Google Workspace. Si sale más barato, agregarlo como dominio
  secundario o alias de la cuenta de Workspace que ya existe.
- Crear una cuenta real, por ejemplo `francisco@costadirecto.ar`.
- Si se quiere, agregar alias como `hola@` o `no-responder@`.
- `.com.ar`: solo redirige a `.ar`. La web siempre; los mails, como alias de dominio si se quiere.

## 2. DNS del dominio

Se cargan donde estén los DNS: NIC.ar, Vercel o Cloudflare.

| Registro | Nombre | Valor |
|---|---|---|
| MX | @ | Los que indique Google al dar de alta el dominio |
| TXT (SPF) | @ | `v=spf1 include:_spf.google.com ~all` |
| TXT (DKIM) | `google._domainkey` | Se genera en Google Admin → Apps → Gmail → Autenticar correo |
| TXT (DMARC) | `_dmarc` | `v=DMARC1; p=none; rua=mailto:<mail de Francisco>` |

Sin SPF y DKIM, los mails de invitación caen en spam.

Si los DNS pasan a Vercel por la web, cargar estos registros en el mismo lugar. No se pisan con
los de la web: esos son A/CNAME y estos son MX/TXT.

## 3. Contraseña de aplicación

- Activar la verificación en 2 pasos en la cuenta de Workspace.
- En https://myaccount.google.com/apppasswords, crear una llamada **"Supabase admin-costa"**.
- **No pegarla en el chat ni en el repo.** Va directo al panel de Supabase (paso 4).

## 4. Supabase → Authentication → Emails → SMTP Settings

Proyecto de admin-costa: `dpghrdgippisgzvlahwi`.

- **Enable custom SMTP:** activado.
- **Sender email:** el mail de la cuenta, o un alias verificado en Gmail desde "Enviar como".
- **Sender name:** `Costa Directo`.
- **Host:** `smtp.gmail.com`.
- **Port:** `465`.
- **Username:** el mail de la cuenta.
- **Password:** la contraseña de aplicación del paso 3.
- **Rate limits** (Authentication → Rate Limits): subir el límite de mails por hora. En Gajo está
  en 100/h.

## 5. Supabase → Authentication → URL Configuration

- **Site URL:** la dirección de la app, por ejemplo `https://costadirecto.ar`, o `https://app.costadirecto.ar`
  si el panel va en un subdominio.
- **Redirect URLs:**
  - `https://costadirecto.ar/**`
  - la dirección de Vercel `https://<proyecto>.vercel.app/**`
  - la de las previews, si se usan.

## 6. Supabase → Authentication → Emails → Templates

Se cargan dos plantillas: **Invite user** y **Reset password**.

El HTML ya está armado con la marca: logo, azul atlántico, línea coral y un solo botón. Está
guardado en el repo:

| Plantilla | Archivo | Asunto |
|---|---|---|
| Invite user | [`docs/mails/invitacion.html`](mails/invitacion.html) | `Te invitaron a Costa Directo` |
| Reset password | [`docs/mails/cambio-de-clave.html`](mails/cambio-de-clave.html) | `Restablecer tu contraseña` |

El botón de cada plantilla apunta a:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite      (invitación)
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery    (cambio de clave)
```

El logo sale de `{{ .SiteURL }}/marca/mail-logo.png`, ya subido en `public/marca/`. Por eso el
Site URL tiene que ser la dirección real de la web.

Si se cambia algún texto en Supabase, actualizar también la copia en `docs/mails/`.

## 7. Código (adaptar de recetas-tero)

En Gajo:
- `src/app/configuracion/usuarios/acciones.ts`: invitar, reenviar y cancelar con
  `auth.admin.inviteUserByEmail`. Solo el admin puede, y corre en el servidor.
- `src/app/auth/confirm/route.ts`: `verifyOtp({ type, token_hash })` y luego va a `/bienvenida`.
- `src/app/bienvenida/page.tsx`: el invitado elige su clave (`auth.updateUser({ password })`).

Cómo queda en admin-costa (gran parte ya existe):

| Qué | Hoy | Cambio |
|---|---|---|
| Invitar, reenviar, borrar | `app/api/admin/invitar/route.ts` y `app/api/admin/delete-user/route.ts`, solo admin, verificado por el token (ver `lib/adminServidor.ts`) | Ninguno. Ya usa `inviteUserByEmail`. "Copiar link para WhatsApp" sigue igual |
| Vuelta del link | El mail lleva a `/admin?bienvenida=1` y `app/admin/PanelAdmin.tsx` toma la sesión del link | Nueva página `/auth/confirm` que hace `verifyOtp` y manda a `/admin?bienvenida=1` |
| Elegir clave | Pantalla "Crear nueva contraseña" de `PanelAdmin.tsx` | Ninguno, se reusa. El cambio de clave también tiene que caer ahí: hoy `resetPasswordForEmail` vuelve a `/admin` |

**Diferencia con Gajo.** admin-costa guarda la sesión en el navegador (cliente de Supabase en
`lib/supabase.ts`), no en cookies. Por eso `/auth/confirm` tiene que ser una **página de
cliente** que llame a `supabase.auth.verifyOtp` en el navegador. Si fuera una ruta de servidor
como en Gajo, la sesión no le quedaría al navegador.

Si el link ya se usó o venció, mandar al ingreso con el aviso "El link venció, pedile otro al
administrador".

**Variables en Vercel:**
- `SUPABASE_SERVICE_ROLE_KEY` va solo como variable de servidor: nunca `NEXT_PUBLIC_` ni en el repo.
- Después de cargarla, hacer redeploy.
- Verificar que hoy ya esté cargada: sin ella fallan Invitar y Borrar cuenta.
- `NEXT_PUBLIC_SITE_URL` = el dominio nuevo, para la imagen al compartir el link (ver `app/layout.tsx`).

No hacen falta tablas nuevas.

## 8. Prueba

1. Invitar a un mail propio de prueba y revisar:
   - el remitente es "Costa Directo <…@costadirecto.ar>";
   - el mail no cae en spam;
   - el botón lleva a elegir clave;
   - después de elegirla, entra al panel con las secciones tildadas.
2. Con el mismo mail, probar "¿Olvidaste tu contraseña?": llega el mail y el botón lleva a elegir
   una clave nueva.
3. Usar un link por segunda vez, o uno vencido: tiene que mostrar el aviso y no quedar en blanco.
