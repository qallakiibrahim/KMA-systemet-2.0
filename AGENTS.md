# Instruktioner för AI-Assistenten (SafeQMS)

## Utvecklingsplan & Påminnelser
*   **Viktigt:** Vi har kommit överens om en specifik utvecklingsplan för att göra SafeQMS skalbart och verksamhetsanpassat (se `/DEVELOPMENT_PLAN.md`).
*   **Din roll:** Påminn användaren om att hålla sig till denna plan om de föreslår ändringar som går utanför ramen eller om de verkar ha glömt prioriteringarna.
*   **Prioriteringar:**
    1.  **Audit Trail (Händelselogg):** Först på listan för att säkerställa spårbarhet.
    2.  **Skalbarhet (Paginering):** För att hantera stora datamängder.
    3.  **Dokumentstyrning:** För ISO-efterlevnad.

## Designprinciper
*   Använd kvadratiska knappar med runda hörn (`border-radius: 0.625rem`).
*   Standardisera `.btn-icon-mini` för konsekvent UI.
*   Dölj stora "Lägg till"-knappar i headern på desktop och flytta dem till kontextuella platser (t.ex. kolumnrubriker i Kanban).
