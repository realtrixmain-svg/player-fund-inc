// Classic (non-module) script, so it runs independently of the type=module
// auth scripts. If those fail to load or execute for any reason (a blocked
// import, a slow connection, an extension interfering), the submit button
// stays disabled forever with no explanation - this gives the visitor
// something to act on instead of a dead button.
setTimeout(function () {
  var btn = document.getElementById('submit-btn');
  if (!btn || !btn.disabled) return;
  var status = document.getElementById('form-status');
  if (status) {
    status.textContent = 'This page did not finish loading correctly. Please refresh, or email investors@player-fund.com if this keeps happening.';
  }
}, 5000);
