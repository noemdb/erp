import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getSessionUser } from "@/modules/identity/session";

const f = createUploadthing();

export const ourFileRouter = {
  /** Logo de empresa: PNG con fondo transparente, 1 archivo, máx 1 MB. */
  companyLogo: f({
    image: { maxFileSize: "1MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const user = await getSessionUser();
      if (!user) throw new UploadThingError("Unauthorized");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file }) => {
      // Se guarda file.ufsUrl en companies.logo_url vía el formulario.
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
