import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
