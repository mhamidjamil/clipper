# Clipper Scheduler ✂️

Booking app for barber shops. Barbers publish their weekly hours and service menu, clients pick a free slot, and the app makes sure the same slot can never be sold twice.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-11-FFCA28?logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8?logo=tailwindcss&logoColor=white)

---

## What it does

**For clients**

- Browse barbers with photo, contact number, shop address and service menu
- Search barbers by name
- See today's open slots per barber, laid out as a simple time grid
- Book a slot in one tap; taken slots disappear live for everyone else
- Keep a personal profile with contact number and address, and review past bookings

**For barbers**

- Set a weekly schedule: enable or disable each day, with its own opening and closing time
- Choose the slot length once and let the grid generate itself
- Publish a service menu with a name, duration in minutes and price in PKR per service
- Watch bookings arrive live, no page refresh

**Under the hood**

- Role-aware accounts (`client` or `barber`) decide which screens a signed-in user sees
- Slot state is read straight from Firestore with `onSnapshot`, so two clients tapping the same slot cannot both win
- Slots are generated from the barber's own opening hours and slot length, not from a fixed table

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack dev server) |
| UI | React 19, Tailwind CSS, Radix UI primitives, Framer Motion, Lucide icons |
| Forms | React Hook Form with Zod resolvers |
| Data and auth | Firebase Authentication + Cloud Firestore |
| AI toolkit | Genkit with Google GenAI, wired up for the styling suggestion feature |
| Language | TypeScript throughout |

## Getting started

**Prerequisites:** Node.js 18 or newer, and a Firebase project with Authentication (email and password) plus Cloud Firestore enabled.

```bash
git clone https://github.com/mhamidjamil/clipper
cd clipper
npm install
```

Add your Firebase web app credentials to `src/firebase/config-object.ts`, then:

```bash
npm run dev          # http://localhost:9002
```

Other scripts:

```bash
npm run build        # production build
npm run start        # serve the production build
npm run lint         # Next.js lint
npm run typecheck    # tsc --noEmit
npm run genkit:dev   # Genkit developer UI for the AI flows
```

## Routes

| Path | Who | Purpose |
|---|---|---|
| `/` | everyone | Barber list and the booking grid |
| `/welcome` | new users | Pick whether you are booking or cutting |
| `/signup`, `/login` | everyone | Email and password authentication |
| `/availability` | barbers | Weekly opening hours and slot length |
| `/categories` | barbers | Service menu with duration and price |

## Data model

```
users/{uid}                      uid, email, role, name, mobileNumber, address
availability/{barberId}          slotDuration, schedule.{day}.{isEnabled,startTime,endTime}
serviceCategories/{id}           barberId, name, duration, price
bookings/{id}                    barberId, clientId, clientName, date, time
```

## Roadmap

- [ ] Automated booking confirmations over SMS or email
- [ ] Styling suggestion tool: upload a photo, get cut suggestions back from Genkit
- [ ] Barber profile bios and gallery
- [ ] Multi-day calendar view instead of today only

## Contributing

Issues and pull requests are welcome. For a larger change, open an issue first so we can agree on the approach before you spend time on it.
