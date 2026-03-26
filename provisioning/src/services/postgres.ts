import { Client } from 'pg';

/**
 * Creates a dedicated database and user for an EDC tenant on the shared PostgreSQL server.
 * Connects using POSTGRES_ADMIN_URL (admin credentials).
 *
 * Idempotent — safe to call multiple times for the same tenant.
 */
/**
 * Drops the tenant database and user from the shared PostgreSQL server.
 * Idempotent — safe to call even if the DB or user no longer exists.
 */
export async function deleteTenantDatabase(tenantCode: string): Promise<void> {
  const adminUrl = process.env.POSTGRES_ADMIN_URL;
  if (!adminUrl) throw new Error('POSTGRES_ADMIN_URL is not set');

  const dbName = `edc_${tenantCode}`;
  const dbUser = `edc_${tenantCode}`;

  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  try {
    // Terminate active connections before dropping
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [dbName],
    );

    const dbExists = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (dbExists.rowCount && dbExists.rowCount > 0) {
      await client.query(`DROP DATABASE "${dbName}"`);
      console.log(`[postgres] Dropped database "${dbName}"`);
    } else {
      console.log(`[postgres] Database "${dbName}" does not exist — skipping`);
    }

    const userExists = await client.query(`SELECT 1 FROM pg_roles WHERE rolname = $1`, [dbUser]);
    if (userExists.rowCount && userExists.rowCount > 0) {
      await client.query(`DROP USER "${dbUser}"`);
      console.log(`[postgres] Dropped user "${dbUser}"`);
    } else {
      console.log(`[postgres] User "${dbUser}" does not exist — skipping`);
    }
  } finally {
    await client.end();
  }
}

export async function createTenantDatabase(tenantCode: string, dbPass: string): Promise<void> {
  const adminUrl = process.env.POSTGRES_ADMIN_URL; // postgres.postgres-edc.svc.cluster.local
  if (!adminUrl) throw new Error('POSTGRES_ADMIN_URL is not set');

  const dbName   = `edc_${tenantCode}`;
  const dbUser   = `edc_${tenantCode}`;

  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  try {
    // Create user if not exists
    const userExists = await client.query(
      `SELECT 1 FROM pg_roles WHERE rolname = $1`, [dbUser],
    );
    if (userExists.rowCount === 0) {
      await client.query(`CREATE USER "${dbUser}" WITH PASSWORD '${dbPass}'`);
      console.log(`[postgres] Created user "${dbUser}"`);
    } else {
      // Update password to stay in sync with Vault
      await client.query(`ALTER USER "${dbUser}" WITH PASSWORD '${dbPass}'`);
      console.log(`[postgres] User "${dbUser}" already exists — password updated`);
    }

    // Create database if not exists
    const dbExists = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName],
    );
    if (dbExists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}" OWNER "${dbUser}"`);
      console.log(`[postgres] Created database "${dbName}"`);
    } else {
      console.log(`[postgres] Database "${dbName}" already exists — skipping`);
    }

    // Grant all privileges
    await client.query(`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${dbUser}"`);
    console.log(`[postgres] Granted privileges on "${dbName}" to "${dbUser}"`);
  } finally {
    await client.end();
  }
}
