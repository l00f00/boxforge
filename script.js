(() => {
  'use strict';
  const form = document.querySelector('#params');
  const preview = document.querySelector('#preview');
  const status = document.querySelector('#status');
  const summary = document.querySelector('#summary');
  const parts = document.querySelector('#parts');
  let currentPlan = null;

  function values() {
    const data = new FormData(form);
    return {
      width: Number(data.get('width')), height: Number(data.get('height')), depth: Number(data.get('depth')),
      deckDepth: Number(data.get('deckDepth')), deckOverhang: Number(data.get('deckOverhang')),
      thickness: Number(data.get('thickness')), kerf: Number(data.get('kerf')), finger: Number(data.get('finger')),
      monitor: Number(data.get('monitor')), ratio: data.get('ratio'), button: Number(data.get('button'))
    };
  }

  function render() {
    const p = values();
    const plan = BoxForge.makePlan(p);
    if (plan.errors.length) {
      status.textContent = plan.errors.join(' ');
      preview.innerHTML = '';
      currentPlan = null;
      return;
    }
    currentPlan = plan;
    status.textContent = 'Piano aggiornato. Linea rossa: taglio · azzurro: incisione.';
    summary.textContent = `${p.width} × ${p.height} × ${p.depth} mm · MDF ${p.thickness} mm · monitor ${plan.monitor.width} × ${plan.monitor.height} mm`;
    preview.innerHTML = plan.svg;
    parts.innerHTML = plan.parts.map(part => `<tr><td>${part.name}</td><td>${part.width} × ${part.height} mm</td><td>${part.qty}</td></tr>`).join('');
  }

  form.addEventListener('submit', event => { event.preventDefault(); render(); });
  form.addEventListener('input', event => { if (event.target.type !== 'file') render(); });
  document.querySelector('#download').addEventListener('click', () => {
    if (!currentPlan) return;
    const blob = new Blob([currentPlan.svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `boxforge-arcade-${values().width}x${values().height}x${values().depth}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  document.querySelector('#fit').addEventListener('click', () => { preview.scrollTo({ top: 0, left: 0, behavior: 'smooth' }); });
  document.querySelector('#reference').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    const img = document.querySelector('.intro img');
    const old = img.dataset.objectUrl;
    if (old) URL.revokeObjectURL(old);
    img.src = URL.createObjectURL(file);
    img.dataset.objectUrl = img.src;
  });
  render();
})();
