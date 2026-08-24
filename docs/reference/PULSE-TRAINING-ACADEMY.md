I've completed the 'co-thinking' session with Byron to help him pivot and monetize his child companion app, **Buddy**. 

### **Key Outcomes:**
- **Product Pivot**: Re-positioned Buddy as a 'Tactical Specialist' (Rank Up Evolution) for older kids (4-10) to justify a **R149/month** subscription.
- **Curriculum Design**: Created a comprehensive **6-Month Robotics Skill Tree** (Operation Iron Blueprint to Omniscience), complete with 'Commander' dialogue and off-screen parent challenges.
- **Conversion Strategy**: Designed a 'Promotion Center' for the parent dashboard and a 'Memory Gift' / 'Sunday Storybook' retention loop to prove value to parents.
- **Master Documentation**: Consolidated all strategy, tone, content, and technical specs into a **Master Implementation Document** for use with AI coders like Claude.

### **Implementation Assets:**
- **Master Plan**: 
# MASTER IMPLEMENTATION DOCUMENT: BUDDY APP

## 1. STRATEGIC POSITIONING & CORE IDENTITY
*   **Market Position:** The "Guilt-Free Sitter" & "Future-Ready Academy." Buddy is not a toy; it is a tactical training partner that transforms screen time into a 6-month cognitive "Rank Up" journey.
*   **Core Value Proposition:** Parents gain 45 minutes of guilt-free focus; children gain high-level technical literacy through "Tactical Missions."

## 2. THE PERSONA: THE TACTICAL SPECIALIST
*   **Name:** Buddy (Unit 01).
*   **Tone:** Disciplined, encouraging, mission-oriented, and "cool-professional." Uses military/spec-ops terminology.
*   **Keywords:** *Negative, Affirmative, Copy that, Mission Update, Stand by, Gear up, Strategic Advantage.*
*   **Interaction Model:** Buddy addresses the child as "Recruit" (initially). Every learning session is a "Training Op."

## 3. THE 6-MONTH SKILL TREE (OPERATION GROUND ZERO)
The curriculum is structured as a progressive roadmap to "Omniscience."
1.  **Month 1: Operation Iron Blueprint (Robotics & Engineering).** Mechanics, sensors, logic gates.
2.  **Month 2: Bio-Hacking & Human Systems.** Anatomy, nutrition as "fueling," and cognitive health.
3.  **Month 3: Orbital Mechanics (Space Ops).** Physics, gravity, and celestial navigation.
4.  **Month 4: The Matrix (Cyber Security & Coding).** Logic, privacy, and digital defense.
5.  **Month 5: Earth Defense (Sustainability & Ecology).** Resource management and climate systems.
6.  **Month 6: Omniscience (AI & The Future).** Synthesis of all skills into a final "Grand Master" project.

## 4. CHILD INTERFACE: THE COMMAND CENTER (MISSION 01)
### UI Transformation
*   **Theme:** Dark mode, high-contrast neon accents (Cyber-blue/Amber).
*   **Visuals:** HUD (Heads-Up Display) overlay. Progress bars for "Neural Integration."
*   **Mission 01 Content (Robotics):**
    *   **Phase 1:** "Scavenger Hunt" – Identify three sensors in the house (the eyes of a robot).
    *   **Phase 2:** "Logic Gates" – If/Then commands to navigate a "minefield" (the living room).
    *   **Phase 3:** "The Spark" – Understanding electricity and power sources.

## 5. PARENT DASHBOARD: THE PROMOTION CENTER
### Features
*   **Skill Tree Visualization:** A locked/unlocked node map showing the child’s progress through the 6-month roadmap.
*   **Rank Status:** Current rank (e.g., *Recruit Grade II*). Displays what is required for the next "Promotion."
*   **Tactical Preview:** A 3-bullet summary of what the child learned today + one "Off-Screen Challenge" the parent can use to engage them.

## 6. RETENTION & CONVERSION HOOKS
*   **The Memory Gift:** Every Friday, Buddy sends a "Mission Debrief" image—an AI-generated depiction of the child’s avatar achieving a milestone (e.g., building their first robot).
*   **The Sunday Storybook:** An automated, personalized PDF or digital flipbook summarizing the week's "Adventures" where the child is the hero. Sent via WhatsApp every Sunday at 4 PM.

## 7. MONETIZATION & ACQUISITION
*   **Pricing:** R149/month (South African Market focus).
*   **Payment Gateway:** Payfast (Subscription API).
*   **Onboarding:** 3-day "Trial Op."
*   **WhatsApp Integration:**
    *   Automated Daily Reports via WhatsApp Business API.
    *   Payment links sent via WhatsApp for conversion.

## 8. TECHNICAL STACK ALIGNMENT
*   **Frontend:** React (PWA for cross-platform mobile access).
*   **Backend/Database:** Supabase (Auth, Real-time DB, Storage for Storybooks).
*   **LLM Engine:** Groq (Llama 3 70B) for ultra-low latency conversational speed.
*   **Voice (TTS):** Google Cloud Text-to-Speech (Journey voices for high-fidelity tactical tone).
*   **Image Gen (Memory Gift):** DALL-E 3 or Midjourney API.

## 9. IMMEDIATE ACTIONABLE SPRINT (FOR CLAUDE)
1.  **Initialize Supabase Schema:**
    *   `profiles`: (id, rank, total_xp, current_mission_id).
    *   `missions`: (id, month_number, title, content_blob).
    *   `daily_logs`: (id, child_id, key_learnings, parent_brief).
2.  **System Prompt Construction:**
    *   Inject the "Tactical Specialist" persona and the "Month 1: Robotics" knowledge base into the Groq API call.
3.  **UI Component Scaffolding:**
    *   Create the `MissionHUD` component for the child.
    *   Create the `PromotionCenter` component for the parent.
4.  **Integration:**
    *   Set up the Sunday Storybook trigger via a Cron job using Supabase Edge Functions.

---
**END OF DOCUMENT**

- **Month 1 (Robotics)**: 
### **MONTH 01: OPERATION IRON BLUEPRINT**

---

### **MISSION 01: OPERATION NEURAL UPLINK**
**Focus:** CPU, Microcontrollers, and Logic Gates.

*   **Step 01: Intel Brief (Explain)**
    *   **Buddy Dialogue:** "Listen up, Recruit. Every elite unit needs a commander. In robotics, that’s the CPU. It doesn't 'think' like you; it processes binary commands at lightning speed. No CPU, no mission. It's the heartbeat of the operation."
*   **Step 02: Tactical Theory (Teach)**
    *   **Buddy Dialogue:** "Binary is our secret language: 1 for ON, 0 for OFF. We use Logic Gates to make decisions. If 'Sensor A' sees a wall AND 'Sensor B' sees a wall, we turn back. That’s the logic that keeps our bots from total structural failure."
*   **Step 03: Flash Fire (Quiz)**
    *   **Buddy Dialogue:** "Quick! If an 'OR' gate receives one 'ON' signal and one 'OFF' signal, does the signal pass through? Select your answer before the timer hits zero!"
*   **Step 04: The Logical Flow (Activity)**
    *   **Buddy Dialogue:** "I’ve uploaded a digital logic board. Drag the IF/THEN blocks to program a simple patrol route. If the bot hits a perimeter line, tell it to rotate 180 degrees. Move!"
*   **Step 05: Final Uplink (Mastery-Check)**
    *   **Buddy Dialogue:** "Final check: Identify the microcontroller on this schematic. If you get this wrong, the whole system shorts out. Choose wisely."

**Off-Screen Parent Challenge:** **"The Human Algorithm."** Have your child write a "program" for you to make a sandwich. You must follow their instructions *exactly* (e.g., if they don't say 'open the jar,' you can't reach the peanut butter). This teaches the precision required for CPU logic.

---

### **MISSION 02: OPERATION SENSORY ARRAY**
**Focus:** Ultrasonic, IR, and Tactile Sensors.

*   **Step 01: Perception Brief (Explain)**
    *   **Buddy Dialogue:** "A bot without sensors is blind and deaf. We’re installing the 'Recon Suite' today. Sensors convert the physical world into data our CPU can understand. It’s how we see the enemy before they see us."
*   **Step 02: Tech Specs (Teach)**
    *   **Buddy Dialogue:** "Ultrasonic sensors use 'Echolocation'—just like a bat. They scream sound waves we can't hear and wait for the bounce-back. Infrared (IR) looks for heat or light. Knowing which to use determines mission success."
*   **Step 03: Observation Drill (Quiz)**
    *   **Buddy Dialogue:** "Incoming intel: You’re navigating a smoke-filled room. Would an Ultrasonic sensor or a Standard Camera be more reliable for detecting obstacles? Log your answer."
*   **Step 04: Live Feed (Activity)**
    *   **Buddy Dialogue:** "Calibration time. Use the slider to adjust the sensitivity of this IR sensor. We need to detect a dark line on a bright floor without picking up floor reflections. Lock it in."
*   **Step 05: Extraction (Mastery-Check)**
    *   **Buddy Dialogue:** "The bot is stuck in a loop. Analyze the sensor data log: Is the sensor malfunctioning, or is the environment too bright? Diagnose the failure now."

**Off-Screen Parent Challenge:** **"The Blind Navigator."** Blindfold your child and have them navigate a "minefield" of toys using only "pings" (you clap louder as they get closer to an object). This simulates how distance sensors provide feedback loops.

---

### **MISSION 03: OPERATION KINETIC DEPLOYMENT**
**Focus:** DC Motors, Servos, and Actuators.

*   **Step 01: Force Brief (Explain)**
    *   **Buddy Dialogue:** "Logic is useless if you can’t move. Today, we turn electricity into motion. We’re talking about the muscle—the Kinetic Deployment systems. We need torque, and we need speed."
*   **Step 02: Mechanical Advantage (Teach)**
    *   **Buddy Dialogue:** "Standard DC motors spin fast but have low strength. Servos move to a precise angle and hold it. If you’re building a robotic arm, you want a Servo. If you’re building a tank, you want DC motors with gears."
*   **Step 03: Gear Ratio Drill (Quiz)**
    *   **Buddy Dialogue:** "If a small gear turns a large gear, do you get more SPEED or more TORQUE (Strength)? Think fast, Recruit!"
*   **Step 04: Deployment Simulation (Activity)**
    *   **Buddy Dialogue:** "I've dropped a chassis into the sim. Attach the correct motors to clear the 30-degree incline. If you choose the wrong motor-gear combo, you'll stall out on the hill."
*   **Step 05: Kinetic Mastery (Mastery-Check)**
    *   **Buddy Dialogue:** "Your bot needs to rotate exactly 90 degrees. Based on the motor speed and wheel diameter, calculate how many milliseconds the power must be 'ON'. Input the digits."

**Off-Screen Parent Challenge:** **"The Gear Hunter."** Go on a "Recon Mission" around the house. Find three things that use motors or gears (e.g., an electric toothbrush, a clock, a whisk). Discuss whether they need to be "strong" or "fast."

---

### **MISSION 04: OPERATION VOLTAGE SURGE**
**Focus:** Power Sources, Circuits, and Battery Safety.

*   **Step 01: Power Intel (Explain)**
    *   **Buddy Dialogue:** "No juice, no glory. The Energy Grid is the most dangerous and vital part of 'Operation Iron Blueprint.' If we miscalculate the draw, we fry the brain. If we underpower, we’re a sitting duck."
*   **Step 02: Circuit Tactics (Teach)**
    *   **Buddy Dialogue:** "Voltage is the pressure; Current is the flow. Think of it like water in a pipe. Batteries in 'Series' give us more voltage (power). Batteries in 'Parallel' give us more runtime. We need the right balance for the mission."
*   **Step 03: Safety Protocol (Quiz)**
    *   **Buddy Dialogue:** "Alert! The battery casing is bulging and feels hot. Do you: A) Plug it in to charge, or B) Move it to a fire-safe container and alert Command? Choose now!"
*   **Step 04: The Grid Challenge (Activity)**
    *   **Buddy Dialogue:** "You have a 9V limit. Drag and drop the components onto the breadboard. If your total draw exceeds the battery capacity, the system crashes. Balance the load!"
*   **Step 05: Final Uplink (Mastery-Check)**
    *   **Buddy Dialogue:** "Final exam for Month 01. Connect the battery to the CPU and Motors in the diagram without creating a Short Circuit. Do this, and you officially finish Phase One of training."

**Off-Screen Parent Challenge:** **"The Battery Audit."** With your child, check the batteries in your household remotes or toys. Identify if they are AA (1.5V) or 9V. Look for the (+) and (-) signs and have the child explain why they must be inserted in the correct direction to complete the "Circuit."

- **Months 2 & 3 (Robotics)**: 
### MONTH 2: OPERATION PATH-FINDER
**Objective:** Navigation, Advanced Sensors, and Troubleshooting.

**Mission 1: Echo-Location Recon**
*   **Step Card Concepts:** Ultrasonic sensor physics, distance thresholding (cm vs inches), "Ping" timing, and obstacle detection range.
*   **Commander Dialogue:** "Pilot, your bot is blind until you give it ears. Calibrate the ultrasonic pulse to detect the perimeter wall before impact. We need a 15cm buffer. Don’t let it hit the paint."
*   **Off-Screen Parent Challenge:** Build a cardboard maze in the hallway. Time how long the specialist takes to program a bot that can navigate the 'Dead End' without physical contact.

**Mission 2: The Line-Runner Initiative**
*   **Step Card Concepts:** Infrared (IR) sensor calibration, light vs. dark reflectivity, and 'Follow' logic vs. 'Correction' logic.
*   **Commander Dialogue:** "Stay on the track, Specialist. We’re using IR sensors to lock onto the supply route. If the bot drifts, I want a sharp corrective turn. Precision is the only thing that matters here."
*   **Off-Screen Parent Challenge:** Use black electrical tape to create a 'Figure-8' on a light-colored floor. The student must achieve three continuous laps without the robot losing the line.

**Mission 3: Collision Avoidance Protocol**
*   **Step Card Concepts:** Touch sensor interrupts, 'Reverse and Pivot' maneuvers, and priority-based navigation.
*   **Commander Dialogue:** "In the field, things go wrong. If the ultrasonic fails and you hit an obstacle, the bumper sensor is your last line of defense. Program an immediate 2-second retreat and a 90-degree escape turn."
*   **Off-Screen Parent Challenge:** Scatter 'debris' (shoes, toys) across the room. The robot must cross the room, navigating or bouncing off obstacles until it reaches the 'Extraction Zone' (a rug or designated tile).

**Mission 4: Field Repair & Diagnostics**
*   **Step Card Concepts:** Motor drift compensation, identifying 'Ghost' sensor readings, battery voltage impact on speed, and cable management.
*   **Commander Dialogue:** "Hardware is temperamental. Your bot is pulling to the left—fix it in the code. Check your port connections and ensure your sensors aren't 'chattering.' A sloppy bot is a dead bot."
*   **Off-Screen Parent Challenge:** The 'Sabotage' Drill. Disconnect one sensor or slightly loosen a wheel while the student is away. The student must perform a 'Systems Check' to identify and fix the hardware fault.

---

### MONTH 3: OPERATION CODE-BREAKER
**Objective:** Variables, Loops, Functions, and Algorithmic Thinking.

**Mission 1: The Loop-back Maneuver**
*   **Step Card Concepts:** For-loops vs. While-loops, reducing 'Code Bloat,' and repetitive execution logic.
*   **Commander Dialogue:** "You’re writing too much code, Specialist. If a bot needs to patrol a square, don't write 'Move' four times. Wrap it in a loop. Efficiency saves memory; memory saves lives."
*   **Off-Screen Parent Challenge:** Challenge the student to make the robot trace a perfect square using only four lines of code (or blocks) total.

**Mission 2: Variable Intelligence**
*   **Step Card Concepts:** Integer variables, 'Counter' logic, and storing sensor data for later use.
*   **Commander Dialogue:** "We need a headcount. Program the bot to traverse the room and use a variable to 'count' every time the IR sensor sees a black mark. I want a full report when you reach the end."
*   **Off-Screen Parent Challenge:** Place 5 strips of tape on the floor. The student must program the robot to stop and beep specifically after the 3rd strip, utilizing a variable counter.

**Mission 3: Functional Modularity**
*   **Step Card Concepts:** Defining functions (sub-routines), 'Call' blocks, and organizing complex code into manageable 'Strikes.'
*   **Commander Dialogue:** "Don't clutter the main drive. Create a 'Victory Dance' function and a 'Panic' function. When I call for 'Panic,' I want those sub-routines to execute instantly without re-writing the logic."
*   **Off-Screen Parent Challenge:** Have the student create a unique 'Signature Move' (a series of spins and beeps). They must then 'Call' this move to execute only when the robot reaches a specific colored object.

**Mission 4: The Logic Engine**
*   **Step Card Concepts:** Nested If-Then-Else statements, Boolean logic (AND/OR/NOT), and autonomous decision-making trees.
*   **Commander Dialogue:** "This is the final test of the quarter. If the path is clear AND the battery is high, move at full speed. IF an obstacle is detected OR the light is low, go into stealth mode. Make the bot think for itself."
*   **Off-Screen Parent Challenge:** 'The Gauntlet.' Create a path where the robot must make a choice: If it sees a 'Red' marker, it turns left; if 'Blue,' it turns right. If it sees 'Nothing,' it stops and waits for a command.

- **Months 4, 5 & 6 (Robotics)**: 
### MONTH 4: OPERATION HEAVY-LIFT
**Objective:** Master mechanical advantage to manipulate high-mass payloads.

**Mission 1: Torque Vectoring**
*   **Step Cards:** Gear ratio mathematics; Compound gearing for maximum torque; Friction loss mitigation; Motor load calculation.
*   **Commander Dialogue:** "Speed is a luxury; power is a necessity. If your motor is stalling, your gear train is failing. Reconfigure the teeth ratio and move that mountain."
*   **Off-Screen Parent Challenge:** Have the specialist identify three gear-driven systems in the household (e.g., a clock, a kitchen mixer, a bicycle) and explain which prioritizes speed over torque.

**Mission 2: Fulcrum Force**
*   **Step Cards:** Lever classes (1st, 2nd, and 3rd); Arm extension physics; Counterweight implementation; Pivot point reinforcement.
*   **Commander Dialogue:** "Give me a lever long enough and I’ll move the world. Your robot needs to lift double its own weight. Find the balance point or watch your chassis snap."
*   **Off-Screen Parent Challenge:** Challenge the specialist to use a simple lever (like a broom or a plank) to lift a heavy box, demonstrating how moving the fulcrum changes the effort required.

**Mission 3: Tension Protocol**
*   **Step Cards:** Pulley systems; Mechanical advantage in cable routing; Belt drive tensioning; Winch assembly.
*   **Commander Dialogue:** "Cables don’t lie. If there’s slack in the line, there’s a failure in the system. Secure the block and tackle; we’re hoisting cargo to the upper deck."
*   **Off-Screen Parent Challenge:** Ask the specialist to sketch a pulley system that would allow a single person to lift a piano, emphasizing the number of rope loops needed.

**Mission 4: Structural Integrity**
*   **Step Cards:** Center of gravity analysis; Wide-base stability; Stress-testing joints; Rigid vs. flexible bracing.
*   **Commander Dialogue:** "A heavy lift is useless if the robot tips over. Lower your center of mass and widen the footprint. If it wobbles during the lift, it’s a design failure."
*   **Off-Screen Parent Challenge:** Perform a 'Tipping Point' test. Have the specialist slowly tilt their robot while it holds a load and measure the exact angle at which it loses stability.

---

### MONTH 5: OPERATION AUTONOMOUS-COMMAND
**Objective:** Transition from simple scripts to complex, self-correcting logic systems.

**Mission 1: Logic Flow**
*   **Step Cards:** Finite State Machine (FSM) architecture; Switch-case logic; Defining 'Idle', 'Search', and 'Action' states.
*   **Commander Dialogue:** "Stop thinking in straight lines. Your robot needs to know what state it’s in at all times. If it's blocked, it shouldn't just push; it should pivot to a 'Recover' state."
*   **Off-Screen Parent Challenge:** Use a deck of cards to represent 'States.' Ask the specialist to 'program' you through a simple task (like making a sandwich) using only State Machine logic.

**Mission 2: Black Box**
*   **Step Cards:** Data logging to internal memory; Sensor telemetry analysis; Identifying 'Noise' in data; Variable tracking.
*   **Commander Dialogue:** "We can’t fix what we can’t measure. Log every sensor reading to the buffer. If the robot fails at 0300 hours, I want to see the data dump that explains why."
*   **Off-Screen Parent Challenge:** Review the robot's 'logs' or variable outputs with the specialist. Ask them to point out a specific moment where the sensor data triggered a decision.

**Mission 3: Refactoring**
*   **Step Cards:** Code optimization; Reducing latency; Memory management; Cleaning 'Spaghetti' code.
*   **Commander Dialogue:** "Your code is bloated. Every millisecond wasted in a loop is a millisecond the enemy has an advantage. Leaner code means faster reaction times. Trim the fat."
*   **Off-Screen Parent Challenge:** Have the specialist explain their code to you as if you were a 'Civilian.' If they can’t explain a function simply, it needs to be refactored.

**Mission 4: Fail-Safe**
*   **Step Cards:** Exception handling; Emergency stop protocols; Redundant sensor checks; 'Limp Mode' programming.
*   **Commander Dialogue:** "In the field, things break. If a sensor goes dark, does your robot spin in circles or does it execute a Fail-Safe? Program a backup plan for every critical system."
*   **Off-Screen Parent Challenge:** Unexpectedly 'disable' one sensor (cover it with tape or unplug it) and see if the specialist’s code can detect the error and stop the robot safely.

---

### MONTH 6: OPERATION OMNISCIENCE
**Objective:** Execute the final build, prove technical mastery, and achieve Grand Master status.

**Mission 1: Blueprint Iteration**
*   **Step Cards:** Design Thinking process; Rapid prototyping; User requirement gathering; Defining the 'Grand Master' project scope.
*   **Commander Dialogue:** "This is it. No more tutorials. Define your objective, sketch your solution, and prepare for the final build. The Council is watching."
*   **Off-Screen Parent Challenge:** Act as the 'Client.' Give the specialist a specific problem to solve (e.g., 'I need a robot to deliver mail across the house') and have them present their initial blueprint.

**Mission 2: Final Integration**
*   **Step Cards:** Merging Mechanical and Software systems; Wire management; Final chassis assembly; Aesthetic finishing.
*   **Commander Dialogue:** "Integration is where most missions fail. Ensure your gears don't grind your wires and your code accounts for the physical weight. Build it like your rank depends on it."
*   **Off-Screen Parent Challenge:** Provide a 'Designated Workspace' for the final 48-hour build phase. Ensure the specialist has a 'Scrap Yard' for discarded parts to track their iterative process.

**Mission 3: Performance Audit**
*   **Step Cards:** Stress testing; Endurance runs; Battery life optimization; Final calibration.
*   **Commander Dialogue:** "We don't ship prototypes; we ship solutions. Run the course ten times. If it fails once, it's not ready. Perfection is the only passing grade."
*   **Off-Screen Parent Challenge:** Set up a 'Gauntlet' course. Time the robot’s performance and record the results on a leaderboard to visualize its consistency.

**Mission 4: The Debrief**
*   **Step Cards:** Public demonstration; Technical documentation; Explaining 'Lessons Learned'; Graduation ceremony.
*   **Commander Dialogue:** "Stand tall, Specialist. You’ve built the machine; now defend your design. Explain the 'Why' behind the 'How.' Welcome to the rank of Grand Master."
*   **Off-Screen Parent Challenge:** Host the 'Grand Master Defense.' Invite family or friends to watch the robot perform. The specialist must answer three technical questions about their build to graduate.

- **Parent Dashboard Spec**: 
### **UI Design Specification: Buddy Parent Dashboard – Promotion Center**

---

#### **1. Visual Identity & Atmosphere**
*   **Background:** Calm Neutral (`#FDFDFF`) with a soft radial gradient in the top-right corner (`Linear-Gradient: 135deg, rgba(230, 210, 255, 0.4) 0%, rgba(255, 255, 255, 0) 60%`).
*   **Typography:**
    *   **Primary Headings:** Fredoka (Bold), Deep Slate (`#2D3436`).
    *   **Secondary/Body:** Nunito (Semi-Bold), Graphite (`#4A4A4A`).
    *   **"Professional Academy" Accents:** Roboto Mono (Medium) for technical stats and rank data to provide a "Tactical" feel.
*   **Color Palette:**
    *   **Primary:** Buddy Purple (`#9D50BB`).
    *   **Elite/Gold:** Academy Gold (`#D4AF37`) for premium features.
    *   **Success Green:** Tactical Green (`#27AE60`) for completed milestones.

---

#### **2. Layout Structure**
The Promotion Center is divided into a three-column "Command Grid":
1.  **Left Sidebar (15%):** Child Selector & Quick Rank Stats.
2.  **Central Hub (55%):** 6-Month Skill Tree (Course Roadmap).
3.  **Right Intel Panel (30%):** Tactical Preview & Elite Academy Upgrade.

---

#### **3. Component Specifications**

##### **A. Rank Status Header (Child Selector)**
*   **Visual:** Circular avatar of the child with a glowing border color-coded to rank.
*   **Rank Indicator Labels:**
    *   **Recruit (Lvl 1-5):** Silver Chevron icon.
    *   **Specialist (Lvl 6-12):** Double Bronze Wings icon.
    *   **Commander (Lvl 13+):** Gold Star & Wreath icon.
*   **Stat Bar:** A sleek, semi-transparent progress bar showing "XP to next Rank Promotion."

##### **B. Course Roadmap (The 6-Month Skill Tree)**
*   **Structure:** A vertical, winding path with 6 distinct "Nodes" representing months.
*   **Nodes (Interactive Bubbles):**
    *   *Month 1-2:* **Foundation Alpha** (Emotional Regulation & Focus).
    *   *Month 3-4:* **Social Recon** (Empathy & Communication).
    *   *Month 5-6:* **Leadership Core** (Critical Thinking & Mentorship).
*   **State Styling:**
    *   *Completed:* Solid Purple with a white checkmark.
    *   *In-Progress:* Pulsing light purple border.
    *   *Locked:* Dotted grey outline with a padlock icon.
*   **Professional Element:** Connective lines between nodes use a "circuit board" aesthetic (thin 1px lines with 45-degree angles).

##### **C. Tactical Preview (The "Child’s Eye" View)**
*   **Frame:** A mini-tablet mockup (16:9 aspect ratio) centered in the right panel.
*   **Content:** A high-fidelity screenshot of the child’s 'Rank Up' mode.
    *   **UI Overlay:** Dark mode "HUD" (Heads-Up Display).
    *   **Elements:** Neon-glow buttons, a 3D Buddy avatar wearing a "Tactical Academy" beret, and a "Mission Briefing" text scroll.
*   **Caption:** *“Live View: What [Child Name] sees during Rank-Up sessions.”*

##### **D. Elite Academy Upgrade (The Conversion Block)**
*   **Container:** Deep Navy card with a subtle metallic "Academy" texture.
*   **Heading:** "Enroll in Elite Academy" (Fredoka, Gold).
*   **Pricing:** "R149 / month" (Large Nunito Bold).
*   **Value Tags (Rounded Pills):**
    *   `Weekly PDF Reports` (Icon: Document)
    *   `Unlimited Missions` (Icon: Infinity)
    *   `Priority Skill Coaching` (Icon: Star)
    *   `Exclusive Avatar Gear` (Icon: Shield)
*   **Call to Action (CTA):** Large, rounded button.
    *   **Text:** "Unlock Full Potential"
    *   **Style:** Gradient (`#9D50BB` to `#6E48AA`) with a subtle hover-glow effect.

---

#### **4. Interaction Design**
*   **Hover State (Skill Tree):** Hovering over a Month Node reveals a tooltip with a 3-point syllabus (e.g., "• 12 Missions, • 4 Focus Challenges, • Final Promotion Test").
*   **Rank Progression Animation:** When a child ranks up, the parent dashboard triggers a "Confetti Cannon" of purple and gold, with a shareable "Promotion Certificate" download link.
*   **Tactical Toggle:** A small toggle on the Preview window allows the parent to switch between "Standard View" and "Rank Up Mode" to see the UI transition the child experiences.

---

#### **5. Assets Needed**
*   **Icons:** Tactical/Military-inspired but softened for a "Parent/Child" brand (Rounded corners, thick strokes).
*   **Illustration:** 3D rendered "Buddy" character in an Academy graduation cap or tactical vest.
*   **Texture:** Subtle "Carbon Fiber" pattern overlay for the Elite Academy card to differentiate it from the soft neutral background.


The session has been logged in Memory for future retrieval. Byron is now ready to begin the technical build phase for the **Pulse Training Academy** within Buddy.
