import { z } from 'zod'

/**
 * Schemas Zod del catálogo (doc 04/05). Los tipos TS se infieren de aquí
 * (`z.infer`) — una sola fuente de verdad. La capa de servicios valida cada
 * respuesta para detectar drift cuando el backend real reemplace a MSW.
 */

export const contentTypeSchema = z.enum(['G', 'V'])
export const videoTypeSchema = z.enum(['C', 'M', 'OVA', 'ONA', 'S', 'TV'])

export const genreSchema = z.object({
  id: z.number(),
  name: z.string(),
  /**
   * Sin `min/max` a propósito (hallazgo #21 de la auditoría del 2026-10-01).
   * El rango 1–11 del doc 05 es una **convención de paleta**, no un invariante
   * del backend: el serializer emite `genre.genre_color or 0`, así que un
   * género al que en Odoo se le eligió "sin color" llega con **0**. Con el
   * `min(1)` eso hacía fallar el `parse` del array paginado **entero** y se
   * caían catálogo, home, búsqueda y detalle con un "Try again" que nunca iba
   * a funcionar, hasta corregir el dato en Odoo. Y la UI ya sabía qué hacer:
   * `GenreBadge` resuelve cualquier índice fuera de rango con un color neutro.
   * Zod valida **forma**, no convenciones estéticas.
   */
  colorIndex: z.number().int(),
})

export const platformRefSchema = z.object({
  id: z.number(),
  name: z.string(),
  imageUrl: z.string().nullable(),
})

export const companyRefSchema = z.object({
  id: z.number(),
  name: z.string(),
  typeName: z.string().nullable(),
})

export const countryRefSchema = z.object({
  id: z.number(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  languageCode: z.string().nullable(),
})

export const altNameSchema = z.object({
  id: z.number(),
  name: z.string(),
  languageCode: z.string().nullable(),
})

export const imageRefSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string(),
})

export const versionDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  order: z.number(),
  episodes: z.number(), // 0 => desconocido / en emisión
  /**
   * `nullable` porque el serializer puede emitirlo (hallazgo #30): hace
   * `version.version_date.isoformat() if version.version_date else None`.
   * Hoy `version_date` es `required=True` en el modelo, así que es improbable
   * — pero el serializer se cubrió por algo, y si pasa el mecanismo es el
   * mismo que #21: `ErrorState` permanente en el detalle.
   */
  releaseDate: z.string().nullable(),
  country: countryRefSchema.nullable(),
  dubbingStudio: companyRefSchema.nullable(),
  platform: platformRefSchema.nullable(),
})

export const contentDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  alternativeNames: z.array(altNameSchema),
  abbreviation: z.string().nullable(),
  description: z.string(),
  imageUrl: z.string().nullable(),
  type: contentTypeSchema,
  videoType: videoTypeSchema.nullable(),
  order: z.number(),
  genres: z.array(genreSchema),
  companies: z.array(companyRefSchema),
  versions: z.array(versionDetailSchema),
})

export const franchiseSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  genres: z.array(genreSchema),
  contentCounts: z.object({
    games: z.number(),
    videos: z.number(),
  }),
  yearRange: z.object({
    from: z.number().nullable(),
    to: z.number().nullable(),
  }),
})

export const franchiseDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  alternativeNames: z.array(altNameSchema),
  description: z.string(),
  imageUrl: z.string().nullable(),
  gallery: z.array(imageRefSchema),
  gameContents: z.array(contentDetailSchema),
  videoContents: z.array(contentDetailSchema),
})

export const contentDetailWithFranchiseSchema = contentDetailSchema.extend({
  franchise: z.object({
    id: z.number(),
    name: z.string(),
    imageUrl: z.string().nullable(),
  }),
})

export const searchHitSchema = z.object({
  kind: z.enum(['franchise', 'content']),
  id: z.number(),
  name: z.string(),
  mainName: z.string(),
  imageUrl: z.string().nullable(),
  franchiseId: z.number(),
  contentType: contentTypeSchema.nullable(),
})
