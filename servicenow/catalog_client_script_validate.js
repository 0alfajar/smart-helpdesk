// Catalog Client Script: "Validate description"
// Type: onSubmit    Applies to: Catalog Item -> the "Report an Issue" record producer
// UI Type: All
function onSubmit() {
    var desc = g_form.getValue('description');
    if (!desc || desc.trim().length < 20) {
        g_form.addErrorMessage('Please describe the issue in at least 20 characters so it can be triaged accurately.');
        return false;
    }
}
