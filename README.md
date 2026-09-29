# Bookshelf Project

## Description

## Running the database locally

The project uses PostgreSQL in Docker. Make sure Docker Desktop is running, then run these from the project root:

| Action | Command |
|---|---|
| Start the database (first time or after `down`) | `docker compose up -d` |
| Stop, keeping the container | `docker compose stop` |
| Start again after `stop` | `docker compose start` |
| Stop and remove the container (data is kept) | `docker compose down` |
| Check what's running | `docker compose ps` |

Data is stored in the `pgdata` Docker volume, so it persists between restarts.

### Resetting the database

To wipe all data and re-apply `db/schema.sql` from scratch:

```bash
docker compose down -v
docker compose up -d
```

> **Warning:** the `-v` flag deletes the volume and all stored data.