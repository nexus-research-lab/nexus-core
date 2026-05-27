-- +goose Up
PRAGMA foreign_keys = OFF;

DROP INDEX IF EXISTS idx_connector_connections_state;

ALTER TABLE connector_connections RENAME TO connector_connections_old;

CREATE TABLE connector_connections (
    owner_user_id VARCHAR(64) NOT NULL DEFAULT '__system__',
    connector_id VARCHAR(128) NOT NULL,
    state VARCHAR(32) NOT NULL,
    credentials TEXT NOT NULL,
    auth_type VARCHAR(32) NOT NULL,
    oauth_state VARCHAR(255),
    oauth_state_expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    credentials_encrypted TEXT,
    PRIMARY KEY (owner_user_id, connector_id)
);

INSERT INTO connector_connections (
    owner_user_id, connector_id, state, credentials, auth_type, oauth_state, oauth_state_expires_at,
    created_at, updated_at, credentials_encrypted
)
SELECT
    '__system__', connector_id, state, credentials, auth_type, oauth_state, oauth_state_expires_at,
    created_at, updated_at, credentials_encrypted
FROM connector_connections_old;

DROP TABLE connector_connections_old;

CREATE INDEX IF NOT EXISTS idx_connector_connections_state ON connector_connections (state);
CREATE INDEX IF NOT EXISTS idx_connector_connections_owner_state ON connector_connections (owner_user_id, state);

PRAGMA foreign_keys = ON;

-- +goose Down
PRAGMA foreign_keys = OFF;

DROP INDEX IF EXISTS idx_connector_connections_owner_state;
DROP INDEX IF EXISTS idx_connector_connections_state;

ALTER TABLE connector_connections RENAME TO connector_connections_new;

CREATE TABLE connector_connections (
    connector_id VARCHAR(128) NOT NULL PRIMARY KEY,
    state VARCHAR(32) NOT NULL,
    credentials TEXT NOT NULL,
    auth_type VARCHAR(32) NOT NULL,
    oauth_state VARCHAR(255),
    oauth_state_expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    credentials_encrypted TEXT
);

INSERT INTO connector_connections (
    connector_id, state, credentials, auth_type, oauth_state, oauth_state_expires_at,
    created_at, updated_at, credentials_encrypted
)
SELECT
    connector_id, state, credentials, auth_type, oauth_state, oauth_state_expires_at,
    created_at, updated_at, credentials_encrypted
FROM connector_connections_new
WHERE owner_user_id = '__system__';

DROP TABLE connector_connections_new;

CREATE INDEX IF NOT EXISTS idx_connector_connections_state ON connector_connections (state);

PRAGMA foreign_keys = ON;
