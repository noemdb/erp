import { customType } from "drizzle-orm/pg-core";

/** citext para RIF/email normalizado (requiere extensión citext, migración 0001). */
export const citext = customType<{ data: string }>({
  dataType: () => "citext",
});

/** daterange para vigencias y períodos (requiere btree_gist para EXCLUDE). */
export const daterange = customType<{ data: string }>({
  dataType: () => "daterange",
});
