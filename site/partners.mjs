const $ = id => document.getElementById(id);
let draft = '';
$('prepare-enquiry').addEventListener('click', () => {
  const region = $('enquiry-region').value.trim(), homes = $('enquiry-homes').value;
  if (!region || (homes && (!Number.isInteger(Number(homes)) || Number(homes) < 1 || Number(homes) > 1000000))) {
    $('enquiry-status').textContent = 'Enter a general region and, if supplied, a positive whole-number home count.';
    $('enquiry-draft').hidden = true; draft = ''; return;
  }
  draft = `Auren pilot enquiry\n\nGeneral region: ${region}\nApproximate homes: ${homes || 'Not yet known'}\nPartner role: ${$('enquiry-role').value}\n\nTerrain, upstream and proposed contribution:\n${$('enquiry-context').value.trim() || 'To discuss'}\n\nI understand this is a feasibility/development enquiry, not a broadband order, reservation or hardware preorder. Scope, cost and obligations need a separate written agreement.\n`;
  $('enquiry-preview').value = draft;
  $('enquiry-mail').href = `mailto:sales@auren.so?subject=${encodeURIComponent('Auren pilot enquiry')}&body=${encodeURIComponent(draft)}`;
  $('enquiry-draft').hidden = false; $('enquiry-status').textContent = 'Draft prepared locally. Review it before opening your mail app. No email has been sent.';
});
for (const id of ['enquiry-region', 'enquiry-homes', 'enquiry-role', 'enquiry-context']) $(id).addEventListener('input', () => {
  draft = ''; $('enquiry-draft').hidden = true; $('enquiry-status').textContent = 'Inputs changed. Prepare a fresh draft before sending.';
});
$('download-enquiry').addEventListener('click', () => {
  if (!draft) return;
  const url = URL.createObjectURL(new Blob([draft], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'auren-pilot-enquiry.txt'; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
