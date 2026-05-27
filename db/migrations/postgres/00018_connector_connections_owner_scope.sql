-- +goose Up
ALTER TABLE connector_connections ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64) NOT NULL DEFAULT '__system__';

ALTER TABLE connector_connections DROP CONSTRAINT IF EXISTS connector_connections_pkey;
ALTER TABLE connector_connections ADD PRIMARY KEY (owner_user_id, connector_id);

CREATE INDEX IF NOT EXISTS idx_connector_connections_owner_state ON connector_connections (owner_user_id, state);

-- +goose Down
DROP INDEX IF EXISTS idx_connector_connections_owner_state;

ALTER TABLE connector_connections DROP CONSTRAINT IF EXISTS connector_connections_pkey;
ALTER TABLE connector_connections ADD PRIMARY KEY (connector_id);
ALTER TABLE connector_connections DROP COLUMN IF EXISTS owner_user_id;
