# SaaS Multi-Tenant & RBAC Architecture

## Översikt
Detta dokument beskriver arkitekturen för att omvandla systemet till en fullskalig SaaS-plattform (Software as a Service) med multi-tenancy (flera isolerade företag) och RBAC (Role-Based Access Control) kombinerat med granulära behörigheter.

## 1. Multi-Tenancy (Företagsisolering)
Systemet är byggt så att flera företag kan använda samma databas utan att se varandras data.
* **Tabell `companies`**: Håller information om varje kund (namn, org.nr, licensplan, status, utgångsdatum).
* **`company_id`**: Alla tabeller i systemet (`users`, `avvikelser`, `risker`, `tasks`, `dokument`) har en `company_id` kolumn som pekar på `companies`.
* **Row Level Security (RLS)**: Supabase RLS används för att tvinga fram isoleringen på databasnivå. En användare kan *endast* läsa/skriva rader där `radens company_id == användarens company_id`.

## 2. Roller (Roles)
Roller definierar den övergripande hierarkin och administrativa rättigheter.
1. **`superadmin` (Systemägare)**: Kan se alla företag, hantera licenser och skapa företagsadmins. Har tillgång till Superadmin-portalen. Förbikopplar normal RLS (kan se all data).
2. **`admin` (Företagsadmin)**: Kan hantera sitt eget företags inställningar och bjuda in/redigera användare inom sitt eget `company_id`.
3. **`user` (Användare)**: Standardanvändare som endast interagerar med systemets moduler (Avvikelser, Risker etc.) baserat på sina granulära behörigheter.

## 3. Granulära Behörigheter (Permissions)
För att ge flexibilitet utöver grundrollerna har varje användare en array av behörigheter (`permissions` kolumn i `users` tabellen). Detta styr exakt vilka knappar och funktioner de ser i UI:t.

* **`viewer`**: Kan endast läsa data. (Döljer "Skapa", "Redigera", "Radera").
* **`read_write`**: Kan skapa och redigera data (t.ex. rapportera en avvikelse).
* **`approve`**: Kan godkänna, utreda och genomföra åtgärder (t.ex. steg 3 och 4 i avvikelsehanteringen).
* **`archive`**: Kan stänga ärenden, arkivera och återöppna från arkiv.

*Exempel: En extern revisor kan få rollen `user` med enbart behörigheten `viewer`. En avdelningschef kan få rollen `user` med `read_write` och `approve`.*

## 4. Implementeringsplan
* **Etapp 1**: Databasstruktur (Skapa `companies`, lägg till `company_id` och `permissions` på alla tabeller).
* **Etapp 2**: Superadmin Portal (Koppla UI till databasen för att hantera företag och användarbehörigheter).
* **Etapp 3**: Säkerhet & UI-anpassning (Införa RLS i Supabase och dölja/visa knappar i React baserat på användarens `permissions` array).

## Framtida underhåll
När nya moduler (tabeller) läggs till i framtiden MÅSTE de inkludera en `company_id` kolumn och RLS-policyer för att upprätthålla SaaS-isoleringen. UI-komponenter bör alltid kontrollera `user.permissions.includes('...')` innan de renderar åtgärdsknappar.
