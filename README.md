# Trinity University Hospital EHR — Clinical EMR Training Manual

Welcome to **Trinity University Hospital EHR**. This platform is a clinical workflow simulator designed specifically for Trinity University Nursing and Health Science faculty students. 

Its primary purpose is to help you learn **how clinical data flows across hospital departments** during real-world patient care:

$$\text{Front Desk (Reception)} \longrightarrow \text{Nurse Triage} \longrightarrow \text{Doctor} \longrightarrow \text{Medical Lab (MLS)} \longrightarrow \text{Doctor Review} \longrightarrow \text{Treatment Nurse} \longrightarrow \text{Discharge}$$

---

## 1. Getting Started in Class

1. **Open the Platform**: Navigate to the platform address. You will be greeted by the **Trinity University Hospital EHR Hero Portal** with the campus gate backdrop.
2. **Choose Your Access Method**:
   * **Students (Sign In / Register)**:
     - **New Students**: Click **Student Register**, type your Full Name (e.g., `Adaeze Nwafor`), select your assigned clinical station role (Triage Nurse, Doctor, Receptionist, MLS, Radiographer, or Treatment Nurse), and enter a password (or default `pass`).
     - **Returning Students**: Use **Student Sign In** with your name and password, or click one of the 1-click simulation test profiles.
     - Upon signing in, you are automatically routed directly to your assigned station with all medical entries tagged to your name.
   * **Teachers & Administrators (Admin Portal)**:
     - Click **Teachers / Admin** tab on the hero card.
     - Enter your teacher email and password (`Pass@word1`), or use the fast 1-click teacher buttons.
     - Authorized Admin/Teacher accounts:
       - `vchidiebere.vc@gmail.com` (Super Admin for setups)
       - `vincent.chidiebere@outlook.com`
       - `ritaeze53@gmail.com`
       - `salamahalawiye@gmail.com`
       - `faladefavour@gmail.com`
       - `nytaedu@gmail.com`
       - `anifowosefiyin@gmail.com`
       - `nanchelotty@gmail.com`
     - As a Teacher/Admin, you have Master Directory authority, can monitor all stations in real-time, and can use the **Reset Session** tool to wipe class records to zero for fresh student drills.
   * **Demo Preview Mode**:
     - Visitors or students can click **"Explore Demo Simulation (5 Sample Patients)"** directly on the hero page to practice without modifying live classroom data.
3. **Session Clearing & Fresh Drills**:
   * After any classroom scenario or case study concludes, teachers can click **Reset Session** in the top navigation bar to reset the patient count and medical records back to zero for the next class.

---

## 2. Character Role Guides

---

### Character 1: Front Desk / Reception Officer (REC)
**Your Cadre**: Health Records & Information Management  
**Your Primary Objective**: Register arriving patients, assign unique hospital numbers, and route them to their first station.

#### How to Play This Role:
1. **Enrolling a New Patient**:
   * Click the green **Enroll New Patient** button in the top bar.
   * Enter the patient's full name, age, gender, phone number, and residential address.
   * Document their Next of Kin / emergency contact.
   * Select their billing category (*Cash*, *NHIS Health Insurance*, or *Corporate HMO*).
2. **Flexible Initial Routing**:
   * **Standard Patient**: Select **Triage & Vitals (Standard)**. The patient will appear in the Nurse Triage queue.
   * **Returning Patient Scenario**: If a patient already took tests earlier, went home, and is returning 2 hours later with their results, select **Direct to Doctor (Follow-Up)**. This bypasses Triage and routes them straight to the physician's consult queue!
   * **Emergency Case**: If a patient arrives in severe pain or collapse, select **Emergency / Treatment** to send them straight to the Treatment Room.
3. Click **Enroll & Route Patient**. The patient will immediately receive an official Trinity University Hospital EHR record number (e.g., `TPH-2026-00106`).

---

### Character 2: Triage Staff Nurse (TRG)
**Your Cadre**: Nursing & Midwifery  
**Your Primary Objective**: Measure baseline physiological parameters, calculate biometric indexes (BMI), determine clinical acuity, and direct the patient forward.

#### How to Play This Role:
1. On the left side of your screen, you will see the **Waiting in Triage Queue**. Click on the patient you are calling into the triage booth.
2. **Record Physiological Parameters**:
   * **Blood Pressure (mmHg)**: Enter Systolic (e.g., `120`) and Diastolic (e.g., `80`). If the reading is $\ge 160/100$, the system will alert you to a hypertensive threshold.
   * **Pulse Rate (bpm)**: Enter the radial pulse (Normal: 60–100 bpm).
   * **Temperature (°C)**: Enter oral/axillary temperature. Readings $\ge 38.0^\circ\text{C}$ will automatically trigger a pyrexia/fever alert.
   * **SpO2 Oxygen Saturation (%)**: Readings $< 95\%$ trigger a hypoxia warning.
   * **Respiratory Rate (cpm)**: Breaths per minute (Normal: 12–20 cpm).
   * **Weight (kg) & Height (cm)**: The platform automatically computes and displays the patient's **Body Mass Index (BMI)**!
3. **Clinical Priority (Triage Acuity)**:
   * Select **Routine (Green)** for stable outpatients.
   * Select **Urgent (Yellow)** for high fevers or acute pain.
   * Select **Emergency (Red)** for impending collapse, chest pain, or severe vitals.
4. **Document Chief Complaint**:
   * Type what the patient reports in their own words (e.g., *"Patient complains of 3-day severe fever, rigors, and vomiting"*).
5. **Flexible Routing**:
   * Choose where to send the patient next. Normally, choose **Doctor Consultation**. If the patient is unstable, you can route directly to the **Treatment Room** or **Inpatient Ward**.
6. Click **Save Vitals & Route Patient**.

---

### Character 3: Attending Physician / Doctor (DOC)
**Your Cadre**: Clinical Medicine  
**Your Primary Objective**: Review nurse triage vitals, conduct clinical history & exams, establish provisional diagnoses, order laboratory/imaging tests, and prescribe therapy.

#### How to Play This Role:
1. Look at the **Waiting for Doctor** list on the left. Click a patient to open their consultation docket.
2. **Review Clinical Intake**:
   * The top preview card displays the vitals recorded by the Triage Nurse (BP, Temp, Pulse, SpO2, BMI).
   * If the patient already had lab tests run, their validated results will appear in the **Diagnostic Lab Status** box.
3. **Document Clinical Evaluation**:
   * **History of Present Illness (HPI)**: Describe the onset, duration, character, and aggravating factors of the illness.
   * **Physical Exam Findings**: Record general examination, chest auscultation, abdominal palpation, etc.
   * **Provisional Diagnosis**: Enter your working diagnosis (e.g., *Severe Malaria vs Enteric Fever*).
   * **Definitive Diagnosis**: If laboratory or X-ray results have confirmed the disease, enter the final diagnosis here.
   * **Management Plan**: Outline therapeutic steps.
4. **Order Investigations (MLS Labs & Radiology)**:
   * Click any test panel from the **Common Diagnostic Panels** (e.g., *Malaria Parasite MP*, *Full Blood Count FBC*, *Fasting Blood Sugar*, or *Chest X-Ray*).
   * The selected investigation will be queued for the laboratory scientist or radiographer.
5. **Prescribe Injections & Pharmacotherapy**:
   * Click any drug from the **Quick Pharmacotherapy Formulary** (e.g., *IV Artesunate 120mg*, *IM Diclofenac 75mg*, *IV Pantoprazole 40mg*, *Oral Coartem*).
   * Parenteral medications (IV / IM) will automatically create an administration order for the Treatment Room nurse!
6. **Route Patient Post-Consultation**:
   * If you ordered lab tests, select **Medical Lab (MLS)**.
   * If you ordered stat injections, select **Treatment Room**.
   * If the patient is admitted, select **Inpatient Ward**.
7. Click **Sign Clinical Encounter & Route Patient**.

---

### Character 4: Medical Laboratory Scientist (MLS)
**Your Cadre**: Medical Laboratory Science  
**Your Primary Objective**: Receive specimen test requests, perform diagnostic analysis, enter qualitative & quantitative values, and transmit validated results back to the physician.

#### How to Play This Role:
1. Select a patient from the **Laboratory Patients** queue.
2. Under **Select Investigation to Process**, click on the requested test (e.g., *Malaria Parasite (MP) by Giemsa Microscopy*).
3. **Enter Diagnostic Findings**:
   * **Qualitative Findings**: Describe microscopic or biochemical observations (e.g., *"POSITIVE (+++). Numerous trophozoites of Plasmodium falciparum detected in red blood cells"*).
   * **Quantitative Measurement**: Enter numerical values (e.g., `3+ (~25,000 parasites/uL)` or `PCV: 33%`).
   * **Reference Interval**: Note the normal biological range (e.g., `Negative` or `PCV: 36 - 48%`).
   * **Scientist Comments**: Enter remarks (e.g., *"Heavy parasitemia alert; urgent clinician review advised"*).
4. **Route Patient Upon Validation**:
   * Standard flow: Select **Back to Doctor (Standard)**.
   * When validated, the doctor will see a green notice on the patient's chart that their results are ready for clinical review!
5. Click **Validate Lab Result & Route Patient**.

---

### Character 5: Diagnostic Radiographer (RAD)
**Your Cadre**: Radiography & Diagnostic Imaging  
**Your Primary Objective**: Review imaging requests, capture anatomical scans, and document radiological impressions.

#### How to Play This Role:
1. Select a patient with an imaging request (e.g., *Chest X-Ray* or *Abdominal Ultrasound*).
2. Document **Report Findings** (lung fields, cardiac silhouette, abdominal organs).
3. Enter your **Radiological Impression** (e.g., *"Mild cardiomegaly with peribronchial thickening. No acute consolidation"*).
4. Route the patient **Back to Doctor** and click **Publish Imaging Report & Route Patient**.

---

### Character 6: Treatment Room Staff Nurse (TRT)
**Your Cadre**: Nursing & Midwifery  
**Your Primary Objective**: Verify physician medication orders, administer parenteral IV/IM injections, observe the patient for adverse events, and authorize outpatient discharge.

#### How to Play This Role:
1. Select a patient from the **Waiting for Treatment** queue.
2. Under **Prescribed Pharmacotherapy to Administer**, click on the pending medication (e.g., *IV Artesunate 120mg* or *IM Diclofenac 75mg*).
3. **Verify the 5 Rights of Medication Administration**:
   * Right Patient &bull; Right Drug &bull; Right Dose &bull; Right Route &bull; Right Time.
4. **Record Administration Details**:
   * **Anatomical Site**: Select where the injection was given (e.g., *Left Deltoid*, *Right Gluteal*, or *IV Cannula Forearm*).
   * **Nursing Observation Note**: Document post-administration care (e.g., *"Dose administered slowly. Patient observed for 30 minutes; vital signs stable, pain resolved, no hypersensitivity reaction"*).
5. **Route Patient Post-Administration**:
   * If the patient is feeling well and their outpatient episode is done, select **Discharge Home (Outpatient)**.
   * If the patient requires further doctor review or admission, select **Back to Doctor** or **Inpatient Ward**.
6. Click **Verify Injection & Route Patient**.

---

## 3. Advanced Simulation Scenarios

### Scenario A: The 2-Hour Return Flow (Non-Linear Movement)
In real hospitals, care is rarely a rigid one-way line:
* A patient might take a blood test at 08:00 AM, leave the hospital to rest at home, and return at 10:30 AM to see the doctor.
* **How to simulate this**:
  1. The **Receptionist** looks up the patient using the search bar on the Front Desk screen.
  2. The receptionist clicks **Route / Move**.
  3. Destination is set directly to **Doctor Consultation**, with the note: *"Patient returned from home with results ready; bypassed triage."*
  4. The Doctor immediately sees the patient appear in their consult queue with the lab results attached!

### Scenario B: Transferring a Patient from Any Station
At any time, on any screen:
* Click **Route / Move** or open the patient's **Chart** and click **Route / Transfer**.
* You can move a patient between **ANY two departments** in the hospital:
  $$\text{Triage} \longleftrightarrow \text{Doctor} \longleftrightarrow \text{Lab} \longleftrightarrow \text{Treatment} \longleftrightarrow \text{Ward} \longleftrightarrow \text{Discharge}$$
* Every movement automatically logs the timestamp, the authorizing student's name, and the clinical reason in the patient's permanent audit trail.

---

## 4. Resetting Simulation Data for a New Class Drill

When a new class session begins or if you want to start fresh:
1. In the upper-right corner of the top navigation bar, click **Reset Drill Data**.
2. Click **Yes, Restore Demo Cases**.
3. The platform will automatically restore the 5 standard training clinical cases:
   * **Adewale Okafor** (Severe malaria waiting for IV Artesunate injection in Treatment Room)
   * **Fatima Bello** (Returning antenatal patient in Doctor queue after taking blood tests)
   * **Chief Chukwudi Nnamdi** (Hypertensive urgency emergency referred for Chest X-Ray)
   * **Amina Yusuf** (New intake waiting for vital signs at Nurse Triage)
   * **Babatunde Adeleke** (Gastritis patient successfully treated and discharged)
