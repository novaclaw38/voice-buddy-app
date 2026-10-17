VOICE BUDDY APP (Buddy - Tactical Academy)
===========================================

An AI mission-based learning companion for children, sold to parents as a "guilt-free
sitter". Buddy (Unit 01) is a disciplined, encouraging tactical specialist who turns
screen time into a 6-month skill-tree journey. Each lesson is a "Training Op".

CONCEPT
-------
- Child interface: a dark, HUD-style Command Center with missions and a voice assistant.
- Parent dashboard ("Promotion Center"): skill tree, rank status, and a short preview of
  what the child learned plus an off-screen challenge.
- Curriculum (6 months): Robotics, Human Systems, Orbital Mechanics, Cyber Security,
  Sustainability, then AI and a final project.
- Planned retention hooks: weekly Mission Debrief image and Sunday Storybook.
- Planned pricing: R149 per month via PayFast, with a 3-day trial.

TECH STACK
----------
React + Vite (PWA), Supabase, Groq for the LLM and voice, Vercel serverless functions.

PROJECT LAYOUT
--------------
  src/, public/, index.html   Front end
  api/                        Serverless functions
  agent/                      Agent configuration and instructions
  supabase/                   Database migrations
  scripts/, docs/             Tooling and documentation
  PRODUCT.md                  Master implementation document and curriculum
  DESIGN.md, AUDIT.md         Design system and audit notes

GETTING STARTED
---------------
  npm install
  cp .env.example .env           (fill in the values)
  npm run dev

See PRODUCT.md for the full product specification.
