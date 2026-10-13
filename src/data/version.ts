/** Bump when content definitions change in a way that saves must react to. */
export const CONTENT_VERSION = 1;
/** Bump when the save schema shape changes; add a migration in persistence/migrations.ts. */
export const SAVE_VERSION = 1;
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";
