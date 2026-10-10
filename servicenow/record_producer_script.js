// Record Producer: "Report an Issue"   Table: Incident
// Variables to create on the record producer:
//   short_description  (Single Line Text, mandatory)
//   description        (Multi Line Text, mandatory)
//   urgency_level      (Select Box: 1 = High, 2 = Medium, 3 = Low)
// Paste into the record producer's Script field.
current.short_description = producer.short_description;
current.description = producer.description;
current.caller_id = gs.getUserID();
current.contact_type = 'self-service';
current.urgency = producer.urgency_level;
current.impact = producer.urgency_level;
