import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize Gemini client if API key is provided
let geminiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
  }
}

// System Status API
app.get('/api/system/status', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'NexCure',
    tagline: 'Care, Connected.',
    aiServiceReady: !!geminiClient,
    supabaseConfigured: !!(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL),
    timestamp: new Date().toISOString(),
  });
});

// AI Assisted Continuity Summary Endpoint
// Rule 11: Do not implement AI diagnosis. Follow-up gap detection uses explicit rules;
// AI is used solely to assist with summaries, synthesis, and suggested coordination actions.
app.post('/api/ai/coordinator-summary', async (req, res) => {
  try {
    const { patient, gaps, overdueTasks, missedAppointments } = req.body;

    if (!patient) {
      return res.status(400).json({ error: 'Patient data is required.' });
    }

    if (!geminiClient) {
      // Deterministic rule-grounded fallback summary when AI key is absent
      return res.json({
        summary: `Patient ${patient.name} (${patient.age}y) is ${patient.daysPostDischarge || 3} days post-discharge following ${patient.primaryDiagnosis || 'clinical procedure'}. Currently exhibiting ${gaps?.length || 0} active care gap(s) and ${overdueTasks?.length || 0} overdue recovery task(s).`,
        priorityLevel: (gaps?.length > 1 || patient.riskTier === 'high') ? 'High Attention' : 'Moderate',
        suggestedNextSteps: [
          'Initiate direct phone outreach to verify patient well-being and home support.',
          'Review reasons for missed tasks and assist with appointment rescheduling.',
          'Confirm current medication adherence and supply availability.',
          'Escalate to attending healthcare professional if uncontactable after 2 attempts.'
        ],
        coordinatorTalkingPoints: [
          `"Hello ${patient.name}, this is your NexCure care coordinator following up on your discharge from ${patient.hospitalName || 'the hospital'}."`,
          `"I noticed you haven't been able to complete your ${overdueTasks?.[0]?.title || 'scheduled recovery log'}. Are you experiencing any pain or difficulty accessing equipment?"`,
          `"Let's make sure your upcoming follow-up appointment is set so Dr. ${patient.physicianName || 'Smith'} can assess your recovery."`
        ],
        modelUsed: 'rule-engine-fallback (No Gemini Key configured)'
      });
    }

    const prompt = `You are a clinical care coordinator assistant in NexCure, a healthcare continuity-of-care platform.
IMPORTANT CLINICAL BOUNDARY: You MUST NOT provide medical diagnoses, change prescriptions, or evaluate symptoms as diagnostic claims.
Your role is STRICTLY to assist the Care Coordinator with an operational continuity summary, gap synthesis, and suggested coordination steps.

Patient Profile:
- Name: ${patient.name}
- Age: ${patient.age}
- Gender: ${patient.gender || 'Not specified'}
- Discharge Date: ${patient.dischargeDate || 'Recent'} (${patient.daysPostDischarge || 3} days post-discharge)
- Primary Diagnosis / Procedure: ${patient.primaryDiagnosis || 'Post-operative recovery'}
- Attending Physician: Dr. ${patient.physicianName || 'Primary Care Team'}
- Hospital: ${patient.hospitalName || 'General Hospital'}
- Risk Tier: ${patient.riskTier || 'Moderate'}

Active Care Gaps Detected (via explainable clinical protocol rules):
${gaps && gaps.length > 0 ? gaps.map((g: any, i: number) => `${i + 1}. [Rule: ${g.ruleName || g.title}] - Description: ${g.description} (Severity: ${g.severity || 'Medium'})`).join('\n') : 'No severe gaps detected.'}

Overdue Recovery Tasks:
${overdueTasks && overdueTasks.length > 0 ? overdueTasks.map((t: any, i: number) => `${i + 1}. ${t.title} - Due: ${t.dueDate || 'Past due'}`).join('\n') : 'None'}

Missed / Pending Appointments:
${missedAppointments && missedAppointments.length > 0 ? missedAppointments.map((a: any, i: number) => `${i + 1}. ${a.title || a.type} with ${a.provider} - Status: ${a.status}`).join('\n') : 'None'}

Please respond in strictly valid JSON format with this exact structure:
{
  "summary": "2-3 concise sentences summarizing the recovery timeline, current friction points, and coordination status.",
  "priorityLevel": "Urgent" | "High Attention" | "Moderate" | "Routine",
  "suggestedNextSteps": [
    "Step 1: Specific coordinator intervention",
    "Step 2: Specific coordinator intervention",
    "Step 3: Specific coordinator intervention"
  ],
  "coordinatorTalkingPoints": [
    "Call script opening customized to the patient and reason for call",
    "Specific inquiry regarding the missing task or unbooked visit",
    "Reassurance and supportive wrap-up"
  ]
}`;

    const response = await geminiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      parsedData = {
        summary: responseText,
        priorityLevel: 'High Attention',
        suggestedNextSteps: ['Contact patient via telephone', 'Verify medication regimen', 'Reschedule follow-up'],
        coordinatorTalkingPoints: ['Check on patient recovery status']
      };
    }

    parsedData.modelUsed = 'gemini-3.8-flash';
    return res.json(parsedData);
  } catch (err: any) {
    console.error('Error in /api/ai/coordinator-summary:', err);
    // Return rule-grounded clinical continuity fallback
    const { patient, gaps, overdueTasks } = req.body || {};
    return res.json({
      summary: `Patient ${patient?.name || 'Assigned Patient'} (${patient?.age || '71'}y) is ${patient?.daysPostDischarge || 4} days post-discharge. Identified care gaps require proactive contact to prevent 30-day hospital readmission.`,
      priorityLevel: (gaps?.length > 1 || patient?.riskTier === 'high') ? 'High Attention' : 'Moderate',
      suggestedNextSteps: [
        'Execute direct phone outreach to verify clinical stability and symptoms.',
        'Review reasons for missed tasks and assist with appointment rescheduling.',
        'Confirm current medication adherence and caregiver support.',
      ],
      coordinatorTalkingPoints: [
        `"Hello ${patient?.name || 'patient'}, this is your NexCure care coordinator following up on your discharge from Metro General."`,
        `"I noticed your recent follow-up log is pending. Are you experiencing any pain, swelling, or trouble using your scale?"`,
        `"Let's confirm your upcoming follow-up visit so Dr. Wilson can evaluate your recovery."`
      ],
      modelUsed: 'rule-engine-continuity-protocol (Safe Fallback)'
    });
  }
});

// Setup Vite middlewares in development or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NexCure server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
