-- Seed: General Project Instructions (visible to all roles)
insert into instructions (title, content, target_role, display_order, published)
values (
  'General Project Instructions',
  '1. Objective

Your role is to evaluate and fix Question-Answer (Q&A) pairs generated for 360° videos. You must ensure that every task is technically sound, factually accurate, and verifiable through the video provided.


2. Operational Workflow

Task Management
• Start tracking in Hubstaff

⚠️ Hubstaff Tracking Policy
• Active Work Only: Start the timer only when working.
• Handling Blockers: Pause timer if stuck.
• Task Completion: Stop timer when done.
• Idle Time: Do not track idle time.

⏱️ Time Expectation: ~15 minutes per task.

• Claim task in Feather
• Verify status is "In Progress"
• Set to "Complete" when finished


3. Task Taxonomy

3.1 Realism

Question: Does this video show a scene that could realistically happen?

A. When to mark as NO
Mark as unrealistic if impossible or unnatural events prevent answering the question.

B. When to mark as YES
Be permissive. Minor visual errors (e.g., distorted hands) are acceptable if the scene is understandable.

3.2 Technical Validation: 360° Video
• Check seam line continuity
• Ensure spatial consistency
• Mark NO if continuity is broken

3.3 Question Analysis

Break the question into required events.
• Check if each requirement exists in the video
• All must be present for validity

Validation Decision
• YES: All requirements present
• NO: Any missing element

Repairing the Question
• Priority 1: Edit existing question
• Priority 2: Create new question
• No yes/no questions
• Must be descriptive and contextual

3.4 Answer Validation
• Fix incorrect answers
• Update answers if question changes
• Ensure alignment with video

3.5 Temporal Counting Questions
• Track repeated events over time
• Record timestamps precisely
• Must include "(temporal counting question)" tag


4. Task Rework Guide

• Find rework tasks
• Review feedback
• Edit in Feather

1. Click "Make Edit"
2. Status → In Progress
3. Apply fixes
4. Set to Complete

⚠️ Ensure task is marked "Complete" before submitting.


5. Critical Workflow Rules
• Use Prism Platform
• Set tasks to Complete
• Track time in Hubstaff
• Aim for 15 minutes per task


6. Edge Cases
• Justifications must be at least 2 sentences
• No temporal questions unless required
• Do not answer "0" for missing events
• Minor artifacts are acceptable',
  'trainee',
  1,
  true
);
