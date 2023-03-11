# Prisma Seeder

## About

Prisma Seeder is a CLI tool to automatically populate your database with dummy data based on your schema.prisma file.

## Motivation

Prisma has a feature to [seed the database](https://www.prisma.io/docs/guides/database/seed-database) using `npx prisma db seed`. However, you still need to write the script to create entries to your database. With Prisma Seeder, you don't need to write the script.

# Installation

Prisma Seeder is written using TypeScript for Node.js environment. So you can install it as follows

```
npm install -g @hyperjumptech/prisma-seeder
```

# Usage

```
prisma-seeder --schema <path_to_schema_prisma_file> --database-url <url_of_the_database>
```

# Development

clone the repo, then install dependencies using

```
npm install
```

then run

```
./bin/dev --schema <path_to_schema_prisma_file> --database-url <url_of_the_database>
```

# Testing

To run the test in your computer:

1. Run `npm run dbsetup` in a terminal tab. Note: You need to install and run docker first.
2. Run `npm run test` in a different terminal tab.

# License

MIT
