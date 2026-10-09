# Identity and Access Management · primera parte

IAM es dueño de las invitaciones, roles y accesos de usuarios de una empresa. La suscripción pertenece a Commercial; el router conserva su política de suscripción activa y el siguiente avance compondrá esa regla con una sesión IAM.

Esta entrega incluye:

- Modelo de permisos, perfiles de rol, invitación y acceso.
- Validación de invitaciones, unicidad del correo dentro de la empresa y aislamiento entre empresas.
- Transiciones de concesión y revocación de acceso, asignación de rol y edición de permisos. El administrador no puede revocarse el acceso ni quitarse la capacidad de administrar usuarios.
- Regla pura `canSignIn`: solo un usuario de la empresa indicada, con invitación aceptada y acceso activo, cumple la política de ingreso.
- Pantalla `/iam/collaborators` con registro de colaboradores, invitación, concesión y revocación simuladas, roles y permisos, siguiendo los mockups proporcionados.

La pantalla usa estado local de demostración, que se reinicia al recargar. No autentica contraseñas, crea sesiones ni protege el backend. El siguiente avance añadirá la fake API, el inicio de sesión y la integración de guards; ninguna autorización sensible debe depender únicamente del frontend.
