INSERT INTO report_templates (name, modality, body_part, is_global, technique_text, findings_prompt, impression_prompt) VALUES
(
  'Chest X-Ray PA',
  'CR', 'CHEST', TRUE,
  'Single PA view of the chest. No prior studies available for comparison.',
  'Trachea: Midline.
Lungs: [Air entry, consolidation, effusion, pneumothorax].
Heart: [Cardiothoracic ratio, cardiac borders].
Mediastinum: [Width, contour].
Bony thorax: [Ribs, clavicles, visible spine].
Diaphragm: [Domes, costophrenic angles].',
  '[Primary diagnosis]. [Secondary findings if any]. Clinical correlation advised.'
),
(
  'Abdomen X-Ray Supine',
  'CR', 'ABDOMEN', TRUE,
  'Supine AP view of the abdomen.',
  'Bowel gas pattern: [Normal/Distended].
Air-fluid levels: [Present/Absent, location].
Free air: [Present/Absent under diaphragm].
Calcifications: [Renal/Bladder/Vascular].
Soft tissue: [Psoas shadows, liver, spleen size].
Bony structures: [Lumbar spine, pelvis].',
  '[Primary finding]. [Recommendation for further imaging if indicated].'
),
(
  'Hand/Wrist X-Ray',
  'CR', 'HAND', TRUE,
  'PA and lateral views of the [right/left] hand/wrist.',
  'Bones: [Fracture/dislocation - location, type, displacement].
Joint spaces: [Preserved/Narrowed].
Soft tissues: [Swelling/Gas/Foreign body].
Bone density: [Normal/Osteopenic].',
  '[Fracture type + location] OR [No acute bony abnormality detected].'
);
