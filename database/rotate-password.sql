\set ON_ERROR_STOP on
\getenv database_password POSTGRES_PASSWORD
-- psql quotes the secret as a SQL literal; it never appears in command arguments/output.
ALTER ROLE platform PASSWORD :'database_password';
