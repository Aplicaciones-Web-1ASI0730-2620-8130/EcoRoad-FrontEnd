# Identity and Access Management

IAM owns company users, invitations, access grants, roles, permissions and demo sessions. Commercial owns company registration and subscription status; the router composes both policies before opening operational views.

## Local flow

1. Run `npm run dev` and open `/iam/login` (or navigate to `/projects`, which redirects to login).
2. For the seeded company, sign in with `c.mendoza@empresa.pe` and `EcoRoadDemo123!`.
3. In `/iam/collaborators`, invite a user, grant access and assign a role or permissions. The invited user can sign in with their email and the same demo password only after the grant.
4. Revoke access to make any existing session invalid. Sign out using **Salir** in the operational header.

Newly registered companies receive an administrator IAM user using the email entered during registration. The same local demo password applies. The selected company is stored by Commercial; the session token is kept in `sessionStorage` and checked with the fake API on navigation. All fake API data is in memory and resets on server restart.

## Fake API contract

- `POST /api/iam/sessions` — verify email, demo password and active access; return an opaque session token.
- `GET|DELETE /api/iam/sessions/current` — read or end the current session.
- `GET /api/iam/users` — list users in the authenticated administrator's company.
- `POST /api/iam/invitations` — create an invitation without access.
- `POST /api/iam/users/:id/grant` and `/revoke` — change access status.
- `PUT /api/iam/users/:id/role` and `/permissions` — change authorization.

IAM management endpoints resolve the actor from the bearer token and enforce company isolation and `manage_users` on the server. Route guards require an active session, the selected company, the relevant permission, and the existing Commercial subscription policy. Operational fake APIs from the other bounded contexts still use their existing demo company header; their server-side authorization must be integrated with a real identity provider before production. The shared demo password and in-memory sessions are exclusively for local simulation.
