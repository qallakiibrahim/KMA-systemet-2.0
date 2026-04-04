# Utvecklingsplan: SafeQMS Skalbarhet & Verksamhetsanpassning

Denna plan syftar till att göra SafeQMS till ett robust, skalbart och juridiskt hållbart ledningssystem som uppfyller kraven för ISO-standarder (t.ex. ISO 9001, 27001).

## Fas 1: Grundläggande Spårbarhet & Skalbarhet (Vecka 1)
*   **Audit Trail (Händelselogg):** Implementera databastriggers och UI för att logga alla ändringar (Vem, Vad, När).
    *   *Tid:* 2-3 dagar.
*   **Skalbarhet (Paginering & React Query):** Refaktorera API-anrop för att hantera stora datamängder utan prestandaförlust.
    *   *Tid:* 3-4 dagar.

## Fas 2: Dokumentstyrning & Versionering (Vecka 2)
*   **Versionering:** System för utkast, publicering och arkivering av dokument.
    *   *Tid:* 3-4 dagar.
*   **Godkännandeflöden:** Formella steg för att godkänna kritiska dokument och ärenden.
    *   *Tid:* Ingår i versionering.

## Fas 3: Integration & Notifiering (Vecka 3)
*   **Modulintegration:** Skapa kopplingar mellan Risk -> Uppgift och Avvikelse -> Process.
    *   *Tid:* 2-3 dagar.
*   **Notifikationscenter:** In-app notifieringar för tilldelade uppgifter och deadlines.
    *   *Tid:* 2 dagar.

## Fas 4: Design & Konsekvens (Löpande)
*   **Globalt Designsystem:** Standardisera alla komponenter (Modaler, Tabeller, Knappar) för 100% konsekvens.
    *   *Tid:* 3 dagar.

---

## Risker att hantera
1.  **Säkerhet (RLS):** Säkerställ att företag aldrig ser varandras data.
2.  **Prestanda:** Indexera databasen rätt för Audit Trails.
3.  **UX:** Håll gränssnittet enkelt trots ökad komplexitet.

---
*Senast uppdaterad: 2026-04-04*
