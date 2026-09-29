import {
  type LucideIcon,
  Building2, Drama, Turtle, Palmtree, Music, Sunrise, Wine, Snowflake, Sun, Church,
  Waves, Landmark, Castle, Palette, Trees, Target, Sailboat, Building, Home,
  ShoppingBag, Footprints, Fish, Mountain, Utensils, Car, MapPin,
} from 'lucide-react';

/**
 * `TouristSpot.iconKey`/`CityData.iconKey` guardam uma CHAVE (string), não o
 * componente do ícone — esses objetos passam por `toJson()` pra dentro de
 * colunas JSONB do Supabase (`travel_history.tourist_spots`,
 * `itineraries.selected_spots`, o rascunho em `planner_progress`). Um
 * componente React não sobrevive a `JSON.stringify` (função é descartada em
 * silêncio), então a única forma seria embutir de novo o próprio emoji.
 * Guardando a chave, o ícone de verdade só é resolvido aqui, na hora de
 * renderizar.
 */
export const spotIconRegistry: Record<string, LucideIcon> = {
  Building2, Drama, Turtle, Palmtree, Music, Sunrise, Wine, Snowflake, Sun, Church,
  Waves, Landmark, Castle, Palette, Trees, Target, Sailboat, Building, Home,
  ShoppingBag, Footprints, Fish, Mountain, Utensils, Car, MapPin,
};

/**
 * `MapPin` como fallback protege contra registros antigos gravados antes
 * desta mudança (ainda com outro formato) ou uma chave que não exista mais
 * no catálogo — nunca quebra a renderização por causa de um dado velho.
 */
export const resolveSpotIcon = (iconKey: string | null | undefined): LucideIcon =>
  (iconKey && spotIconRegistry[iconKey]) || MapPin;
