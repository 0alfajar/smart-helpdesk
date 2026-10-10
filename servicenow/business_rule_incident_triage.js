// Business Rule: "AI Triage on new Incident"
// Table: Incident [incident]   When: before   Insert: checked
// Filter condition: Category is empty
// Paste this into the Advanced > Script field.
(function executeRule(current, previous /*null when async*/) {

    var GROUP_BY_CATEGORY = {
        network: 'Network',
        hardware: 'Hardware',
        software: 'Software',
        database: 'Database',
        inquiry: 'Service Desk'
    };
    var MIN_CONFIDENCE = 0.5;

    var text = (current.getValue('short_description') || '') + ' ' + (current.getValue('description') || '');
    var triage = new AITriage().classify(text);

    if (!triage || triage.confidence < MIN_CONFIDENCE) {
        current.work_notes = 'AI triage: low confidence, left for manual triage.';
        return;
    }

    current.setValue('category', triage.category);

    if (current.assignment_group.nil()) {
        var groupName = GROUP_BY_CATEGORY[triage.category];
        var grp = new GlideRecord('sys_user_group');
        if (grp.get('name', groupName)) {
            current.setValue('assignment_group', grp.getUniqueValue());
        } else {
            gs.warn('AI triage: assignment group not found - ' + groupName);
        }
    }

    current.work_notes = 'AI triage -> category: ' + triage.category +
        ', confidence: ' + triage.confidence + ', source: ' + triage.source;

})(current, previous);
