CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  route_kind TEXT NOT NULL CHECK (route_kind IN ('subscription','api_paid','local')),
  registered_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE capabilities (
  provider_id TEXT NOT NULL REFERENCES providers(id),
  operation TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('verified','partial','unverified','unsupported','unavailable')),
  evidence_source TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  PRIMARY KEY (provider_id, operation)
);
