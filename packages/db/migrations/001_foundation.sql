-- Better Auth owns user/session/account/verification semantics. Reviewed against
-- Better Auth 1.7.5 core schema; modifications require a schema compatibility check.
CREATE TABLE "user" (
  id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false, image text,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE session (
  id text PRIMARY KEY, "expiresAt" timestamptz NOT NULL, token text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL,
  "ipAddress" text, "userAgent" text, "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX session_user_idx ON session("userId");
CREATE TABLE account (
  id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" text, "refreshToken" text, "idToken" text,
  "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, scope text, password text,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL,
  UNIQUE ("providerId", "accountId")
);
CREATE INDEX account_user_idx ON account("userId");
CREATE TABLE verification (
  id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL,
  "expiresAt" timestamptz NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_identifier_idx ON verification(identifier);
-- Application identity is deliberately distinct from the auth subject.
CREATE TABLE app_accounts (
  id uuid PRIMARY KEY, auth_user_id text NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL
);
CREATE TABLE organizations (id uuid PRIMARY KEY, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE memberships (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES app_accounts(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('manager', 'field_worker')),
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (organization_id, account_id)
);
CREATE TABLE projects (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  id uuid NOT NULL, name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  description text NOT NULL CHECK (length(description) <= 4000), address text NOT NULL CHECK (length(address) <= 500),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'complete')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, id)
);
CREATE TABLE assignments (
  organization_id uuid NOT NULL, project_id uuid NOT NULL, account_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (organization_id, project_id, account_id),
  FOREIGN KEY (organization_id, project_id) REFERENCES projects(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, account_id) REFERENCES memberships(organization_id, account_id) ON DELETE CASCADE
);
CREATE INDEX assignment_account_idx ON assignments(organization_id, account_id);
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO htrack_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON "user", session, account, verification TO htrack_runtime;
GRANT SELECT ON app_accounts, organizations, memberships, projects, assignments TO htrack_runtime;
