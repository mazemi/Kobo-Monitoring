# KoBo Submission Monitor (Chrome Extension)

A simple Chrome extension to monitor submission activity across multiple **KoBo Toolbox** projects.  
Track daily submissions, view the last 7 days submissions.

---

<img src="https://github.com/mazemi/assets/blob/main/kobomonitoring.png" alt="KoBo Submission Monitor Interface" width="80%">

## Features

- **Multi-Project Monitoring**  
  Track multiple KoBo projects at the same time using tabs.

- **Last 7 Days View**  
  See submission activity for the last 7 days (based on the latest submission date).

- **Daily Breakdown**  
  View new submissions per day with a running total.
---

## Manual Installation (Developer Mode)

1. Download or clone this repository.
2. Open Chrome and go to:  
   `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked**.
5. Select the extension folder (the one containing `manifest.json`).

---

## Setup Instructions

### 1️⃣ Get Your KoBo API Token

1. Log in to your KoBo instance.
2. Open your **User Settings / Profile** page.
3. Generate or copy your **API token**.
4. Save the token (it is usually a long string).

---

### 2️⃣ Configure the Extension

1. Click the **KoBo Monitor** icon in the Chrome toolbar.
2. Open **Settings**.
3. Enter your **KoBo Base URL**  
   (Default: `https://kobo.impact-initiatives.org`)
4. Paste your **API token**.
5. Click **Save Settings**.

---

### 3️⃣ Add Projects to Monitor

1. Click the **+** tab.
2. Select one or more projects.
3. Click **Add Selected Projects**.
4. Each project will appear as a new tab.

---
